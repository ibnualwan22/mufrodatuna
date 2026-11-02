#!/usr/bin/env bash
set -euo pipefail
speech_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../services/qiroah-speech" && pwd)"
python3 -m venv "$speech_dir/.venv"
"$speech_dir/.venv/bin/python" -m pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
"$speech_dir/.venv/bin/python" -m pip install -r "$speech_dir/requirements.txt"
"$speech_dir/.venv/bin/python" - "$speech_dir/model" <<'PY'
import sys
from huggingface_hub import snapshot_download
snapshot_download('MostafaMaroof/wav2vec2-arabic-phoneme-asr',
                  revision='0a32c641aaaeec6957e41a794add52e024e46b50',
                  local_dir=sys.argv[1],
                  allow_patterns=['*.json', '*.safetensors', 'README.md'])
print('Model siap. Jalankan npm run speech pada terminal tersendiri.')
PY
