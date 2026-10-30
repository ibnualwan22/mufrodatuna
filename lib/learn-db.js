const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { normalizeArabic } = require('./normalize');
const filename = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'sprint.db');
fs.mkdirSync(path.dirname(filename), { recursive: true });
const db = new DatabaseSync(filename);
db.exec(`PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS learning_migrations (id TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS learning_programs (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS learning_chapters (
    id INTEGER PRIMARY KEY, program_id INTEGER NOT NULL REFERENCES learning_programs(id),
    title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', is_demo INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS learning_items (
    id INTEGER PRIMARY KEY, chapter_id INTEGER NOT NULL REFERENCES learning_chapters(id) ON DELETE CASCADE,
    arab TEXT NOT NULL, meaning TEXT NOT NULL, context TEXT NOT NULL DEFAULT '',
    pattern TEXT NOT NULL DEFAULT '', blank TEXT NOT NULL DEFAULT '', explanation TEXT NOT NULL DEFAULT '',
    alternatives TEXT NOT NULL DEFAULT '[]');
`);
const MODES = {
  choice: { name: 'Pilih Makna', categories: ['mufrodat', 'tabirot', 'uslub'], minimum: 2 },
  pairs: { name: 'Temukan Pasangan', categories: ['mufrodat'], minimum: 4 },
  listen: { name: 'Dengar & Temukan', categories: ['mufrodat', 'tabirot'], minimum: 2 },
  arrange: { name: 'Susun Kata', categories: ['mufrodat', 'tabirot', 'uslub'], minimum: 1 },
  dialogue: { name: 'Sambung Percakapan', categories: ['tabirot'], minimum: 2 },
  cloze: { name: 'Lengkapi Pola', categories: ['uslub'], minimum: 2 },
};
const text = (v, max = 500) => String(v || '').trim().slice(0, max);
function validateItem(input) {
  const result = Object.fromEntries(['arab', 'meaning', 'context', 'pattern', 'blank', 'explanation'].map(k => [k, text(input[k])]));
  if (!result.arab || !result.meaning) throw new Error('Teks Arab dan arti wajib diisi.');
  if (!/[\u0621-\u064A]/.test(result.arab)) throw new Error('Teks Arab harus memuat huruf Arab.');
  if (result.pattern || result.blank) {
    if (!result.blank || result.pattern.split('___').length !== 2) throw new Error('Pola harus memiliki tepat satu ___ dan jawaban isian.');
    if (normalizeArabic(result.pattern.replace('___', result.blank)) !== normalizeArabic(result.arab))
      throw new Error('Pola dan jawaban isian harus membentuk teks Arab yang sama.');
  }
  if (input.alternatives != null && (!Array.isArray(input.alternatives) || input.alternatives.some(a => typeof a !== 'string')))
    throw new Error('Variasi jawaban harus berupa daftar teks.');
  result.alternatives = (input.alternatives || []).map(a => text(a)).filter(Boolean).slice(0, 10);
  return result;
}
function addItem(chapterId, input) {
  const v = validateItem(input);
  return Number(db.prepare(`INSERT INTO learning_items
    (chapter_id,arab,meaning,context,pattern,blank,explanation,alternatives) VALUES (?,?,?,?,?,?,?,?)`)
    .run(chapterId, v.arab, v.meaning, v.context, v.pattern, v.blank, v.explanation, JSON.stringify(v.alternatives)).lastInsertRowid);
}
if (!db.prepare('SELECT id FROM learning_migrations WHERE id=?').get('demo-v1')) {
  db.exec('BEGIN');
  try {
    for (const program of require('../data/learning')) {
      const pid = db.prepare('INSERT INTO learning_programs (name,category) VALUES (?,?)').run(program.name, program.category).lastInsertRowid;
      for (const chapter of program.chapters) {
        const cid = db.prepare('INSERT INTO learning_chapters (program_id,title,description,is_demo) VALUES (?,?,?,1)').run(pid, chapter.title, chapter.description).lastInsertRowid;
        chapter.items.forEach(item => addItem(cid, item));
      }
    }
    db.prepare('INSERT INTO learning_migrations (id) VALUES (?)').run('demo-v1');
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
const items = id => db.prepare('SELECT * FROM learning_items WHERE chapter_id=? ORDER BY id').all(id)
  .map(item => ({ ...item, alternatives: JSON.parse(item.alternatives) }));
const chapter = id => db.prepare(`SELECT c.*,p.category,p.name AS program_name FROM learning_chapters c
  JOIN learning_programs p ON p.id=c.program_id WHERE c.id=?`).get(id);
const eligible = (list, mode) => {
  const ar=new Set(), meanings=new Set();
  return list.filter(item => {
    if(mode==='pairs') {
      const key=normalizeArabic(item.arab),meaning=item.meaning.toLowerCase().trim();
      if(ar.has(key)||meanings.has(meaning))return false;
      ar.add(key);meanings.add(meaning);return true;
    }
    return mode === 'dialogue' ? item.context : mode === 'cloze' ? item.pattern && item.blank : true;
  });
};
function catalog() {
  const programs = db.prepare('SELECT * FROM learning_programs ORDER BY id').all();
  const chapters = db.prepare('SELECT id FROM learning_chapters ORDER BY id').all().map(({ id }) => {
    const c = chapter(id), list = items(id);
    return { ...c, count: list.length, modes: Object.fromEntries(Object.entries(MODES)
      .filter(([,m]) => m.categories.includes(c.category)).map(([mode, m]) => {
        const candidates = eligible(list, mode);
        // Choice-based rounds require distinguishable answers.
        const unique = new Set(candidates.map(i => mode === 'dialogue' ? i.arab : mode === 'cloze' ? i.blank : i.meaning)).size;
        return [mode, candidates.length >= m.minimum && (mode === 'arrange' || unique >= m.minimum) ? candidates.length : 0];
      })) };
  });
  return { programs, chapters, modes: MODES };
}
module.exports = { MODES, catalog, chapter, items, eligible, validateItem, addItem,
  addProgram(input) {
    if (!text(input.name,100) || !['mufrodat','tabirot','uslub'].includes(input.category)) throw new Error('Nama dan kategori program wajib diisi.');
    return Number(db.prepare('INSERT INTO learning_programs (name,category) VALUES (?,?)').run(text(input.name,100),input.category).lastInsertRowid);
  },
  addChapter(input) {
    if (!text(input.title, 100)) throw new Error('Judul bab wajib diisi.');
    return Number(db.prepare('INSERT INTO learning_chapters (program_id,title,description) VALUES (?,?,?)')
      .run(Number(input.programId), text(input.title,100), text(input.description,200)).lastInsertRowid);
  },
  updateChapter(id, input) {
    if (!text(input.title,100)) throw new Error('Judul bab wajib diisi.');
    return db.prepare('UPDATE learning_chapters SET title=?,description=? WHERE id=?')
      .run(text(input.title,100),text(input.description,200),id).changes;
  },
  deleteChapter: id => db.prepare('DELETE FROM learning_chapters WHERE id=?').run(id).changes,
  updateItem(id, input) {
    const v = validateItem(input);
    return db.prepare('UPDATE learning_items SET arab=?,meaning=?,context=?,pattern=?,blank=?,explanation=?,alternatives=? WHERE id=?')
      .run(v.arab,v.meaning,v.context,v.pattern,v.blank,v.explanation,JSON.stringify(v.alternatives),id).changes;
  },
  deleteItem: id => db.prepare('DELETE FROM learning_items WHERE id=?').run(id).changes,
};
