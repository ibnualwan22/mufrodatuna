/**
 * Simulasi end-to-end v2: 2 sesi (MC + essay), jeda, juara umum, admin CRUD.
 * Server test: DB_PATH=/tmp/test-sprint.db PORT=3000 node server.js
 * Lalu: node test/simulate.js
 */
const { io } = require("socket.io-client");
const { WORDS } = require("../data/words");
const { normalizeArabic } = require("../lib/normalize");

const URL = "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const emitAck = (sock, ev, data) => new Promise((res) => sock.emit(ev, data, res));

function solvePrompt(prompt, dir) {
  // WORDS memakai field { ar, id, tema }
  const w = WORDS.find((x) => (dir === "id2ar" ? x.id === prompt : x.ar === prompt));
  if (!w) return "???";
  const ans = dir === "id2ar" ? w.ar : w.id;
  return dir === "id2ar" ? normalizeArabic(ans) : ans; // ketik tanpa harakat
}

(async () => {
  const results = [];
  const check = (name, pass) => { results.push([name, pass]); console.log(`${pass ? "✅" : "❌"} ${name}`); };

  /* ---------- admin ---------- */
  const adm = io(URL);
  await new Promise((r) => adm.on("connect", r));
  const badLogin = await emitAck(adm, "admin:login", { password: "salah" });
  check("admin: password salah ditolak", badLogin.ok !== true);
  const goodLogin = await emitAck(adm, "admin:login", { password: "mufrodat123" });
  check("admin: password benar diterima", goodLogin.ok === true);

  const progs = await emitAck(adm, "admin:listPrograms", { password: "mufrodat123" });
  check("admin: list programs ada isi", progs.programs && progs.programs.length >= 2);
  const babs = await emitAck(adm, "admin:getBabs", { password: "mufrodat123", programId: progs.programs[0].id });
  const babId = babs.babs[0].id;
  const before = await emitAck(adm, "admin:getWords", { password: "mufrodat123", babId });
  const added = await emitAck(adm, "admin:addWord", { password: "mufrodat123", babId, arab: "اِخْتِبَارٌ", indonesia: "ujian" });
  const after = await emitAck(adm, "admin:getWords", { password: "mufrodat123", babId });
  check("admin: tambah kata", after.words.length === before.words.length + 1);
  await emitAck(adm, "admin:deleteWord", { password: "mufrodat123", id: added.id });
  const afterDel = await emitAck(adm, "admin:getWords", { password: "mufrodat123", babId });
  check("admin: hapus kata", afterDel.words.length === before.words.length);
  const allBabIds = [];
  for (const p of progs.programs) {
    const bb = await emitAck(adm, "admin:getBabs", { password: "mufrodat123", programId: p.id });
    bb.babs.forEach((b) => allBabIds.push(b.id));
  }
  adm.disconnect();

  /* ---------- game 2 sesi ---------- */
  const host = io(URL);
  await new Promise((r) => host.on("connect", r));
  const { code } = await emitAck(host, "host:create", null);
  console.log("room:", code);

  const cfg = await emitAck(host, "host:configure", {
    programId: progs.programs[0].id,
    babIds: allBabIds,
    sessions: [
      { dir: "ar2id", type: "mc", seconds: 15 },
      { dir: "id2ar", type: "essay", seconds: 15 },
    ],
  });
  check("host: konfigurasi 2 sesi diterima", cfg.ok === true);

  const mkPlayer = async (nis) => {
    const s = io(URL);
    await new Promise((r) => s.on("connect", r));
    const res = await emitAck(s, "player:join", { code, nis });
    if (res.error) throw new Error(res.error);
    return s;
  };
  const p1 = await mkPlayer("1001");
  const p2 = await mkPlayer("1002");

  // pemain 1: selalu benar (MC: kirim teks jawaban benar; essay: tanpa harakat)
  const autoAnswer = (sock, correct) => {
    const loop = async (q) => {
      if (!q) return;
      await wait(250 + Math.random() * 500);
      const r = await emitAck(sock, "player:answer", { text: correct ? solvePrompt(q.prompt, q.dir) : "ngawur" });
      if (!r.error && r.next) loop(r.next);
    };
    sock.on("game:question", loop);
  };
  autoAnswer(p1, true);
  autoAnswer(p2, false);

  let sawIntermission = false;
  host.on("game:intermission", () => { sawIntermission = true; console.log("... jeda antar sesi"); });
  const over = new Promise((res) => host.on("game:over", res));

  host.emit("host:addBots");
  await wait(300);
  const st = await new Promise((res) => host.emit("host:start", res));
  check("host: start dengan konfigurasi", st.ok === true);
  console.log("game 2 sesi dimulai, menunggu selesai...");

  const { total } = await over;
  console.log("\n=== JUARA UMUM ===");
  total.forEach((p, i) => console.log(`#${i + 1} ${p.nama} — ${p.score} poin`));

  const ahmad = total.find((p) => p.nis === "1001");
  check("jeda antar sesi terjadi", sawIntermission);
  check("4 peserta (2 pemain + 2 bot)", total.length === 4);
  check("Ahmad juara umum (selalu benar, 2 sesi)", total[0].nis === "1001" && ahmad.score > 300);

  const ok = results.every(([, p]) => p);
  console.log(ok ? "\n🎉 SEMUA TES LOLOS" : "\n⚠️ ADA TES GAGAL");
  host.disconnect(); p1.disconnect(); p2.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
