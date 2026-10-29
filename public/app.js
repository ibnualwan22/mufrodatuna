/* Mufrodatuna — Client App
   White & Gold Editorial Design, Arabic TTS + WebAudio SFX, & 6 Mini-Game Modes */
let socket = null;
const BASE_PATH = (() => {
  const p = window.location.pathname;
  return (p === '/game' || p.indexOf('/game/') === 0) ? '/game' : '';
})();

const SVG_SPEAKER_ON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
const SVG_SPEAKER_OFF = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;

/* ================= 1. SOUND AS UX (SFX & ARABIC TTS) ================= */
let soundMuted = localStorage.getItem('mufrodat_mute') === '1';
let audioCtx = null;
let curAudioEl = null;
let currentArabicWord = '';

function getAudioCtx() {
  if (soundMuted) return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

const SoundFX = {
  tone(freq, dur, type = 'sine', vol = 0.14, delay = 0) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },
  tap() {
    this.tone(320, 0.05, 'triangle', 0.09, 0);
  },
  correct(streak = 1) {
    const boost = Math.min(streak - 1, 6) * 28;
    this.tone(587.33 + boost, 0.13, 'triangle', 0.15, 0);
    this.tone(880.00 + boost * 1.2, 0.25, 'triangle', 0.17, 0.09);
    if (streak >= 3) {
      this.tone(1174.66 + boost, 0.28, 'sine', 0.13, 0.18);
    }
  },
  wrong() {
    this.tone(220, 0.14, 'triangle', 0.12, 0);
    this.tone(185, 0.22, 'triangle', 0.12, 0.11);
  },
  countdown(n) {
    this.tone(n === 1 ? 660 : 440, 0.12, 'sine', 0.11, 0);
  },
  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.15, i * 0.11));
  }
};

const ArabicTTS = {
  speak(text, slow = false) {
    if (soundMuted || !text) return;
    const btn = document.getElementById('btn-speak-normal');
    if (btn) btn.classList.add('speaking');
    const done = () => { if (btn) btn.classList.remove('speaking'); };

    const synth = window.speechSynthesis;
    let arVoice = null;
    if (synth) {
      const voices = synth.getVoices() || [];
      arVoice = voices.find(v => /^ar(-|_|$)/i.test(v.lang));
    }

    if (synth && arVoice) {
      try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = arVoice;
        u.lang = arVoice.lang || 'ar-SA';
        u.rate = slow ? 0.55 : 0.92;
        u.onend = done;
        u.onerror = done;
        synth.speak(u);
        setTimeout(done, 2200);
        return;
      } catch (_) {}
    }

    try {
      if (curAudioEl) { curAudioEl.pause(); curAudioEl = null; }
      const url = `${BASE_PATH}/api/tts?q=${encodeURIComponent(text)}&slow=${slow ? '1' : '0'}`;
      const audio = new Audio(url);
      audio.playbackRate = slow ? 0.72 : 1.0;
      curAudioEl = audio;
      audio.onended = done;
      audio.onerror = () => {
        if (synth) {
          try {
            synth.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'ar-SA';
            u.rate = slow ? 0.55 : 0.92;
            u.onend = done;
            synth.speak(u);
          } catch (_) { done(); }
        } else done();
      };
      audio.play().catch(() => audio.onerror());
      setTimeout(done, 2500);
    } catch (_) { done(); }
  }
};

function updateSoundToggleUI() {
  const btn = document.getElementById('btn-sound-toggle');
  const icon = document.getElementById('sound-icon');
  const lbl = document.getElementById('sound-label');
  if (!btn) return;
  btn.classList.toggle('muted', soundMuted);
  icon.innerHTML = soundMuted ? SVG_SPEAKER_OFF : SVG_SPEAKER_ON;
  lbl.textContent = soundMuted ? 'Suara Nonaktif' : 'Suara Aktif';
}

function toggleSound() {
  soundMuted = !soundMuted;
  localStorage.setItem('mufrodat_mute', soundMuted ? '1' : '0');
  updateSoundToggleUI();
  if (!soundMuted) {
    SoundFX.tap();
    ArabicTTS.speak('مَرْحَبًا');
  }
}

function testMascotHello() {
  SoundFX.correct(2);
  ArabicTTS.speak('أَهْلًا وَسَهْلًا');
}

function replayCurrentAudio(slow = false) {
  SoundFX.tap();
  if (currentArabicWord) ArabicTTS.speak(currentArabicWord, slow);
}

/* ================= 2. NAVIGASI & STATE ================= */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function goHome() { SoundFX.tap(); showView('view-home'); }
function showJoin() { SoundFX.tap(); showView('view-join'); }

let myCode = null, myNis = null, myNama = null, isHost = false, isSoloMode = false;
let totalSeconds = 60, curSession = 0, soloHearts = 5;
let curQuestion = null;

let jumblePicked = [];
let pairsSelectedAr = null;
let pairsSelectedId = null;
let pairsMatchedCount = 0;
let pairsTotalCount = 0;

/* ================= 3. INSTRUKTUR / AL-MU'ALLIM BAR ================= */
const PRAISES_AR = [
  'مُمْتَاز — Jawaban tepat dan akurat.',
  'أَحْسَنْتَ — Penguasaan kosakata yang baik.',
  'رَائِع — Pertahankan ketepatan ini.',
  'بَارَكَ اللّٰهُ فِيكَ — Respons sangat cepat.',
];

function setMascot(state, text) {
  const av = document.getElementById('mascot-avatar');
  const sp = document.getElementById('mascot-speech');
  if (!av || !sp) return;
  av.classList.remove('cheer', 'oops');
  sp.classList.remove('ok', 'no');
  void av.offsetWidth;
  av.textContent = 'م';
  if (state === 'ok' || state === 'fire') {
    av.classList.add('cheer');
    sp.classList.add('ok');
  } else if (state === 'no') {
    av.classList.add('oops');
    sp.classList.add('no');
  }
  sp.textContent = text;
}

/* ================= 4. LATIHAN MANDIRI (SOLO) ================= */
let soloBabs = new Set();
async function showSoloSetup() {
  SoundFX.tap();
  showView('view-solo-setup');
  const { programs } = await emitAck('host:getPrograms', null);
  const sel = document.getElementById('solo-program');
  sel.innerHTML = programs.map(p => `<option value="${p.id}">${esc(p.nama)} (${p.jml_kata} kata)</option>`).join('');
  if (programs.length) await loadSoloBabs();
}

async function loadSoloBabs() {
  const progId = Number(document.getElementById('solo-program').value);
  soloBabs = new Set();
  const { babs } = await emitAck('host:getBabs', { programId: progId });
  document.getElementById('solo-babs').innerHTML = babs.map((b, i) => {
    if (i === 0) soloBabs.add(b.id);
    return `<label class="bab-check">
      <input type="checkbox" value="${b.id}" ${i === 0 ? 'checked' : ''} onchange="toggleSoloBab(${b.id}, this.checked)">
      <span>${esc(b.judul)}</span>
      <span class="muted" style="margin-left:auto">${b.jml_kata} kata</span>
    </label>`;
  }).join('');
}

function toggleSoloBab(id, on) {
  SoundFX.tap();
  on ? soloBabs.add(id) : soloBabs.delete(id);
}

async function startSoloGame() {
  SoundFX.tap();
  if (soloBabs.size === 0) { alert('Pilih minimal 1 bab materi.'); return; }
  const programId = Number(document.getElementById('solo-program').value);
  const type = document.getElementById('solo-type').value;
  const r = await emitAck('solo:start', {
    programId, babIds: [...soloBabs], nis: '1001', type, seconds: 90
  });
  if (r.error) { alert(r.error); return; }
  isHost = false;
  isSoloMode = true;
  soloHearts = 5;
  myCode = r.code; myNis = r.nis; myNama = r.nama;
  updateHeartsUI();
}

function updateHeartsUI(lostOne = false) {
  const el = document.getElementById('arena-hearts');
  if (!el) return;
  if (!isSoloMode) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const full = Math.max(0, soloHearts);
  const dots = [];
  for (let i = 0; i < 5; i++) {
    dots.push(`<span class="heart-dot ${i < full ? '' : 'empty'}"></span>`);
  }
  el.innerHTML = dots.join('');
  if (lostOne) {
    el.classList.remove('lost');
    void el.offsetWidth;
    el.classList.add('lost');
  }
}

/* ================= 5. WIZARD HOST ================= */
let wzProgram = null, wzBabs = new Set(), wzSessions = null;
const emitAck = (ev, data) => new Promise(res => socket.emit(ev, data, res));

function showHostSetup() {
  SoundFX.tap();
  isSoloMode = false;
  wzProgram = null; wzBabs = new Set();
  wzSessions = [{ dir: 'ar2id', type: 'mix', seconds: 60 }];
  showView('view-host-setup'); wzStep(1); loadWzPrograms();
}
function wzStep(n) {
  [1, 2, 3].forEach(i => document.getElementById('wz-' + i).style.display = i === n ? 'block' : 'none');
}
async function loadWzPrograms() {
  const { programs } = await emitAck('host:getPrograms', null);
  document.getElementById('wz-programs').innerHTML = programs.map(p => `
    <div class="bab-check" onclick="wzPickProgram(${p.id}, '${esc(p.nama)}')">
      <span><b>${esc(p.nama)}</b></span>
      <span class="muted" style="margin-left:auto">${p.jml_bab} bab · ${p.jml_kata} kata</span>
    </div>`).join('') || '<p class="muted">Belum ada program. Tambahkan melalui halaman admin.</p>';
}
async function wzPickProgram(id, nama) {
  SoundFX.tap();
  wzProgram = id; wzBabs = new Set();
  document.getElementById('wz-prog-name').textContent = nama;
  const { babs } = await emitAck('host:getBabs', { programId: id });
  document.getElementById('wz-babs').innerHTML = babs.map(b => `
    <label class="bab-check"><input type="checkbox" value="${b.id}" onchange="wzToggleBab(${b.id}, this.checked)">
      <span>${esc(b.judul)}</span><span class="muted" style="margin-left:auto">${b.jml_kata} kata</span>
    </label>`).join('') || '<p class="muted">Belum ada bab di program ini.</p>';
  wzStep(2);
}
function wzToggleBab(id, on) { SoundFX.tap(); on ? wzBabs.add(id) : wzBabs.delete(id); }

const GAME_TYPES = [
  ['mix', 'Terpadu (Rotasi Semua Metode)'],
  ['mc', 'Ikhtiyar (Pilihan Ganda + Audio)'],
  ['listen', 'Istima\' (Identifikasi Suara Arab)'],
  ['jumble', 'Tarkib Huruf (Susun Huruf Arab)'],
  ['pairs', 'Muthabaqah (Pasangkan Kosakata)'],
  ['truefalse', 'Shohih / Khotho\' (Validasi Cepat)'],
  ['essay', 'Kitabah (Ketik Jawaban)'],
];

function sessCfgHTML(s, i) {
  const dirName = d => d === 'ar2id' ? 'Arab ke Indonesia' : 'Indonesia ke Arab';
  return `<div class="sess-cfg"><h4>Sesi 0${i + 1}</h4>
    <label style="margin:4px 0">Metode Permainan</label>
    <select id="sess-type-${i}">
      ${GAME_TYPES.map(([val, label]) => `<option value="${val}" ${s.type === val ? 'selected' : ''}>${label}</option>`).join('')}
    </select>
    <label style="margin:4px 0">Arah Terjemahan Utama</label>
    <select id="sess-dir-${i}">
      <option value="ar2id" ${s.dir === 'ar2id' ? 'selected' : ''}>${dirName('ar2id')}</option>
      <option value="id2ar" ${s.dir === 'id2ar' ? 'selected' : ''}>${dirName('id2ar')}</option>
    </select>
    <label style="margin:4px 0">Durasi Waktu</label>
    <select id="sess-sec-${i}">
      ${[30, 45, 60, 90, 120].map(v => `<option value="${v}" ${s.seconds === v ? 'selected' : ''}>${v} detik</option>`).join('')}
    </select>
    ${wzSessions.length > 1 ? `<button class="btn btn-ghost" style="font-size:13px" onclick="delSessionCfg(${i})">Hapus Sesi Ini</button>` : ''}
  </div>`;
}
function renderSessCfg() {
  document.getElementById('wz-sessions').innerHTML = wzSessions.map(sessCfgHTML).join('');
  document.getElementById('btn-add-session').style.display = wzSessions.length >= 2 ? 'none' : 'block';
}
function addSessionCfg() {
  if (wzSessions.length >= 2) return;
  const d1 = document.getElementById('sess-dir-0').value;
  wzSessions.push({ dir: d1 === 'ar2id' ? 'id2ar' : 'ar2id', type: 'jumble', seconds: 60 });
  renderSessCfg();
}
function delSessionCfg(i) { wzSessions.splice(i, 1); renderSessCfg(); }
function readSessCfg() {
  wzSessions = wzSessions.map((_, i) => ({
    dir: document.getElementById('sess-dir-' + i).value,
    type: document.getElementById('sess-type-' + i).value,
    seconds: parseInt(document.getElementById('sess-sec-' + i).value),
  }));
}
const _wzStep = wzStep;
wzStep = function (n) {
  if (n === 3) {
    if (wzBabs.size === 0) { alert('Pilih minimal 1 bab.'); return; }
    renderSessCfg();
  }
  [1, 2, 3].forEach(i => {
    const pill = document.getElementById('pill-' + i);
    if (!pill) return;
    pill.classList.toggle('on', i === n);
    pill.classList.toggle('done', i < n);
  });
  _wzStep(n);
};

async function finishWizard() {
  SoundFX.tap();
  readSessCfg();
  const { code } = await emitAck('host:create', null);
  const r = await emitAck('host:configure', {
    programId: wzProgram, babIds: [...wzBabs], sessions: wzSessions,
  });
  if (r.error) { alert(r.error); return; }
  isHost = true; myCode = code;
  document.getElementById('host-code').textContent = code;
  showView('view-host-lobby');
}

function addBots() { SoundFX.tap(); socket.emit('host:addBots'); }
function startGame() {
  SoundFX.tap();
  socket.emit('host:start', (r) => { if (r && r.error) alert(r.error); });
}

/* ================= 6. PEMAIN JOIN ================= */
function joinRoom() {
  SoundFX.tap();
  isSoloMode = false;
  const code = document.getElementById('join-code').value.toUpperCase().trim();
  const nis = document.getElementById('join-nis').value.trim();
  document.getElementById('join-error').textContent = '';
  socket.emit('player:join', { code, nis }, (res) => {
    if (res.error) { document.getElementById('join-error').textContent = res.error; return; }
    myCode = res.code; myNis = nis; myNama = res.nama;
    document.getElementById('waiting-nama').textContent = `Selamat Datang, ${res.nama}`;
    showView('view-waiting');
  });
}

/* ================= 7. ARENA & 6 MINI-GAMES ================= */
const MODE_BADGES = {
  mc: 'IKHTIYAR · PILIHAN GANDA',
  listen: 'ISTIMA\' · IDENTIFIKASI SUARA',
  jumble: 'TARKIB · SUSUN HURUF ARAB',
  truefalse: 'SHOHIH / KHOTHO\'',
  pairs: 'MUTHABAQAH · PASANGKAN KATA',
  essay: 'KITABAH · KETIK JAWABAN',
};

function renderQuestion(q) {
  if (!q) return;
  curQuestion = q;
  currentArabicWord = q.arabicText || (q.dir === 'ar2id' ? q.prompt : '');

  const qBox = document.getElementById('question-box');
  qBox.classList.remove('pop-in', 'listen-mode');
  void qBox.offsetWidth;
  qBox.classList.add('pop-in');

  const pill = document.getElementById('q-mode-pill');
  if (pill) pill.textContent = MODE_BADGES[q.type] || 'EVALUASI';

  const pr = document.getElementById('q-prompt');
  const lbl = document.getElementById('q-label');
  const audioRow = document.getElementById('q-audio-row');
  const speakText = document.getElementById('btn-speak-text');
  const tfPair = document.getElementById('q-tf-pair');
  const fb = document.getElementById('feedback');

  fb.textContent = '';
  fb.className = 'feedback';
  tfPair.classList.add('hidden');

  const essayRow = document.getElementById('essay-row');
  const mcBox = document.getElementById('mc-options');
  const tfBox = document.getElementById('tf-options');
  const jumbleBox = document.getElementById('jumble-box');
  const pairsBox = document.getElementById('pairs-box');
  [essayRow, mcBox, tfBox, jumbleBox, pairsBox].forEach(el => { if (el) el.style.display = 'none'; });

  const isArTarget = q.dir === 'id2ar';

  if (q.type === 'listen') {
    qBox.classList.add('listen-mode');
    setMascot('idle', 'Simak pelafalan bahasa Arab berikut, kemudian pilih arti yang sesuai.');
    if (isArTarget) {
      lbl.textContent = `Simak audio & pilih penulisan Arab untuk "${q.prompt}":`;
      pr.textContent = '';
      pr.setAttribute('dir', 'ltr');
    } else {
      lbl.textContent = 'Simak pelafalan berikut dan pilih artinya:';
      pr.textContent = '';
    }
    audioRow.style.display = 'flex';
    speakText.textContent = 'Putar Pelafalan';
    mcBox.style.display = 'grid';
    mcBox.innerHTML = (q.options || []).map(o =>
      `<button class="mc-opt" dir="${isArTarget ? 'rtl' : 'ltr'}" onclick="answerMC(this)">${esc(o)}</button>`
    ).join('');
    setTimeout(() => ArabicTTS.speak(currentArabicWord, false), 120);

  } else if (q.type === 'jumble') {
    setMascot('idle', 'Susun kepingan huruf Arab dari kanan ke kiri hingga membentuk kata yang tepat.');
    lbl.textContent = 'Susun huruf bahasa Arab untuk arti:';
    pr.textContent = q.prompt;
    pr.setAttribute('dir', 'ltr');
    audioRow.style.display = 'flex';
    speakText.textContent = 'Simak Pelafalan';
    jumbleBox.style.display = 'block';
    initJumbleUI(q);

  } else if (q.type === 'truefalse') {
    setMascot('idle', 'Tentukan apakah pasangan kosakata dan arti di bawah ini benar atau salah.');
    lbl.textContent = 'Validasi pasangan kosakata berikut:';
    pr.textContent = q.prompt;
    pr.setAttribute('dir', 'rtl');
    audioRow.style.display = 'flex';
    speakText.textContent = 'Simak Pelafalan';
    tfPair.textContent = `Arti: "${q.pairedMeaning}"`;
    tfPair.classList.remove('hidden');
    tfBox.style.display = 'grid';
    document.querySelectorAll('.tf-btn').forEach(b => b.disabled = false);
    setTimeout(() => ArabicTTS.speak(currentArabicWord, false), 120);

  } else if (q.type === 'pairs') {
    setMascot('idle', 'Pilih kosakata Arab di kolom kiri lalu pasangkan dengan artinya di kolom kanan.');
    lbl.textContent = 'Pasangkan keempat kosakata berikut:';
    pr.textContent = '';
    audioRow.style.display = 'none';
    pairsBox.style.display = 'grid';
    initPairsUI(q.pairs || []);

  } else if (q.type === 'mc') {
    setMascot('idle', 'Pilih satu jawaban yang paling tepat.');
    lbl.textContent = (isArTarget ? 'Terjemahkan ke bahasa Arab' : 'Terjemahkan ke bahasa Indonesia') + ':';
    pr.textContent = q.prompt;
    pr.setAttribute('dir', isArTarget ? 'ltr' : 'rtl');
    audioRow.style.display = isArTarget ? 'none' : 'flex';
    speakText.textContent = 'Simak Pelafalan';
    mcBox.style.display = 'grid';
    mcBox.innerHTML = (q.options || []).map(o =>
      `<button class="mc-opt" dir="${isArTarget ? 'rtl' : 'ltr'}" onclick="answerMC(this)">${esc(o)}</button>`
    ).join('');
    if (!isArTarget) setTimeout(() => ArabicTTS.speak(currentArabicWord, false), 120);

  } else {
    setMascot('idle', 'Ketik jawaban Anda. Penulisan bahasa Arab diperbolehkan tanpa harakat.');
    lbl.textContent = (isArTarget ? 'Ketik dalam bahasa Arab' : 'Ketik artinya dalam bahasa Indonesia') + ':';
    pr.textContent = q.prompt;
    pr.setAttribute('dir', isArTarget ? 'ltr' : 'rtl');
    audioRow.style.display = isArTarget ? 'none' : 'flex';
    speakText.textContent = 'Simak Pelafalan';
    essayRow.style.display = 'flex';
    const inp = document.getElementById('answer-input');
    inp.value = '';
    inp.setAttribute('dir', isArTarget ? 'rtl' : 'ltr');
    inp.setAttribute('lang', isArTarget ? 'ar' : 'id');
    inp.placeholder = isArTarget ? 'كتاب... (boleh tanpa harakat)' : 'Ketik arti...';
    setTimeout(() => inp.focus(), 80);
    if (!isArTarget) setTimeout(() => ArabicTTS.speak(currentArabicWord, false), 120);
  }
}

/* ---------- Handler: Pilihan Ganda & Istima' ---------- */
function answerMC(btn) {
  SoundFX.tap();
  document.querySelectorAll('.mc-opt').forEach(b => b.disabled = true);
  if (btn.getAttribute('dir') === 'rtl') ArabicTTS.speak(btn.textContent, false);
  submitAnswer(btn.textContent, btn);
}

/* ---------- Handler: True / False ---------- */
function answerTF(choice) {
  SoundFX.tap();
  document.querySelectorAll('.tf-btn').forEach(b => b.disabled = true);
  submitAnswer(choice);
}

/* ---------- Handler: Susun Huruf Arab (Jumble) ---------- */
function initJumbleUI(q) {
  jumblePicked = [];
  renderJumbleState();
}

function renderJumbleState() {
  const q = curQuestion;
  if (!q || q.type !== 'jumble') return;
  const slotsEl = document.getElementById('jumble-slots');
  const bankEl = document.getElementById('jumble-bank');
  const targetLen = q.targetLen || 3;

  const slotsHTML = [];
  for (let i = 0; i < targetLen; i++) {
    const picked = jumblePicked[i];
    if (picked) {
      slotsHTML.push(`<button type="button" class="jumble-tile in-slot" onclick="removeJumbleAt(${i})">${esc(picked.char)}</button>`);
    } else {
      slotsHTML.push(`<div class="jumble-slot-empty"></div>`);
    }
  }
  slotsEl.innerHTML = slotsHTML.join('');

  const usedIndices = new Set(jumblePicked.map(p => p.idx));
  bankEl.innerHTML = (q.tiles || []).map((ch, idx) => {
    const used = usedIndices.has(idx);
    return `<button type="button" class="jumble-tile ${used ? 'used' : ''}" onclick="pickJumbleTile(${idx})">${esc(ch)}</button>`;
  }).join('');
}

function pickJumbleTile(idx) {
  const q = curQuestion;
  if (!q || q.type !== 'jumble') return;
  const targetLen = q.targetLen || 3;
  if (jumblePicked.length >= targetLen) return;
  if (jumblePicked.some(p => p.idx === idx)) return;

  SoundFX.tap();
  const char = q.tiles[idx];
  jumblePicked.push({ idx, char });
  renderJumbleState();

  if (jumblePicked.length === targetLen) {
    const word = jumblePicked.map(p => p.char).join('');
    ArabicTTS.speak(word, false);
    setTimeout(() => submitAnswer(word), 160);
  }
}

function removeJumbleAt(slotIdx) {
  SoundFX.tap();
  jumblePicked.splice(slotIdx, 1);
  renderJumbleState();
}

function popJumbleTile() {
  if (!jumblePicked.length) return;
  SoundFX.tap();
  jumblePicked.pop();
  renderJumbleState();
}

/* ---------- Handler: Pasangkan Kartu (Pairs) ---------- */
function shuffleClient(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initPairsUI(pairs) {
  pairsSelectedAr = null;
  pairsSelectedId = null;
  pairsMatchedCount = 0;
  pairsTotalCount = pairs.length;

  const arList = shuffleClient(pairs);
  const idList = shuffleClient(pairs);

  document.getElementById('pairs-ar-col').innerHTML = arList.map(p =>
    `<button type="button" class="pair-card" dir="rtl" data-id="${p.id}" data-ar="${esc(p.arab)}" onclick="tapPairAr(this)">${esc(p.arab)}</button>`
  ).join('');

  document.getElementById('pairs-id-col').innerHTML = idList.map(p =>
    `<button type="button" class="pair-card" dir="ltr" data-id="${p.id}" onclick="tapPairId(this)">${esc(p.indonesia)}</button>`
  ).join('');
}

function tapPairAr(el) {
  if (el.classList.contains('matched')) return;
  SoundFX.tap();
  const arab = el.getAttribute('data-ar');
  if (arab) ArabicTTS.speak(arab, false);

  document.querySelectorAll('#pairs-ar-col .pair-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  pairsSelectedAr = { id: Number(el.getAttribute('data-id')), el };
  checkPairMatch();
}

function tapPairId(el) {
  if (el.classList.contains('matched')) return;
  SoundFX.tap();
  document.querySelectorAll('#pairs-id-col .pair-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  pairsSelectedId = { id: Number(el.getAttribute('data-id')), el };
  checkPairMatch();
}

function checkPairMatch() {
  if (!pairsSelectedAr || !pairsSelectedId) return;
  const ar = pairsSelectedAr;
  const id = pairsSelectedId;
  pairsSelectedAr = null;
  pairsSelectedId = null;

  if (ar.id === id.id) {
    ar.el.classList.remove('selected');
    id.el.classList.remove('selected');
    ar.el.classList.add('matched');
    id.el.classList.add('matched');
    pairsMatchedCount++;
    SoundFX.correct(pairsMatchedCount);

    if (pairsMatchedCount >= pairsTotalCount) {
      setTimeout(() => submitAnswer('PAIRS_DONE'), 200);
    }
  } else {
    SoundFX.wrong();
    ar.el.classList.remove('selected');
    id.el.classList.remove('selected');
    ar.el.classList.add('wrong');
    id.el.classList.add('wrong');
    setTimeout(() => {
      ar.el.classList.remove('wrong');
      id.el.classList.remove('wrong');
    }, 340);
  }
}

/* ---------- Submit Jawaban & Feedback ---------- */
function triggerScorePop(points) {
  if (!points) return;
  const chip = document.getElementById('score-chip-box');
  const pop = document.getElementById('float-pop');
  if (chip) {
    chip.classList.remove('pop');
    void chip.offsetWidth;
    chip.classList.add('pop');
    setTimeout(() => chip.classList.remove('pop'), 260);
  }
  if (pop) {
    pop.textContent = `+${points}`;
    pop.classList.remove('show');
    void pop.offsetWidth;
    pop.classList.add('show');
  }
}

function submitAnswer(text, clickedBtn = null) {
  text = text !== undefined ? text : document.getElementById('answer-input').value;
  if (!String(text).trim()) return;
  socket.emit('player:answer', { text }, (res) => {
    if (!res || res.error) return;
    const fb = document.getElementById('feedback');
    const scoreEl = document.getElementById('arena-score');
    scoreEl.textContent = parseInt(scoreEl.textContent) + res.points;
    document.getElementById('streak-n').textContent = res.streak;
    document.getElementById('arena-streak').classList.toggle('hot', res.streak >= 3);

    if (res.correct) {
      SoundFX.correct(res.streak);
      triggerScorePop(res.points);
      if (clickedBtn) clickedBtn.classList.add('correct');

      const praise = PRAISES_AR[Math.floor(Math.random() * PRAISES_AR.length)];
      if (res.streak >= 5 && res.streak % 5 === 0) {
        setMascot('fire', `مَاشَاءَ اللّٰه — ${res.streak} jawaban benar beruntun (+100 poin bonus).`);
      } else {
        setMascot(res.streak >= 3 ? 'fire' : 'ok', praise);
      }

      fb.className = 'feedback ok';
      fb.textContent = `Tepat (+${res.points} poin)` + (res.streak >= 5 && res.streak % 5 === 0 ? ' · Bonus Beruntun' : '');

      if (res.arabicWord && curQuestion && curQuestion.dir === 'id2ar' && curQuestion.type !== 'jumble') {
        ArabicTTS.speak(res.arabicWord, false);
      }
    } else {
      SoundFX.wrong();
      if (clickedBtn) clickedBtn.classList.add('wrong');
      if (isSoloMode && soloHearts > 0) {
        soloHearts--;
        updateHeartsUI(true);
      }
      const explain = res.explain || res.correctAnswer;
      setMascot('no', `Koreksi: ${explain}`);
      fb.className = 'feedback no';
      fb.textContent = `Belum tepat — Jawaban: ${res.correctAnswer}`;
      if (res.arabicWord) ArabicTTS.speak(res.arabicWord, false);
    }

    if (res.next) {
      setTimeout(() => renderQuestion(res.next), res.correct ? 520 : 1450);
    }
  });
}

/* ================= 8. RENDER LEADERBOARD & PODIUM ================= */
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function medal(i) { return `#${i + 1}`; }
function renderBoard(el, lb, myNis) {
  if (!el) return;
  el.innerHTML = lb.map((p, i) => `
    <div class="board-row ${p.nis === myNis ? 'me' : ''}">
      <span class="rank">${medal(i)}</span>
      <span class="name">${esc(p.nama)}</span>
      <span class="pts">${p.score}</span>
    </div>`).join('');
}
function renderPodium(lb) {
  const top = lb.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const cls = ['p2', 'p1', 'p3'];
  const numerals = ['II', 'I', 'III'];
  document.getElementById('podium').innerHTML = order.map((p, i) => `
    <div class="step ${cls[i]}">
      <div class="medal">${numerals[i]}</div>
      <div class="nm">${esc(p.nama)}</div>
      <div class="sc">${p.score} poin</div>
    </div>`).join('');
}
function typeLabel(t) {
  const m = {
    mix: 'Terpadu',
    mc: 'Ikhtiyar',
    listen: 'Istima\'',
    jumble: 'Tarkib Huruf',
    pairs: 'Muthabaqah',
    truefalse: 'Shohih/Khotho\'',
    essay: 'Kitabah',
  };
  return m[t] || t;
}
function sessLabel(s) {
  return `Sesi: ${s.dir === 'ar2id' ? 'Arab ke Indo' : 'Indo ke Arab'} · ${typeLabel(s.type)} · ${s.seconds} dtk`;
}

/* Confetti Podium (Gold & Ivory Palette) */
function confettiBurst() {
  const c = document.getElementById('confetti');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = window.innerWidth; c.height = window.innerHeight;
  const colors = ['#D4AF37', '#C59B27', '#F3E5AB', '#9E7812', '#E6CE8C'];
  const P = [];
  for (let i = 0; i < 120; i++) P.push({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.35,
    w: 5 + Math.random() * 5, h: 7 + Math.random() * 7,
    vy: 1.8 + Math.random() * 2.8, vx: -1 + Math.random() * 2,
    r: Math.random() * Math.PI, vr: -0.1 + Math.random() * 0.2,
    col: colors[i % colors.length],
  });
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of P) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (++frames < 220) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c.width, c.height);
  })();
}

/* ================= 9. SOCKET HANDLERS ================= */
function registerHandlers() {
  socket.on('lobby:update', (lobby) => {
    document.getElementById('lobby-count').textContent = lobby.players.length;
    let cfg = '';
    if (lobby.config) {
      cfg = `<p class="muted" style="margin-bottom:10px">${lobby.config.jmlBab} bab · ${lobby.config.jmlKata} kosakata<br>` +
        lobby.config.sessions.map((s, i) => `Sesi 0${i + 1}: ${sessLabel(s)}`).join('<br>') + `</p>`;
    }
    document.getElementById('lobby-list').innerHTML = cfg + lobby.players
      .map(p => `<li><span>${esc(p.nama)}</span><span class="nis">${esc(p.nis)}</span></li>`)
      .join('');
    document.getElementById('btn-start').disabled = lobby.players.length === 0 || !lobby.configured;
  });

  socket.on('game:countdown', ({ n, sessionIndex }) => {
    const el = document.getElementById('countdown');
    el.classList.remove('hidden');
    document.getElementById('countdown-n').textContent = n;
    SoundFX.countdown(n);
    if (n === 3) {
      curSession = sessionIndex;
      document.getElementById('arena-score').textContent = '0';
      document.getElementById('streak-n').textContent = '0';
    }
  });

  socket.on('game:start', ({ seconds, sessionIndex, session }) => {
    totalSeconds = seconds; curSession = sessionIndex;
    document.getElementById('countdown').classList.add('hidden');
    const badge = document.getElementById('sess-badge');
    if (badge) badge.textContent = `Sesi 0${sessionIndex + 1} · ${typeLabel(session.type)}`;
    updateHeartsUI();
    if (isHost) showView('view-host-live');
    else showView('view-arena');
  });

  socket.on('game:question', (q) => renderQuestion(q));

  const paintPlayerBoard = (sessionLb) => {
    document.getElementById('mini-count').textContent = sessionLb.length;
    const board = document.getElementById('mini-board');
    renderBoard(board, sessionLb.slice(0, 5), myNis);
    const rank = sessionLb.findIndex(p => p.nis === myNis) + 1;
    const chip = document.getElementById('rank-chip');
    if (chip) chip.textContent = rank > 0 ? `Peringkat #${rank}` : 'Peringkat –';
  };
  const paintTick = (remaining, sessionLb) => {
    ['arena-timer', 'host-timer'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = remaining; el.classList.toggle('danger', remaining <= 10); }
    });
    const fill = document.getElementById('timer-fill');
    if (fill) fill.style.width = (remaining / totalSeconds * 100) + '%';
    if (isHost) renderBoard(document.getElementById('host-board'), sessionLb, null);
    else paintPlayerBoard(sessionLb);
  };
  socket.on('game:tick', ({ remaining, session, total }) => paintTick(remaining, session, total));
  socket.on('game:leaderboard', ({ session }) => {
    if (isHost) renderBoard(document.getElementById('host-board'), session, null);
    else paintPlayerBoard(session);
  });

  socket.on('game:intermission', ({ total, nextIndex, next, seconds }) => {
    showView('view-intermission');
    document.getElementById('int-next-n').textContent = `0${nextIndex + 1}`;
    const kb = next.dir === 'id2ar' ? 'Siapkan papan ketik bahasa Arab.' : 'Siapkan papan ketik Latin.';
    document.getElementById('int-desc').innerHTML =
      `${sessLabel(next)}<br>${next.type === 'essay' ? kb : 'Bersiap memasuki sesi berikutnya.'}`;
    document.getElementById('int-timer').textContent = seconds;
    renderBoard(document.getElementById('int-board'), total, isHost ? null : myNis);
  });
  socket.on('game:intermissionTick', ({ remaining }) => {
    const el = document.getElementById('int-timer');
    if (el) { el.textContent = remaining; el.classList.toggle('danger', remaining <= 5); }
  });

  socket.on('game:over', ({ total }) => {
    SoundFX.fanfare();
    if (isHost) {
      showView('view-host-podium');
      renderPodium(total);
      renderBoard(document.getElementById('host-results'), total, null);
    } else {
      showView('view-result');
      const me = total.find(p => p.nis === myNis) || { score: 0 };
      const rank = total.indexOf(me) + 1;
      document.getElementById('result-title').textContent = isSoloMode ? 'Sesi Latihan Selesai' : 'Sesi Kompetisi Berakhir';
      document.getElementById('my-rank').textContent =
        `Peringkat #${rank || 1} — ${me.score} Poin`;
      document.getElementById('my-stats').innerHTML = '';
      renderBoard(document.getElementById('result-board'), total, myNis);
    }
    setTimeout(confettiBurst, 200);
  });

  socket.on('room:closed', () => { alert('Room telah ditutup oleh host.'); location.reload(); });

  const ansInput = document.getElementById('answer-input');
  if (ansInput) {
    ansInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAnswer();
    });
  }
}

/* ================= 10. BOOT ================= */
(function boot() {
  updateSoundToggleUI();
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
  const s = document.createElement('script');
  s.src = BASE_PATH + '/socket.io/socket.io.js';
  s.onload = () => {
    socket = io({ path: BASE_PATH + '/socket.io/' });
    registerHandlers();
  };
  s.onerror = () => {
    document.getElementById('app').innerHTML =
      '<div class="card"><h2>Gagal Memuat</h2><p class="muted">Tidak dapat terhubung ke server. Silakan muat ulang halaman.</p></div>';
  };
  document.head.appendChild(s);
})();
