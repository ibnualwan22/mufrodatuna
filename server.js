/**
 * Sprint Mufrodat — server game multipemain
 *
 * Fitur: room + NIS, 1–2 sesi (tiap sesi: arah ar2id/id2ar × tipe essay/mc),
 * skor per sesi + juara umum, bot, halaman admin kelola mufrodat (SQLite).
 *
 * Env: PORT, SPRINT_SECONDS (default per sesi), ADMIN_PASSWORD, DB_PATH
 */
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { isCorrect } = require("./lib/normalize");
const db = require("./lib/db");

const app = express();
app.use(express.static("public"));
const server = http.createServer(app);
const io = new Server(server);

const DEFAULT_SECONDS = parseInt(process.env.SPRINT_SECONDS || "60", 10);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "mufrodat123";
if (!process.env.ADMIN_PASSWORD) {
  console.log("⚠️  ADMIN_PASSWORD tidak diset — pakai default 'mufrodat123'. Ganti di production!");
}

/* ---------------- data santri (PROTOTIPE) ----------------
 * TODO integrasi Siakad: ganti dengan query ke DB/API Siakad. */
const SANTRI_MOCK = {
  "1001": "Ahmad Fauzi", "1002": "Fatimah Zahra", "1003": "Bilal Hidayat",
  "1004": "Khadijah Aminah", "1005": "Umar Faruq", "1006": "Zainab Syarifah",
};
const lookupSantri = (nis) => SANTRI_MOCK[String(nis).trim()] || `Santri-${String(nis).trim()}`;
/* ---------------------------------------------------------- */

const rooms = new Map();
const makeCode = () => {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)];
  return rooms.has(s) ? makeCode() : s;
};

/* ---------------- soal ---------------- */
function pickWord(pool, recentIds) {
  const avail = pool.filter((w) => !recentIds.includes(w.id));
  const list = avail.length ? avail : pool;
  return list[Math.floor(Math.random() * list.length)];
}

function makeQuestion(pool, recentIds, dir, type) {
  const w = pickWord(pool, recentIds);
  const q = {
    wordId: w.id, dir, type,
    prompt: dir === "id2ar" ? w.indonesia : w.arab,
    answer: dir === "id2ar" ? w.arab : w.indonesia,
    answerLang: dir === "id2ar" ? "ar" : "id",
  };
  if (type === "mc") {
    const others = pool.filter((x) => x.id !== w.id);
    // acak + ambil 3 pengecoh
    const distract = [...others].sort(() => Math.random() - 0.5).slice(0, 3)
      .map((x) => (dir === "id2ar" ? x.arab : x.indonesia));
    const opts = [...distract];
    // sispkan jawaban di posisi acak
    opts.splice(Math.floor(Math.random() * (opts.length + 1)), 0, q.answer);
    q.options = opts;
  }
  return q;
}

function serveQuestion(room, socketId) {
  const p = room.players.get(socketId);
  if (!p || p.isBot) return null;
  const sess = room.config.sessions[room.sessionIndex];
  const q = makeQuestion(room.pool, p.recentIds, sess.dir, sess.type);
  p.recentIds.push(q.wordId);
  if (p.recentIds.length > 10) p.recentIds.shift();
  p.question = { ...q, servedAt: Date.now() };
  const { answer, answerLang, wordId, ...pub } = q; // jangan kirim kunci ke client
  return pub;
}

/* ---------------- skor ---------------- */
function scoreAnswer(p, correct, elapsedMs) {
  if (!correct) { p.streak = 0; p.wrong++; return 0; }
  const speedBonus = Math.max(0, Math.round(50 - (elapsedMs / 1000) * 10));
  p.streak++;
  p.bestStreak = Math.max(p.bestStreak, p.streak);
  p.correct++;
  let pts = 100 + speedBonus;
  if (p.streak % 5 === 0) pts += 100;
  p.sessionScore += pts;
  p.total += pts;
  return pts;
}

const sessionBoard = (room) =>
  [...room.players.values()]
    .map((p) => ({ nis: p.nis, nama: p.nama, isBot: !!p.isBot, score: p.sessionScore,
      correct: p.correct, wrong: p.wrong, streak: p.streak, bestStreak: p.bestStreak }))
    .sort((a, b) => b.score - a.score);

const totalBoard = (room) =>
  [...room.players.values()]
    .map((p) => ({ nis: p.nis, nama: p.nama, isBot: !!p.isBot, score: p.total }))
    .sort((a, b) => b.score - a.score);

const publicLobby = (room) => ({
  code: room.code, state: room.state, configured: !!room.config,
  config: room.config ? {
    sessions: room.config.sessions,
    jmlBab: room.config.babIds.length, jmlKata: room.pool.length,
  } : null,
  players: [...room.players.values()].map((p) => ({ nis: p.nis, nama: p.nama, isBot: !!p.isBot })),
});

function addPlayer(room, socketId, nis, nama, isBot = false) {
  room.players.set(socketId, {
    socketId, nis, nama, isBot, total: 0, sessionScore: 0,
    correct: 0, wrong: 0, streak: 0, bestStreak: 0,
    question: null, recentIds: [],
  });
}

/* ---------------- alur sesi ---------------- */
function startSession(room, idx) {
  room.sessionIndex = idx;
  room.state = "countdown";
  const sess = room.config.sessions[idx];
  let n = 3;
  io.to(room.code).emit("game:countdown", { n, sessionIndex: idx, session: sess });
  const cd = setInterval(() => {
    n--;
    if (n <= 0) { clearInterval(cd); beginPlay(room, sess); }
    else io.to(room.code).emit("game:countdown", { n, sessionIndex: idx, session: sess });
  }, 1000);
}

function beginPlay(room, sess) {
  room.state = "playing";
  room.endsAt = Date.now() + sess.seconds * 1000;

  for (const [sid, p] of room.players) {
    if (p.isBot) continue;
    p.sessionScore = 0; p.question = null; p.recentIds = [];
    io.to(sid).emit("game:question", serveQuestion(room, sid));
  }
  // bot
  for (const [sid, p] of room.players) {
    if (!p.isBot) continue;
    p.sessionScore = 0; p.recentIds = [];
    const bot = { timer: null };
    const once = () => {
      if (room.state !== "playing") return;
      const q = makeQuestion(room.pool, p.recentIds, sess.dir, sess.type);
      const benar = Math.random() < 0.82;
      scoreAnswer(p, benar, 900 + Math.random() * 1600);
      if (benar) p.recentIds.push(q.wordId);
      io.to(room.code).emit("game:leaderboard",
        { session: sessionBoard(room), total: totalBoard(room), sessionIndex: room.sessionIndex });
      bot.timer = setTimeout(once, 900 + Math.random() * 1600);
    };
    bot.timer = setTimeout(once, 1200 + Math.random() * 1500);
    room.bots.push(bot);
  }

  io.to(room.code).emit("game:start", { seconds: sess.seconds, sessionIndex: room.sessionIndex, session: sess });

  room.tickTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000));
    io.to(room.code).emit("game:tick", {
      remaining, session: sessionBoard(room), total: totalBoard(room), sessionIndex: room.sessionIndex,
    });
    if (remaining <= 0) {
      clearInterval(room.tickTimer);
      room.bots.forEach((b) => clearTimeout(b.timer));
      room.bots = [];
      if (room.sessionIndex + 1 < room.config.sessions.length) startIntermission(room);
      else endGame(room);
    }
  }, 1000);
}

function startIntermission(room) {
  room.state = "intermission";
  const next = room.config.sessions[room.sessionIndex + 1];
  const secs = 15;
  io.to(room.code).emit("game:intermission", {
    session: sessionBoard(room), total: totalBoard(room),
    finishedIndex: room.sessionIndex, nextIndex: room.sessionIndex + 1,
    next, seconds: secs,
  });
  let left = secs;
  room.tickTimer = setInterval(() => {
    left--;
    io.to(room.code).emit("game:intermissionTick", { remaining: left });
    if (left <= 0) { clearInterval(room.tickTimer); startSession(room, room.sessionIndex + 1); }
  }, 1000);
}

function endGame(room) {
  room.state = "finished";
  clearInterval(room.tickTimer);
  room.bots.forEach((b) => clearTimeout(b.timer));
  io.to(room.code).emit("game:over", {
    total: totalBoard(room),
    sessions: room.config.sessions.map((s, i) => ({ index: i, session: s })),
  });
  // kirim papan per sesi juga
  io.to(room.code).emit("game:overBoards", { note: "lihat game:over" });
}

/* ---------------- socket ---------------- */
io.on("connection", (socket) => {
  socket.on("host:create", (_, cb) => {
    const code = makeCode();
    rooms.set(code, { code, hostId: socket.id, state: "lobby", players: new Map(),
      config: null, pool: [], sessionIndex: 0, endsAt: 0, tickTimer: null, bots: [] });
    socket.join(code);
    cb({ code });
  });

  socket.on("host:getPrograms", (_, cb) => cb({ programs: db.listPrograms() }));
  socket.on("host:getBabs", ({ programId }, cb) => cb({ babs: db.getBabs(programId) }));

  socket.on("host:configure", ({ programId, babIds, sessions }, cb) => {
    const room = [...rooms.values()].find((r) => r.hostId === socket.id);
    if (!room || room.state !== "lobby") return cb({ error: "Room tidak valid." });
    babIds = (babIds || []).map(Number).filter(Boolean);
    if (!babIds.length) return cb({ error: "Pilih minimal 1 bab." });
    if (!Array.isArray(sessions) || sessions.length < 1 || sessions.length > 2)
      return cb({ error: "Sesi harus 1 atau 2." });
    for (const s of sessions) {
      if (!["ar2id", "id2ar"].includes(s.dir)) return cb({ error: "Arah sesi tidak valid." });
      if (!["essay", "mc"].includes(s.type)) return cb({ error: "Tipe sesi tidak valid." });
      s.seconds = Math.min(180, Math.max(15, parseInt(s.seconds) || DEFAULT_SECONDS));
    }
    const pool = db.getPool(babIds);
    if (pool.length < 4) return cb({ error: `Kata terlalu sedikit (${pool.length}). Tambah kata dulu di halaman admin.` });
    room.config = { programId, babIds, sessions };
    room.pool = pool;
    io.to(room.code).emit("lobby:update", publicLobby(room));
    cb({ ok: true, jmlKata: pool.length });
  });

  socket.on("host:addBots", () => {
    const room = [...rooms.values()].find((r) => r.hostId === socket.id);
    if (!room || room.state !== "lobby") return;
    ["Bot Utsman 🤖", "Bot Maryam 🤖"].forEach((nama, i) => {
      const id = `bot-${room.code}-${i}`;
      if (!room.players.has(id)) addPlayer(room, id, `BOT${i + 1}`, nama, true);
    });
    io.to(room.code).emit("lobby:update", publicLobby(room));
  });

  socket.on("host:start", (cb) => {
    const room = [...rooms.values()].find((r) => r.hostId === socket.id);
    if (!room || room.state !== "lobby") return cb && cb({ error: "Room tidak valid." });
    if (!room.config) return cb && cb({ error: "Atur program, bab, dan sesi dulu." });
    if (room.players.size === 0) return cb && cb({ error: "Belum ada peserta." });
    cb && cb({ ok: true });
    startSession(room, 0);
  });

  socket.on("player:join", ({ code, nis }, cb) => {
    code = String(code || "").toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return cb({ error: "Kode room tidak ditemukan." });
    if (room.state !== "lobby") return cb({ error: "Game sudah dimulai." });
    if (!nis || !String(nis).trim()) return cb({ error: "NIS harus diisi." });
    socket.join(code);
    socket.data.roomCode = code;
    addPlayer(room, socket.id, String(nis).trim(), lookupSantri(nis));
    cb({ ok: true, nama: lookupSantri(nis), code });
    io.to(code).emit("lobby:update", publicLobby(room));
  });

  socket.on("player:answer", ({ text }, cb) => {
    const room = socket.data.roomCode && rooms.get(socket.data.roomCode);
    if (!room || room.state !== "playing") return cb && cb({ error: "Game tidak berjalan." });
    const p = room.players.get(socket.id);
    if (!p || !p.question) return cb && cb({ error: "Tidak ada soal aktif." });
    const q = p.question;
    const elapsed = Date.now() - q.servedAt;
    const correct = isCorrect(text, q.answer, q.answerLang);
    const pts = scoreAnswer(p, correct, elapsed);
    const next = serveQuestion(room, socket.id);
    io.to(room.code).emit("game:leaderboard",
      { session: sessionBoard(room), total: totalBoard(room), sessionIndex: room.sessionIndex });
    cb && cb({ correct, points: pts, correctAnswer: q.answer, streak: p.streak, next });
  });

  /* ---------- admin (kelola mufrodat) ---------- */
  const needAuth = (password) => password === ADMIN_PASSWORD;
  socket.on("admin:login", ({ password }, cb) => cb({ ok: needAuth(password) }));
  const admin = (ev, fn) => socket.on(ev, (args = {}, cb) => {
    if (!needAuth(args.password)) return cb({ error: "Password salah." });
    try { cb({ ok: true, ...fn(args) }); } catch (e) { cb({ error: e.message }); }
  });
  admin("admin:listPrograms", () => ({ programs: db.listPrograms() }));
  admin("admin:getBabs", ({ programId }) => ({ babs: db.getBabs(programId) }));
  admin("admin:getWords", ({ babId }) => ({ words: db.getWords(babId) }));
  admin("admin:addProgram", ({ nama }) => ({ id: db.addProgram(nama) }));
  admin("admin:addBab", ({ programId, judul }) => ({ id: db.addBab(programId, judul) }));
  admin("admin:updateBab", ({ id, judul }) => (db.updateBab(id, judul), {}));
  admin("admin:deleteBab", ({ id }) => (db.deleteBab(id), {}));
  admin("admin:addWord", ({ babId, arab, indonesia }) => ({ id: db.addWord(babId, arab, indonesia) }));
  admin("admin:updateWord", ({ id, arab, indonesia }) => (db.updateWord(id, arab, indonesia), {}));
  admin("admin:deleteWord", ({ id }) => (db.deleteWord(id), {}));

  socket.on("disconnect", () => {
    const room = socket.data.roomCode && rooms.get(socket.data.roomCode);
    if (!room) return;
    room.players.delete(socket.id);
    if (room.hostId === socket.id) {
      clearInterval(room.tickTimer);
      room.bots.forEach((b) => clearTimeout(b.timer));
      io.to(room.code).emit("room:closed");
      rooms.delete(room.code);
    } else if (room.state === "lobby") {
      io.to(room.code).emit("lobby:update", publicLobby(room));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎮 Sprint Mufrodat jalan di http://localhost:${PORT}`));
