/**
 * Database SQLite (node:sqlite bawaan Node 24 — tanpa dependensi tambahan).
 *
 * Skema dirancang menyerupai struktur Siakad agar migrasi mudah:
 *   Program (nanti: tabel program Siakad)
 *     └─ MufrodatBab  (judul bab, urutan)
 *          └─ Mufrodat (arab + harakat, indonesia)
 */
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const qiroah = require('./qiroah');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "sprint.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS qiroah_texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul TEXT NOT NULL,
    teks TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS qiroah_spans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL REFERENCES qiroah_texts(id) ON DELETE CASCADE,
    start INTEGER NOT NULL CHECK(start >= 0),
    end INTEGER NOT NULL CHECK(end > start),
    jenis TEXT NOT NULL CHECK(jenis IN ('shigot', 'kalimat', 'irob', 'tanda_irob')),
    nilai TEXT NOT NULL,
    catatan TEXT NOT NULL DEFAULT '',
    CHECK(jenis != 'kalimat' OR nilai IN ('isim', 'fi''l', 'harf'))
  );
  CREATE INDEX IF NOT EXISTS qiroah_spans_text_id ON qiroah_spans(text_id);
  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS babs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    judul TEXT NOT NULL,
    urutan INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bab_id INTEGER NOT NULL REFERENCES babs(id) ON DELETE CASCADE,
    arab TEXT NOT NULL,
    indonesia TEXT NOT NULL
  );
`);

function seed() {
  const n = db.prepare("SELECT COUNT(*) AS c FROM programs").get().c;
  if (n > 0) return;
  console.log("🌱 Seed database mufrodat...");

  const { WORDS } = require("../data/words");
  // tema -> [program, bab]
  const MAP = {
    sekolah: ["I'dad Lughawi", "Bab 1 — Fi al-Madrasah (di Sekolah)"],
    rumah: ["I'dad Lughawi", "Bab 2 — Fi al-Bait (di Rumah)"],
    keluarga: ["Mutawassith", "Bab 1 — al-Usrah (Keluarga)"],
    alam: ["Mutawassith", "Bab 2 — al-Alam wa al-Waqt (Alam & Waktu)"],
    ibadah: ["Mutawassith", "Bab 3 — al-Masjid wa al-Ibadah"],
  };
  const progIds = {}, babIds = {};
  const insP = db.prepare("INSERT INTO programs (nama) VALUES (?)");
  const insB = db.prepare("INSERT INTO babs (program_id, judul, urutan) VALUES (?, ?, ?)");
  const insW = db.prepare("INSERT INTO words (bab_id, arab, indonesia) VALUES (?, ?, ?)");

  let urutan = 0;
  for (const w of WORDS) {
    const [prog, bab] = MAP[w.tema] || MAP.sekolah;
    if (!progIds[prog]) progIds[prog] = Number(insP.run(prog).lastInsertRowid);
    const bk = prog + "|" + bab;
    if (!babIds[bk]) babIds[bk] = Number(insB.run(progIds[prog], bab, urutan++).lastInsertRowid);
    insW.run(babIds[bk], w.ar, w.id);
  }
  console.log(`✅ Seed selesai: ${Object.keys(progIds).length} program, ${Object.keys(babIds).length} bab, ${WORDS.length} kata.`);
}
seed();

function getQiroahText(id) {
  qiroah.id(id);
  const text = db.prepare('SELECT id, judul, teks FROM qiroah_texts WHERE id = ?').get(id);
  if (!text) throw new Error('Teks Qiroah tidak ditemukan.');
  return { ...text, spans: db.prepare('SELECT id, text_id, start, end, jenis, nilai, catatan FROM qiroah_spans WHERE text_id = ? ORDER BY id').all(id) };
}
function saveQiroahText(payload) {
  const text = qiroah.validateSave(payload);
  db.exec('BEGIN IMMEDIATE');
  try {
    let id = text.id;
    if (id === undefined) {
      id = Number(db.prepare('INSERT INTO qiroah_texts (judul, teks) VALUES (?, ?)').run(text.judul, text.teks).lastInsertRowid);
    } else {
      if (!db.prepare('UPDATE qiroah_texts SET judul = ?, teks = ? WHERE id = ?').run(text.judul, text.teks, id).changes) throw new Error('Teks Qiroah tidak ditemukan.');
      db.prepare('DELETE FROM qiroah_spans WHERE text_id = ?').run(id);
    }
    const insert = db.prepare('INSERT INTO qiroah_spans (text_id, start, end, jenis, nilai, catatan) VALUES (?, ?, ?, ?, ?, ?)');
    for (const span of text.spans) insert.run(id, span.start, span.end, span.jenis, span.nilai, span.catatan);
    const saved = getQiroahText(id);
    db.exec('COMMIT');
    return saved;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = {
  listQiroahTexts: () => db.prepare('SELECT id, judul, teks FROM qiroah_texts ORDER BY id').all(),
  getQiroahText,
  saveQiroahText,
  deleteQiroahText: (id) => {
    qiroah.id(id);
    const deleted = db.prepare('DELETE FROM qiroah_texts WHERE id = ?').run(id).changes;
    if (!deleted) throw new Error('Teks Qiroah tidak ditemukan.');
    return deleted;
  },
  listPrograms: () =>
    db.prepare(`SELECT p.id, p.nama, COUNT(DISTINCT b.id) AS jml_bab, COUNT(w.id) AS jml_kata
      FROM programs p LEFT JOIN babs b ON b.program_id = p.id
      LEFT JOIN words w ON w.bab_id = b.id GROUP BY p.id ORDER BY p.id`).all(),

  getBabs: (programId) =>
    db.prepare(`SELECT b.id, b.judul, b.urutan, COUNT(w.id) AS jml_kata FROM babs b
      LEFT JOIN words w ON w.bab_id = b.id WHERE b.program_id = ?
      GROUP BY b.id ORDER BY b.urutan, b.id`).all(programId),

  getWords: (babId) =>
    db.prepare("SELECT id, arab, indonesia FROM words WHERE bab_id = ? ORDER BY id").all(babId),

  /** Pool kata dari beberapa bab (untuk game). */
  getPool: (babIds) => {
    if (!babIds.length) return [];
    const ph = babIds.map(() => "?").join(",");
    return db.prepare(`SELECT id, arab, indonesia FROM words WHERE bab_id IN (${ph})`).all(...babIds);
  },

  addProgram: (nama) => Number(db.prepare("INSERT INTO programs (nama) VALUES (?)").run(nama).lastInsertRowid),
  addBab: (programId, judul) => {
    const u = db.prepare("SELECT COALESCE(MAX(urutan), -1)+1 AS u FROM babs WHERE program_id = ?").get(programId).u;
    return Number(db.prepare("INSERT INTO babs (program_id, judul, urutan) VALUES (?, ?, ?)").run(programId, judul, u).lastInsertRowid);
  },
  addWord: (babId, arab, indonesia) =>
    Number(db.prepare("INSERT INTO words (bab_id, arab, indonesia) VALUES (?, ?, ?)").run(babId, arab, indonesia).lastInsertRowid),
  updateWord: (id, arab, indonesia) =>
    db.prepare("UPDATE words SET arab = ?, indonesia = ? WHERE id = ?").run(arab, indonesia, id).changes,
  deleteWord: (id) => db.prepare("DELETE FROM words WHERE id = ?").run(id).changes,
  updateBab: (id, judul) => db.prepare("UPDATE babs SET judul = ? WHERE id = ?").run(judul, id).changes,
  deleteBab: (id) => db.prepare("DELETE FROM babs WHERE id = ?").run(id).changes,
};
