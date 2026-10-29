/* Sprint Mufrodat — client (wizard host, 2 sesi, essay/MC, jeda, juara umum) */
let socket = null;
const BASE_PATH = (() => {
  const p = window.location.pathname;
  return (p === '/game' || p.indexOf('/game/') === 0) ? '/game' : '';
})();

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function goHome() { showView('view-home'); }
function showJoin() { showView('view-join'); }

let myCode = null, myNis = null, myNama = null, isHost = false;
let totalSeconds = 60, curSession = 0;

/* ================= WIZARD HOST ================= */
let wzProgram = null, wzBabs = new Set(), wzSessions = null;
const emitAck = (ev, data) => new Promise(res => socket.emit(ev, data, res));

function showHostSetup() {
  wzProgram = null; wzBabs = new Set();
  wzSessions = [{ dir: 'ar2id', type: 'mc', seconds: 60 }];
  showView('view-host-setup'); wzStep(1); loadWzPrograms();
}
function wzStep(n) {
  [1, 2, 3].forEach(i => document.getElementById('wz-' + i).style.display = i === n ? 'block' : 'none');
}
async function loadWzPrograms() {
  const { programs } = await emitAck('host:getPrograms', null);
  document.getElementById('wz-programs').innerHTML = programs.map(p => `
    <div class="bab-check" onclick="wzPickProgram(${p.id}, '${esc(p.nama)}')">
      <span>📚 <b>${esc(p.nama)}</b></span>
      <span class="muted" style="margin-left:auto">${p.jml_bab} bab • ${p.jml_kata} kata</span>
    </div>`).join('') || '<p class="muted">Belum ada program. Tambah di halaman admin.</p>';
}
async function wzPickProgram(id, nama) {
  wzProgram = id; wzBabs = new Set();
  document.getElementById('wz-prog-name').textContent = nama;
  const { babs } = await emitAck('host:getBabs', { programId: id });
  document.getElementById('wz-babs').innerHTML = babs.map(b => `
    <label class="bab-check"><input type="checkbox" value="${b.id}" onchange="wzToggleBab(${b.id}, this.checked)">
      <span>📖 ${esc(b.judul)}</span><span class="muted" style="margin-left:auto">${b.jml_kata} kata</span>
    </label>`).join('') || '<p class="muted">Belum ada bab di program ini.</p>';
  wzStep(2);
}
function wzToggleBab(id, on) { on ? wzBabs.add(id) : wzBabs.delete(id); }

function sessCfgHTML(s, i) {
  const dirName = d => d === 'ar2id' ? 'Arab → Indonesia (keyboard Latin)' : 'Indonesia → Arab (keyboard Arab)';
  const typeName = t => t === 'essay' ? 'Essay (ketik jawaban)' : 'Pilihan ganda (tap jawaban)';
  return `<div class="sess-cfg"><h4>⚡ Sesi ${i + 1}</h4>
    <label style="margin:4px 0">Arah soal</label>
    <select id="sess-dir-${i}">
      <option value="ar2id" ${s.dir === 'ar2id' ? 'selected' : ''}>${dirName('ar2id')}</option>
      <option value="id2ar" ${s.dir === 'id2ar' ? 'selected' : ''}>${dirName('id2ar')}</option>
    </select>
    <label style="margin:4px 0">Tipe jawaban</label>
    <select id="sess-type-${i}">
      <option value="mc" ${s.type === 'mc' ? 'selected' : ''}>${typeName('mc')}</option>
      <option value="essay" ${s.type === 'essay' ? 'selected' : ''}>${typeName('essay')}</option>
    </select>
    <label style="margin:4px 0">Durasi (detik)</label>
    <select id="sess-sec-${i}">
      ${[30, 45, 60, 90].map(v => `<option value="${v}" ${s.seconds === v ? 'selected' : ''}>${v} detik</option>`).join('')}
    </select>
    ${wzSessions.length > 1 ? `<button class="btn btn-ghost" style="font-size:13px" onclick="delSessionCfg(${i})">🗑️ Hapus sesi ini</button>` : ''}
  </div>`;
}
function renderSessCfg() {
  document.getElementById('wz-sessions').innerHTML = wzSessions.map(sessCfgHTML).join('');
  document.getElementById('btn-add-session').style.display = wzSessions.length >= 2 ? 'none' : 'block';
}
function addSessionCfg() {
  if (wzSessions.length >= 2) return;
  // default sesi 2: kebalikan arah sesi 1, tipe essay
  const d1 = document.getElementById('sess-dir-0').value;
  wzSessions.push({ dir: d1 === 'ar2id' ? 'id2ar' : 'ar2id', type: 'essay', seconds: 60 });
  renderSessCfg();
}
function delSessionCfg(i) { wzSessions.splice(i, 1); renderSessCfg(); }
// baca nilai form sebelum renderSessCfg dipanggil ulang
function readSessCfg() {
  wzSessions = wzSessions.map((_, i) => ({
    dir: document.getElementById('sess-dir-' + i).value,
    type: document.getElementById('sess-type-' + i).value,
    seconds: parseInt(document.getElementById('sess-sec-' + i).value),
  }));
}
// panggil wzStep(3) override: render dulu
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

function addBots() { socket.emit('host:addBots'); }
function startGame() {
  socket.emit('host:start', (r) => { if (r && r.error) alert(r.error); });
}

/* ================= PEMAIN ================= */
function joinRoom() {
  const code = document.getElementById('join-code').value.toUpperCase().trim();
  const nis = document.getElementById('join-nis').value.trim();
  document.getElementById('join-error').textContent = '';
  socket.emit('player:join', { code, nis }, (res) => {
    if (res.error) { document.getElementById('join-error').textContent = res.error; return; }
    myCode = res.code; myNis = nis; myNama = res.nama;
    document.getElementById('waiting-nama').textContent = `Halo, ${res.nama}! 👋`;
    showView('view-waiting');
  });
}

/* ================= ARENA ================= */
function renderQuestion(q) {
  const isAr = q.dir === 'id2ar';
  const isMC = q.type === 'mc';
  document.getElementById('q-label').textContent =
    (isAr ? 'Terjemahkan ke bahasa Arab' : 'Terjemahkan ke bahasa Indonesia') +
    (isMC ? ' — pilih jawaban:' : ':');
  const pr = document.getElementById('q-prompt');
  pr.textContent = q.prompt;
  pr.setAttribute('dir', isAr ? 'ltr' : 'rtl');
  document.getElementById('feedback').textContent = '';

  const essayRow = document.getElementById('essay-row');
  const mcBox = document.getElementById('mc-options');
  if (isMC) {
    essayRow.style.display = 'none';
    mcBox.style.display = 'grid';
    mcBox.innerHTML = q.options.map(o =>
      `<button class="mc-opt" dir="${isAr ? 'rtl' : 'ltr'}" onclick="answerMC(this)">${esc(o)}</button>`).join('');
  } else {
    essayRow.style.display = 'flex';
    mcBox.style.display = 'none';
    const inp = document.getElementById('answer-input');
    inp.value = '';
    inp.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    inp.setAttribute('lang', isAr ? 'ar' : 'id');
    inp.placeholder = isAr ? 'كتاب... (boleh tanpa harakat)' : 'ketik arti...';
    setTimeout(() => inp.focus(), 100);
  }
}
function answerMC(btn) {
  document.querySelectorAll('.mc-opt').forEach(b => b.disabled = true);
  submitAnswer(btn.textContent);
}
function submitAnswer(text) {
  text = text !== undefined ? text : document.getElementById('answer-input').value;
  if (!String(text).trim()) return;
  socket.emit('player:answer', { text }, (res) => {
    if (res.error) return;
    const fb = document.getElementById('feedback');
    document.getElementById('arena-score').textContent =
      parseInt(document.getElementById('arena-score').textContent) + res.points;
    document.getElementById('streak-n').textContent = res.streak;
    document.getElementById('arena-streak').classList.toggle('hot', res.streak >= 3);
    if (res.correct) {
      fb.className = 'feedback ok';
      fb.textContent = `✅ Benar! +${res.points}` + (res.streak >= 5 && res.streak % 5 === 0 ? ' 🔥 bonus streak!' : '');
    } else {
      fb.className = 'feedback no';
      fb.textContent = `❌ Kurang tepat. Jawaban: ${res.correctAnswer}`;
    }
    if (res.next) setTimeout(() => renderQuestion(res.next), res.correct ? 450 : 1600);
  });
}

/* ================= RENDER ================= */
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function medal(i) { return ['🥇', '🥈', '🥉'][i] || `#${i + 1}`; }
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
  document.getElementById('podium').innerHTML = order.map((p, i) => `
    <div class="step ${cls[i]}">
      <div class="medal">${['🥈', '🥇', '🥉'][i]}</div>
      <div class="nm">${esc(p.nama)}</div>
      <div class="sc">${p.score} poin</div>
    </div>`).join('');
}
function sessLabel(s) {
  return `Sesi: ${s.dir === 'ar2id' ? 'Arab→Indo' : 'Indo→Arab'} • ${s.type === 'mc' ? 'Pilihan ganda' : 'Essay'} • ${s.seconds} dtk`;
}

/* confetti sederhana untuk podium */
function confettiBurst() {
  const c = document.getElementById('confetti');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = window.innerWidth; c.height = window.innerHeight;
  const colors = ['#ffd43b', '#51cf66', '#ff6b6b', '#4dabf7', '#b197fc', '#ff922b'];
  const P = [];
  for (let i = 0; i < 160; i++) P.push({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * .35,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
    vy: 2 + Math.random() * 3.2, vx: -1.2 + Math.random() * 2.4,
    r: Math.random() * Math.PI, vr: -.12 + Math.random() * .24,
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
    if (++frames < 260) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c.width, c.height);
  })();
}

/* ================= SOCKET HANDLERS ================= */
function registerHandlers() {
  socket.on('lobby:update', (lobby) => {
    document.getElementById('lobby-count').textContent = lobby.players.length;
    let cfg = '';
    if (lobby.config) {
      cfg = `<p class="muted">📖 ${lobby.config.jmlBab} bab • ${lobby.config.jmlKata} kata<br>` +
        lobby.config.sessions.map((s, i) => `Sesi ${i + 1}: ${sessLabel(s)}`).join('<br>') + `</p>`;
    }
    document.getElementById('lobby-list').innerHTML = cfg + lobby.players
      .map(p => `<li><span>${p.isBot ? '🤖 ' : '👤 '}${esc(p.nama)}</span><span class="nis">${esc(p.nis)}</span></li>`)
      .join('');
    document.getElementById('btn-start').disabled = lobby.players.length === 0 || !lobby.configured;
  });

  socket.on('game:countdown', ({ n, sessionIndex, session }) => {
    const el = document.getElementById('countdown');
    el.classList.remove('hidden');
    document.getElementById('countdown-n').textContent = n;
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
    if (badge) badge.textContent =
      `⚡ Sesi ${sessionIndex + 1} • ${session.dir === 'ar2id' ? 'Arab→Indo' : 'Indo→Arab'} • ${session.type === 'mc' ? 'Pilganda' : 'Essay'}`;
    if (isHost) showView('view-host-live');
    else showView('view-arena');
  });

  socket.on('game:question', (q) => renderQuestion(q));

  const paintPlayerBoard = (sessionLb) => {
    document.getElementById('mini-count').textContent = sessionLb.length;
    const board = document.getElementById('mini-board');
    const prev = board.dataset.top || '';
    renderBoard(board, sessionLb.slice(0, 5), myNis);
    const top = sessionLb.slice(0, 5).map(p => p.nis).join(',');
    if (prev && prev !== top) board.classList.remove('bump'), void board.offsetWidth, board.classList.add('bump');
    board.dataset.top = top;
    const rank = sessionLb.findIndex(p => p.nis === myNis) + 1;
    const chip = document.getElementById('rank-chip');
    if (chip) chip.textContent = rank > 0 ? `🏅 #${rank}` : '🏅 #–';
  };
  const paintTick = (remaining, sessionLb, totalLb) => {
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
  socket.on('game:leaderboard', ({ session, total }) => {
    if (isHost) renderBoard(document.getElementById('host-board'), session, null);
    else paintPlayerBoard(session);
  });

  socket.on('game:intermission', ({ session, total, finishedIndex, nextIndex, next, seconds }) => {
    showView('view-intermission');
    document.getElementById('int-next-n').textContent = nextIndex + 1;
    const kb = next.dir === 'id2ar' ? '⌨️ Ganti ke <b>keyboard Arab</b>!' : '⌨️ Ganti ke <b>keyboard Latin</b>!';
    document.getElementById('int-desc').innerHTML =
      `${sessLabel(next)}<br>${next.type === 'essay' ? kb : 'Siap-siap...'}`;
    document.getElementById('int-timer').textContent = seconds;
    renderBoard(document.getElementById('int-board'), total, isHost ? null : myNis);
  });
  socket.on('game:intermissionTick', ({ remaining }) => {
    const el = document.getElementById('int-timer');
    if (el) { el.textContent = remaining; el.classList.toggle('danger', remaining <= 5); }
  });

  socket.on('game:over', ({ total }) => {
    if (isHost) {
      showView('view-host-podium');
      renderPodium(total);
      renderBoard(document.getElementById('host-results'), total, null);
    } else {
      showView('view-result');
      const me = total.find(p => p.nis === myNis);
      const rank = total.indexOf(me) + 1;
      const medals = ['🥇', '🥈', '🥉'];
      document.getElementById('my-rank').textContent =
        `${medals[rank - 1] || '🏅'} Juara Umum #${rank} — ${me.score} poin`;
      document.getElementById('my-stats').innerHTML = '';
      renderBoard(document.getElementById('result-board'), total, myNis);
    }
    setTimeout(confettiBurst, 350);
  });

  socket.on('room:closed', () => { alert('Room ditutup host.'); location.reload(); });

  document.getElementById('answer-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAnswer();
  });
}

/* ================= BOOT ================= */
(function boot() {
  const s = document.createElement('script');
  s.src = BASE_PATH + '/socket.io/socket.io.js';
  s.onload = () => {
    socket = io({ path: BASE_PATH + '/socket.io/' });
    registerHandlers();
  };
  s.onerror = () => {
    document.getElementById('app').innerHTML =
      '<div class="card"><h2>⚠️ Gagal memuat</h2><p class="muted">Tidak bisa terhubung ke server game. Coba muat ulang.</p></div>';
  };
  document.head.appendChild(s);
})();
