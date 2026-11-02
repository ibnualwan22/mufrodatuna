"""Internal, ephemeral phoneme inference for Qiroah i'rab practice.

The model hears a single highlighted word. It never receives the answer key.
This is a pilot classifier; thresholds require validation on target learners.
"""

import asyncio
import base64
import binascii
from difflib import SequenceMatcher
import math
import os
from pathlib import Path
import re
import unicodedata

import numpy as np
import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from silero_vad import get_speech_timestamps, load_silero_vad
from huggingface_hub import hf_hub_download
from transformers import Wav2Vec2CTCTokenizer, Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC, Wav2Vec2Processor


MODEL_ID = "MostafaMaroof/wav2vec2-arabic-phoneme-asr"
MODEL_REVISION = "0a32c641aaaeec6957e41a794add52e024e46b50"
MODEL_PATH = os.getenv("QIROAH_MODEL_PATH", MODEL_ID)
TOKEN = os.getenv("READING_SPEECH_TOKEN", "")
ARABIC_CONSONANTS = {
    "ء": "", "آ": "", "أ": "", "إ": "", "ا": "", "ٱ": "", "ى": "",
    "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "x",
    "د": "d", "ذ": "d", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
    "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "", "غ": "g",
    "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
    "ه": "h", "و": "w", "ي": "y", "ة": "h",
}
VOWELS = {"a", "i", "u"}


def expected_consonants(word: str) -> str:
    return "".join(ARABIC_CONSONANTS.get(ch, "") for ch in word)


def heard_consonants(tokens: list[str]) -> str:
    return "".join(
        token.lower()[0] for token in tokens
        if token.lower() not in {"a", "i", "u", "aa", "ii", "uu", "e", "ee", "sil", "|"}
        and token not in {"$", "$$", "*", "**", "<", "<<", "^", "^^"}
        and not token.startswith("[")
    )


def score_word(word: str, tokens: list[str]) -> float:
    expected = expected_consonants(word)
    heard = heard_consonants(tokens)
    if not expected or not heard:
        return 0.0
    # A final-vowel verdict is accepted only when there is independent evidence
    # that the highlighted word was spoken. This score is intentionally strict.
    return SequenceMatcher(None, expected, heard).ratio()


def final_phone(tokens: list[str]) -> tuple[str | None, str | None]:
    useful = [token for token in tokens if token not in {"sil", "|", "[PAD]", "$"}]
    if not useful:
        return None, None
    tail = useful[-1].lower()
    if tail in VOWELS:
        return tail, useful[-1]
    if tail in {"aa", "ii", "uu", "e", "ee", "ah"} or tail.startswith(("[", "<s", "</")):
        return None, useful[-1]  # Long vowels and variants are outside pilot scope.
    return "none", useful[-1]


def short_vowel_score(posterior: dict[str, float], token: str) -> float:
    # Both plain and emphatic vowel classes occur in this checkpoint. Keeping
    # all six in the denominator prevents inflated scores for uppercase tokens.
    absolute = posterior[token]
    mass = sum(posterior[v] for v in ("a", "i", "u", "A", "I", "U"))
    return math.sqrt(absolute) * absolute / max(mass, 1e-6)


class AnalyzeRequest(BaseModel):
    audio: str = Field(max_length=360000)
    sample_rate: int
    word: str = Field(min_length=1, max_length=100)


app = FastAPI(title="Qiroah internal speech pilot", docs_url=None, redoc_url=None)
processor = None
model = None
vad = None
load_error = None
gate = asyncio.Semaphore(1)


@app.on_event("startup")
async def startup():
    global processor, model, vad, load_error
    try:
        torch.set_num_threads(max(1, int(os.getenv("QIROAH_TORCH_THREADS", "2"))))
        source = MODEL_PATH
        revision = MODEL_REVISION if source == MODEL_ID else None
        vocab = str(Path(source) / "vocab.json") if Path(source).is_dir() else await asyncio.to_thread(
            hf_hub_download, repo_id=MODEL_ID, filename="vocab.json", revision=MODEL_REVISION)
        # This checkpoint has a legacy tokenizer_config format. Build its
        # tokenizer from the pinned vocabulary rather than loading that config.
        tokenizer = Wav2Vec2CTCTokenizer(vocab, unk_token="[UNK]", pad_token="[PAD]", word_delimiter_token="|")
        extractor = await asyncio.to_thread(Wav2Vec2FeatureExtractor.from_pretrained, source, revision=revision)
        processor = Wav2Vec2Processor(feature_extractor=extractor, tokenizer=tokenizer)
        model = await asyncio.to_thread(Wav2Vec2ForCTC.from_pretrained, source, revision=revision)
        model.eval()
        vad = await asyncio.to_thread(load_silero_vad)
    except Exception as error:
        load_error = str(error)
        print(f"Qiroah model startup failed: {load_error}", flush=True)


@app.get("/health")
def health():
    if model is None or vad is None or processor is None:
        raise HTTPException(503, "Model suara belum siap")
    return {"ready": True, "model": MODEL_ID, "revision": MODEL_REVISION}


def infer(audio: np.ndarray, word: str) -> dict:
    stamps = get_speech_timestamps(torch.from_numpy(audio), vad, sampling_rate=16000,
                                  min_speech_duration_ms=120, min_silence_duration_ms=150)
    if not stamps:
        return {"word_match": False, "confidence": 0.0, "ending": None}
    start = max(0, stamps[0]["start"] - 1600)
    end = min(len(audio), stamps[-1]["end"] + 1600)
    voice = audio[start:end]
    inputs = processor(voice, sampling_rate=16000, return_tensors="pt")
    with torch.inference_mode():
        logits = model(inputs.input_values).logits[0]
    probabilities = torch.softmax(logits, dim=-1)
    ids = torch.argmax(logits, dim=-1).tolist()
    blank = processor.tokenizer.pad_token_id
    collapsed = []
    for position, token_id in enumerate(ids):
        if token_id != blank and (position == 0 or ids[position - 1] != token_id):
            collapsed.append((token_id, position))
    tokens = processor.tokenizer.convert_ids_to_tokens([token_id for token_id, _ in collapsed])
    similarity = score_word(word, tokens)
    ending, last_token = final_phone(tokens)
    if ending is None or similarity < 0.7:
        return {"word_match": False, "confidence": 0.0, "ending": None}
    last_index = next((i for i in range(len(tokens) - 1, -1, -1) if tokens[i] == last_token), None)
    phone_confidence = float(probabilities[collapsed[last_index][1], collapsed[last_index][0]]) if last_index is not None else 0.0
    # CTC often puts substantial probability on blank at the exact short-vowel
    # frame. Compare the three *heard* short-vowel candidates as well as their
    # absolute evidence; do not compare against the admin's expected answer.
    if ending in VOWELS and last_index is not None:
        frame=collapsed[last_index][1]
        posterior={v:float(probabilities[frame, processor.tokenizer.convert_tokens_to_ids(v)])
                   for v in ("a", "i", "u", "A", "I", "U")}
        confidence=min(similarity, short_vowel_score(posterior, last_token))
    else:
        confidence=min(similarity, phone_confidence)
    # Still a heuristic score, not a calibrated probability of correctness.
    return {"word_match": True, "confidence": confidence, "ending": ending}


@app.post("/analyze")
async def analyze(request: AnalyzeRequest, x_reading_token: str | None = Header(default=None)):
    if TOKEN and x_reading_token != TOKEN:
        raise HTTPException(401, "Unauthorized")
    if model is None or vad is None or processor is None:
        raise HTTPException(503, "Model suara belum siap")
    if request.sample_rate != 16000 or not re.fullmatch(r"[\u0600-\u06ff\u0750-\u077f\s]+", request.word):
        raise HTTPException(422, "Unsupported audio or word")
    try:
        raw = base64.b64decode(request.audio, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "Invalid audio") from None
    if len(raw) < 6400 or len(raw) > 256000 or len(raw) % 2:
        raise HTTPException(422, "Audio duration out of range")
    audio = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if not np.isfinite(audio).all():
        raise HTTPException(422, "Invalid samples")
    if gate.locked():
        raise HTTPException(503, "Speech worker busy")
    async with gate:
        return await asyncio.to_thread(infer, audio, unicodedata.normalize("NFC", request.word))
