const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');
const path=require('node:path');
const {load,arabic,skeleton}=require('./quran-data');
const filename=process.env.DB_PATH||path.join(__dirname,'../data/sprint.db');
fs.mkdirSync(path.dirname(filename),{recursive:true});
const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
db.exec(`
CREATE TABLE IF NOT EXISTS quran_imports (id TEXT PRIMARY KEY, sources TEXT NOT NULL, imported_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quran_surahs (id INTEGER PRIMARY KEY, name TEXT NOT NULL, latin TEXT NOT NULL, count INTEGER NOT NULL, type TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quran_verses (id TEXT PRIMARY KEY, surah INTEGER NOT NULL REFERENCES quran_surahs(id), ayah INTEGER NOT NULL, text TEXT NOT NULL, aligned INTEGER NOT NULL, UNIQUE(surah,ayah));
CREATE TABLE IF NOT EXISTS quran_words (id TEXT PRIMARY KEY, verse_id TEXT NOT NULL REFERENCES quran_verses(id), position INTEGER NOT NULL, start INTEGER, end INTEGER, form TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quran_segments (id TEXT PRIMARY KEY, word_id TEXT NOT NULL REFERENCES quran_words(id), form TEXT NOT NULL, tag TEXT NOT NULL, features TEXT NOT NULL, raw TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quran_annotations (id TEXT PRIMARY KEY, segment_id TEXT NOT NULL REFERENCES quran_segments(id), field TEXT NOT NULL, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quran_reviews (annotation_id TEXT PRIMARY KEY REFERENCES quran_annotations(id), status TEXT NOT NULL, value TEXT, reason TEXT NOT NULL, reference TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quran_revisions (id INTEGER PRIMARY KEY, annotation_id TEXT NOT NULL REFERENCES quran_annotations(id), before_json TEXT NOT NULL, after_json TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quran_reports (id INTEGER PRIMARY KEY, annotation_id TEXT NOT NULL REFERENCES quran_annotations(id), session_id TEXT NOT NULL, reason TEXT NOT NULL, context TEXT NOT NULL, created_at TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, UNIQUE(annotation_id,session_id));
CREATE INDEX IF NOT EXISTS quran_words_verse ON quran_words(verse_id);
CREATE INDEX IF NOT EXISTS quran_segments_word ON quran_segments(word_id);
CREATE INDEX IF NOT EXISTS quran_annotations_segment ON quran_annotations(segment_id);
CREATE INDEX IF NOT EXISTS quran_revisions_annotation ON quran_revisions(annotation_id,id);
`);
const fields={pos:{name:'Jenis kata',prompt:'Termasuk jenis apakah bagian ini?',choices:['Isim','Fi‘il','Harf']},root:{name:'Akar kata',prompt:'Apa akar kata bagian ini?'},aspect:{name:'Bentuk fi‘il',prompt:'Apa bentuk fi‘il bagian ini?',choices:['Madhi','Mudhari‘','Amr']},case:{name:'Status i‘rab isim',prompt:'Bagaimana status i‘rab isim ini?',choices:['Marfu‘','Manshub','Majrur']},mood:{name:'Status fi‘il mudhari‘',prompt:'Bagaimana status fi‘il mudhari‘ ini?',choices:['Marfu‘','Manshub','Majzum']}};
function features(segment) {
  const f=segment.features.split('|'),result=[];
  if(['N','PN','ADJ','PRON','DEM','REL','T','LOC','IMPN'].includes(segment.tag))result.push(['pos','Isim']);
  else if(segment.tag==='V')result.push(['pos','Fi‘il']);
  else if(['P','CONJ','SUB','ACC','AMD','ANS','AVR','CAUS','CERT','CIRC','COM','EQ','EXH','EXL','EXP','FUT','INC','INT','NEG','PREV','PRO','REM','RES','RET','RSLT','SUP','SUR','VOC','EMPH','PRP','IMPV'].includes(segment.tag))result.push(['pos','Harf']);
  const root=f.find(x=>x.startsWith('ROOT:'));if(root)result.push(['root',[...arabic(root.slice(5))].join(' ')]);
  if(segment.tag==='V') {
    for(const [code,value] of [['PERF','Madhi'],['IMPF','Mudhari‘'],['IMPV','Amr']])if(f.includes(code))result.push(['aspect',value]);
    if(f.includes('IMPF'))result.push(['mood',f.includes('SUBJ')?'Manshub':f.includes('JUS')?'Majzum':'Marfu‘']);
  } else for(const [code,value] of [['NOM','Marfu‘'],['ACC','Manshub'],['GEN','Majrur']])if(f.includes(code))result.push(['case',value]);
  return result;
}
const importId='qac-0.4-tanzil-1.1-v1';
if(!db.prepare('SELECT 1 FROM quran_imports WHERE id=?').get(importId)) {
  const data=load();
  // Different releases must use an explicit migration, never overwrite reviews.
  if(db.prepare('SELECT COUNT(*) n FROM quran_imports').get().n)throw new Error('Versi dataset Al-Qur’an perlu migrasi terpisah.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const surah=db.prepare('INSERT INTO quran_surahs VALUES (?,?,?,?,?)'),verse=db.prepare('INSERT INTO quran_verses VALUES (?,?,?,?,?)'),word=db.prepare('INSERT INTO quran_words VALUES (?,?,?,?,?,?)'),segment=db.prepare('INSERT INTO quran_segments VALUES (?,?,?,?,?,?)'),annotation=db.prepare('INSERT INTO quran_annotations VALUES (?,?,?,?)');
    for(const s of data.surahs)surah.run(s.id,s.name,s.latin,s.count,s.type);
    for(const v of data.verses) {
      const key=`${v.surah}:${v.ayah}`;verse.run(key,v.surah,v.ayah,v.text,Number(v.aligned));
      for(const w of v.words) {word.run(w.id,key,w.position,w.start??null,w.end??null,w.form);
        for(const s of w.segments) {segment.run(s.id,w.id,s.form,s.tag,s.features,s.raw);
          for(const [field,value] of features(s))annotation.run(`${s.id}/${field}`,s.id,field,value);
        }
      }
    }
    db.prepare('INSERT INTO quran_imports VALUES (?,?,?)').run(importId,JSON.stringify(data.sources),new Date().toISOString());db.exec('COMMIT');
  } catch(e){db.exec('ROLLBACK');throw e;}
}
function positive(value,max) {const n=Number(value);if(!Number.isInteger(n)||n<1||n>max)throw new Error('Nomor surah atau ayat tidak valid.');return n;}
function surahs(){return db.prepare('SELECT * FROM quran_surahs ORDER BY id').all();}
const annotationSql=`SELECT a.*,s.form segment,s.tag,s.features,w.id word_id,w.position,w.start,w.end,w.form word,
r.status,r.value override,r.reason,r.reference,r.revision,r.updated_at
FROM quran_annotations a JOIN quran_segments s ON s.id=a.segment_id JOIN quran_words w ON w.id=s.word_id
LEFT JOIN quran_reviews r ON r.annotation_id=a.id`;
function effective(a){return {...a,status:a.status||'source',revision:a.revision||0,effective:a.override??a.value};}
const basmalah=skeleton(db.prepare('SELECT text FROM quran_verses WHERE id=?').get('1:1').text);
function verse(surah,ayah){
  const s=positive(surah,114),a=positive(ayah,286),v=db.prepare('SELECT * FROM quran_verses WHERE surah=? AND ayah=?').get(s,a);
  if(!v)throw new Error('Ayat tidak ditemukan.');
  // Hide only the unnumbered opening; keep source text and stored offsets intact.
  const opening=s!==1&&a===1?v.text.match(/^(?:\S+\s+){4}/u)?.[0]:null;
  const offset=opening&&skeleton(opening.trim())===basmalah?opening.length:0;
  const annotations=db.prepare(annotationSql+' WHERE w.verse_id=? ORDER BY w.position,s.id,a.field').all(v.id).map(row=>{
    const mapped=row.start!==null&&row.start>=offset;
    return effective({...row,start:mapped?row.start-offset:null,end:mapped?row.end-offset:null});
  });
  return {...v,text:v.text.slice(offset),surahName:db.prepare('SELECT latin FROM quran_surahs WHERE id=?').get(s).latin,annotations};
}
const randomVerseQuery=db.prepare(`SELECT v.surah,v.ayah FROM quran_verses v WHERE v.id<>? AND EXISTS (
  SELECT 1 FROM quran_words w JOIN quran_segments s ON s.word_id=w.id
  JOIN quran_annotations a ON a.segment_id=s.id LEFT JOIN quran_reviews r ON r.annotation_id=a.id
  WHERE w.verse_id=v.id AND w.start IS NOT NULL AND (r.status IS NULL OR r.status NOT IN ('disabled','needs_correction'))
) ORDER BY random() LIMIT 1`);
function randomVerse(exclude=''){
  if(typeof exclude!=='string'||(exclude&&!/^\d{1,3}:\d{1,3}$/.test(exclude)))throw new Error('Referensi ayat sebelumnya tidak valid.');
  const selected=randomVerseQuery.get(exclude)||(exclude?randomVerseQuery.get(''):null);
  if(!selected)throw new Error('Belum ada ayat dengan soal aktif untuk mode acak.');
  return verse(selected.surah,selected.ayah);
}
function sources(){return JSON.parse(db.prepare('SELECT sources FROM quran_imports WHERE id=?').get(importId).sources);}
function text(value,max,required=false){if(typeof value!=='string'||value.length>max||!value.isWellFormed()||(required&&!value.trim()))throw new Error('Isi koreksi atau rujukan tidak valid.');return value.trim();}
function validateValue(field,value) {
  const v=text(value,80,true);
  if(fields[field].choices&&!fields[field].choices.includes(v))throw new Error('Nilai koreksi tidak sesuai jenis analisis.');
  if(field==='root'&&!/^[\u0621-\u063a\u0641-\u064a]( [\u0621-\u063a\u0641-\u064a]){1,4}$/.test(v))throw new Error('Tulis akar dengan huruf Arab terpisah, misalnya ك ت ب.');
  return v;
}
function review(id,input){
  if(!input||typeof input!=='object'||!['source','verified','needs_correction','disabled'].includes(input.status))throw new Error('Status verifikasi tidak valid.');
  const original=db.prepare('SELECT * FROM quran_annotations WHERE id=?').get(id);if(!original)throw new Error('Analisis tidak ditemukan.');
  if(!Number.isSafeInteger(input.revision)||input.revision<0)throw new Error('Versi koreksi tidak valid.');
  const reason=text(input.reason,1500,true),reference=text(input.reference,1000,true);
  const value=input.value===null||input.value===undefined||input.value===''?null:validateValue(original.field,input.value);
  if(value!==null&&input.status!=='verified')throw new Error('Koreksi jawaban harus diverifikasi sebelum dipakai.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const before=db.prepare('SELECT * FROM quran_reviews WHERE annotation_id=?').get(id)||null;
    if((before?.revision||0)!==input.revision)throw new Error('Analisis sudah berubah. Muat ulang sebelum menyimpan.');
    const now=new Date().toISOString(),after={annotation_id:id,status:input.status,value,reason,reference,revision:input.revision+1,updated_at:now};
    db.prepare(`INSERT INTO quran_reviews VALUES (?,?,?,?,?,?,?) ON CONFLICT(annotation_id) DO UPDATE SET status=excluded.status,value=excluded.value,reason=excluded.reason,reference=excluded.reference,revision=excluded.revision,updated_at=excluded.updated_at`).run(id,after.status,value,reason,reference,after.revision,now);
    db.prepare('INSERT INTO quran_revisions (annotation_id,before_json,after_json,actor,created_at) VALUES (?,?,?,?,?)').run(id,JSON.stringify(before),JSON.stringify(after),'admin lokal',now);db.prepare('UPDATE quran_reports SET resolved=1 WHERE annotation_id=?').run(id);db.exec('COMMIT');return after;
  }catch(e){db.exec('ROLLBACK');throw e;}
}
function history(id){return db.prepare('SELECT * FROM quran_revisions WHERE annotation_id=? ORDER BY id DESC LIMIT 30').all(id).map(r=>({...r,before:JSON.parse(r.before_json),after:JSON.parse(r.after_json),before_json:undefined,after_json:undefined}));}
function restore(id,input){const h=db.prepare('SELECT * FROM quran_revisions WHERE id=? AND annotation_id=?').get(input.historyId,id);if(!h)throw new Error('Riwayat tidak ditemukan.');const previous=JSON.parse(h.before_json);return review(id,{status:previous?.status||'source',value:previous?.value??null,revision:input.revision,reason:`Pulihkan sebelum revisi ${input.historyId}: ${text(input.reason,1000,true)}`,reference:previous?.reference||'Riwayat verifikasi Mufrodatuna'});}
const roots=db.prepare("SELECT DISTINCT value FROM quran_annotations WHERE field='root' ORDER BY value").all().map(r=>r.value);
function report(session,question,reason){const message=text(reason,1000,true);db.prepare('INSERT OR IGNORE INTO quran_reports (annotation_id,session_id,reason,context,created_at) VALUES (?,?,?,?,?)').run(question.id,session.id,message,JSON.stringify({verse:session.verse.id,answer:question.answer,revision:question.revision,version:session.version}),new Date().toISOString());return {ok:true};}
function reports(){return db.prepare('SELECT id,annotation_id,reason,context,created_at FROM quran_reports WHERE resolved=0 ORDER BY id DESC LIMIT 100').all().map(r=>({...r,context:JSON.parse(r.context)}));}
module.exports={surahs,verse,randomVerse,sources,fields,review,history,restore,roots,importId,report,reports};
