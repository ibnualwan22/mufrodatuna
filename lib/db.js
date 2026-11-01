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
    teks TEXT NOT NULL,
    bab TEXT NOT NULL DEFAULT 'Materi sebelumnya',
    urutan INTEGER NOT NULL DEFAULT 0,
    versi INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS qiroah_spans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL REFERENCES qiroah_texts(id) ON DELETE CASCADE,
    start INTEGER NOT NULL CHECK(start >= 0),
    end INTEGER NOT NULL CHECK(end > start),
    jenis TEXT NOT NULL CHECK(jenis IN ('shigot', 'kalimat', 'irob', 'tanda_irob')),
    nilai TEXT NOT NULL,
    catatan TEXT NOT NULL DEFAULT '',
    detektif_salah TEXT NOT NULL DEFAULT '',
    detektif_koreksi TEXT NOT NULL DEFAULT '',
    CHECK(jenis != 'kalimat' OR nilai IN ('isim', 'fi''l', 'harf'))
  );
  CREATE INDEX IF NOT EXISTS qiroah_spans_text_id ON qiroah_spans(text_id);
  CREATE TABLE IF NOT EXISTS qiroah_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    span_id INTEGER NOT NULL REFERENCES qiroah_spans(id) ON DELETE CASCADE,
    urutan INTEGER NOT NULL DEFAULT 0,
    judul TEXT NOT NULL,
    isi TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS qiroah_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL REFERENCES qiroah_texts(id) ON DELETE CASCADE,
    jenis TEXT NOT NULL,
    dari TEXT NOT NULL,
    ke TEXT NOT NULL,
    label TEXT NOT NULL,
    catatan TEXT NOT NULL DEFAULT ''
  );
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

// Additive migration for databases created before chapter and revision support.
const textColumns = new Set(db.prepare('PRAGMA table_info(qiroah_texts)').all().map(c => c.name));
for (const [name, sql] of [['bab', "TEXT NOT NULL DEFAULT 'Materi sebelumnya'"], ['urutan', 'INTEGER NOT NULL DEFAULT 0'], ['versi', 'INTEGER NOT NULL DEFAULT 1']]) {
  if (!textColumns.has(name)) db.exec(`ALTER TABLE qiroah_texts ADD COLUMN ${name} ${sql}`);
}
const spanColumns = new Set(db.prepare('PRAGMA table_info(qiroah_spans)').all().map(c => c.name));
for (const [name, sql] of [['detektif_salah', "TEXT NOT NULL DEFAULT ''"], ['detektif_koreksi', "TEXT NOT NULL DEFAULT ''"]]) {
  if (!spanColumns.has(name)) db.exec(`ALTER TABLE qiroah_spans ADD COLUMN ${name} ${sql}`);
}
// Preserve legacy single notes as editable dynamic note records.
db.exec(`INSERT INTO qiroah_notes (span_id,urutan,judul,isi)
  SELECT s.id,0,CASE s.jenis WHEN 'shigot' THEN 'Shigot' WHEN 'kalimat' THEN 'Kalimat' WHEN 'irob' THEN 'I‘rob' ELSE 'Tanda i‘rob' END,s.catatan
  FROM qiroah_spans s WHERE TRIM(s.catatan)<>'' AND NOT EXISTS (SELECT 1 FROM qiroah_notes n WHERE n.span_id=s.id)`);

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
  const text = db.prepare('SELECT id, judul, teks, bab, urutan, versi FROM qiroah_texts WHERE id = ?').get(id);
  if (!text) throw new Error('Teks Qiroah tidak ditemukan.');
  const spans = db.prepare('SELECT id, text_id, start, end, jenis, nilai, catatan, detektif_salah, detektif_koreksi FROM qiroah_spans WHERE text_id = ? ORDER BY id').all(id);
  const notes = db.prepare('SELECT n.id, n.span_id, n.urutan, n.judul, n.isi FROM qiroah_notes n JOIN qiroah_spans s ON s.id=n.span_id WHERE s.text_id=? ORDER BY n.urutan,n.id').all(id);
  const bySpan = new Map();
  for (const note of notes) { if (!bySpan.has(note.span_id)) bySpan.set(note.span_id, []); bySpan.get(note.span_id).push(note); }
  return { ...text, spans: spans.map(s => ({ ...s, notes: bySpan.get(s.id) || [] })), relations: db.prepare('SELECT id, jenis, dari, ke, label, catatan FROM qiroah_relations WHERE text_id=? ORDER BY id').all(id) };
}
function saveQiroahText(payload) {
  const text = qiroah.validateSave(payload);
  db.exec('BEGIN IMMEDIATE');
  try {
    let id = text.id;
    if (id === undefined) {
      id = Number(db.prepare('INSERT INTO qiroah_texts (judul, teks, bab, urutan) VALUES (?, ?, ?, COALESCE((SELECT MAX(urutan)+1 FROM qiroah_texts WHERE bab=?),0))').run(text.judul, text.teks, text.bab, text.bab).lastInsertRowid);
    } else {
      const previous = db.prepare('SELECT teks, versi FROM qiroah_texts WHERE id=?').get(id);
      if (!previous) throw new Error('Teks Qiroah tidak ditemukan.');
      if (previous.teks !== text.teks) for (const span of text.spans) {
        if (!span.id) continue;
        const old = db.prepare('SELECT start,end FROM qiroah_spans WHERE id=? AND text_id=?').get(span.id,id);
        if (!old) continue;
        const priorSlice=previous.teks.slice(old.start,old.end),nextSlice=text.teks.slice(span.start,span.end);
        if (priorSlice!==nextSlice) throw new Error('Salah satu anotasi berubah bersama teksnya. Pilih ulang bagian itu sebagai anotasi baru agar catatan dan hubungan tidak bergeser.');
      }
      db.prepare('UPDATE qiroah_texts SET judul=?, teks=?, bab=?, versi=versi+? WHERE id=?').run(text.judul, text.teks, text.bab, previous.teks === text.teks ? 0 : 1, id);
    }
    const kept = new Set();
    for (const span of text.spans) {
      let spanId = span.id;
      if (spanId && db.prepare('SELECT id FROM qiroah_spans WHERE id=? AND text_id=?').get(spanId,id)) {
        db.prepare('UPDATE qiroah_spans SET start=?,end=?,jenis=?,nilai=?,catatan=?,detektif_salah=?,detektif_koreksi=? WHERE id=?').run(span.start,span.end,span.jenis,span.nilai,span.catatan,span.detektifSalah,span.detektifKoreksi,spanId);
      } else {
        spanId = Number(db.prepare('INSERT INTO qiroah_spans (text_id,start,end,jenis,nilai,catatan,detektif_salah,detektif_koreksi) VALUES (?,?,?,?,?,?,?,?)').run(id,span.start,span.end,span.jenis,span.nilai,span.catatan,span.detektifSalah,span.detektifKoreksi).lastInsertRowid);
      }
      kept.add(spanId);
      const priorNotes = db.prepare('SELECT id FROM qiroah_notes WHERE span_id=?').all(spanId).map(n=>n.id);
      const keptNotes = new Set();
      span.notes.forEach((note,index)=>{
        if (note.id && priorNotes.includes(note.id)) { db.prepare('UPDATE qiroah_notes SET urutan=?,judul=?,isi=? WHERE id=?').run(index,note.judul,note.isi,note.id); keptNotes.add(note.id); }
        else { const noteId=Number(db.prepare('INSERT INTO qiroah_notes (span_id,urutan,judul,isi) VALUES (?,?,?,?)').run(spanId,index,note.judul,note.isi).lastInsertRowid); keptNotes.add(noteId); }
      });
      for (const noteId of priorNotes) if(!keptNotes.has(noteId)) db.prepare('DELETE FROM qiroah_notes WHERE id=?').run(noteId);
    }
    const oldSpans = db.prepare('SELECT id FROM qiroah_spans WHERE text_id=?').all(id).map(s=>s.id);
    for (const spanId of oldSpans) if(!kept.has(spanId)) db.prepare('DELETE FROM qiroah_spans WHERE id=?').run(spanId);
    const keptRelations=new Set();
    for(const relation of text.relations){
      for(const endpoint of [relation.dari,relation.ke]){
        const value=String(endpoint);
        if(value.startsWith('taqdir:'))continue;
        if(!Number.isSafeInteger(Number(value))||!kept.has(Number(value)))throw new Error('Hubungan merujuk ke anotasi yang belum ada atau sudah dihapus. Periksa kembali bagian yang terhubung.');
      }
      if(relation.id&&db.prepare('SELECT id FROM qiroah_relations WHERE id=? AND text_id=?').get(relation.id,id)){
        db.prepare('UPDATE qiroah_relations SET jenis=?,dari=?,ke=?,label=?,catatan=? WHERE id=?').run(relation.jenis,String(relation.dari),String(relation.ke),relation.label,relation.catatan,relation.id);keptRelations.add(relation.id);
      }else{const rid=Number(db.prepare('INSERT INTO qiroah_relations (text_id,jenis,dari,ke,label,catatan) VALUES (?,?,?,?,?,?)').run(id,relation.jenis,String(relation.dari),String(relation.ke),relation.label,relation.catatan).lastInsertRowid);keptRelations.add(rid);}
    }
    const oldRelations=db.prepare('SELECT id FROM qiroah_relations WHERE text_id=?').all(id).map(r=>r.id);
    for(const rid of oldRelations)if(!keptRelations.has(rid))db.prepare('DELETE FROM qiroah_relations WHERE id=?').run(rid);
    const saved = getQiroahText(id);
    db.exec('COMMIT');
    return saved;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Insert the requested practice passage once per database. A marker keeps an
// intentional admin deletion from being undone on the next server restart.
db.exec('CREATE TABLE IF NOT EXISTS qiroah_seed_state (name TEXT PRIMARY KEY)');
if (!db.prepare('SELECT 1 FROM qiroah_seed_state WHERE name=?').get('air-bersuci-v1')) {
  const example = require('../data/qiroah-example');
  if (!db.prepare('SELECT 1 FROM qiroah_texts WHERE judul=? AND teks=?').get(example.judul, example.teks)) {
    saveQiroahText(example);
  }
  db.prepare('INSERT INTO qiroah_seed_state (name) VALUES (?)').run('air-bersuci-v1');
}

module.exports = {
  listQiroahTexts: () => db.prepare('SELECT id, judul, teks, bab, urutan, versi FROM qiroah_texts ORDER BY bab,urutan,id').all(),
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
