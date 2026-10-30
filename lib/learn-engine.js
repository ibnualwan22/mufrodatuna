const { randomUUID } = require('node:crypto');
const { isCorrect } = require('./normalize');
const shuffle = a => {
  const result = [...a];
  for (let i=result.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
};
const options = (value, values) => shuffle([value,...shuffle([...new Set(values.filter(v=>v!==value))]).slice(0,3)])
  .map(text=>({id:randomUUID(),text}));
function question(item, pool, mode) {
  const q = { id: randomUUID(), mode, item, itemIds:[item.id] };
  const pub = { id:q.id, mode, meaning:item.meaning };
  if (mode === 'choice' || mode === 'listen' || mode === 'dialogue') delete pub.meaning;
  if (mode === 'pairs') {
    q.items = pool;
    q.itemIds = pool.map(i=>i.id);
    q.links = new Map(); q.matched = []; q.wrong = false;
    q.seenPairs = new Map();
    pub.left = pool.map(i=>{const id=randomUUID();q.links.set(id,i);return {id,text:i.arab};});
    pub.right = shuffle(pool.map(i=>({id:randomUUID(),text:i.meaning,itemId:i.id})));
    q.right = new Map(pub.right.map(i=>[i.id,i.itemId]));
    pub.right = pub.right.map(({id,text})=>({id,text}));
    delete pub.meaning;
  } else if (mode === 'arrange') {
    const words = item.arab.trim().split(/\s+/);
    pub.separator = words.length > 1 ? ' ' : '';
    const tiles = words.length > 1 ? words : [...new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(item.arab)].map(s=>s.segment);
    pub.tiles = shuffle(tiles.map(text=>({id:randomUUID(),text})));
    q.answer = item.arab; q.lang='ar';
  } else {
    q.answer = mode === 'dialogue' ? item.arab : mode === 'cloze' ? item.blank : item.meaning;
    q.lang = ['dialogue','cloze'].includes(mode) ? 'ar' : 'id';
    pub.prompt = mode === 'dialogue' ? item.context : mode === 'cloze' ? item.pattern : item.arab;
    pub.options = options(q.answer, pool.map(i=>mode==='dialogue'?i.arab:mode==='cloze'?i.blank:i.meaning));
    pub.answerLang = q.lang;
    if (mode === 'listen') pub.audioText = item.arab;
  }
  q.public = pub;
  return q;
}
function createSession(chapter, items, mode) {
  const chosen = shuffle(items).slice(0,8);
  const questions = mode === 'pairs' ? Array.from({length:Math.ceil(chosen.length/4)},(_,i)=>{
    const group=chosen.slice(i*4,i*4+4);return question(group[0],group,mode);
  }) : chosen.map(item=>question(item,items,mode));
  return { id:randomUUID(), chapter:{id:chapter.id,title:chapter.title,category:chapter.category}, mode,
    questions, index:0, score:0, createdAt:Date.now(), touchedAt:Date.now(), lastAdvanced:null };
}
function snapshot(s) {
  const done = s.index >= s.questions.length;
  return { sessionId:s.id, chapter:s.chapter, mode:s.mode, index:s.index, total:s.questions.length, score:s.score, done,
    question:done?null:{...s.questions[s.index].public,matched:s.questions[s.index].matched || []},
    feedback:done?null:s.questions[s.index].result || null,
    result:done?{
      correct:s.questions.filter(q=>q.result.correct&&!q.result.skipped).length,
      skipped:s.questions.filter(q=>q.result.skipped).length,
      total:s.questions.length, score:s.score,
      studied:new Set(s.questions.filter(q=>!q.result.skipped).flatMap(q=>q.itemIds)).size,
      review:s.questions.filter(q=>!q.result.correct&&!q.result.skipped).flatMap(q=>q.items || [q.item])
        .map(i=>({id:i.id,arab:i.arab,meaning:i.meaning,explanation:i.explanation})),
    }:null };
}
function current(s, id) {
  if (s.index>=s.questions.length || s.questions[s.index].id!==id) throw new Error('Soal sudah berubah. Muat ulang sesi untuk melanjutkan.');
  return s.questions[s.index];
}
function finish(s,q,correct,skipped=false) {
  if (q.result) return q.result;
  const points=correct&&!skipped?(q.mode==='pairs'?q.items.length*10:10):0;
  s.score+=points;
  q.result={correct,skipped,points,score:s.score,arab:q.item.arab,meaning:q.item.meaning,
    explanation:q.item.explanation || (q.mode==='pairs'?'Semua pasangan sudah ditemukan.':`${q.item.arab} — ${q.item.meaning}`)};
  return q.result;
}
function answer(s, data) {
  const q=current(s,data.questionId);
  if (q.result) return q.result;
  if (data.skip && q.mode==='listen') return finish(s,q,false,true);
  if (q.mode==='pairs') throw new Error('Pilih dua kartu untuk dipasangkan.');
  let value;
  if(q.mode==='arrange') {
    if (!Array.isArray(data.tiles) || data.tiles.length!==q.public.tiles.length || new Set(data.tiles).size!==data.tiles.length)
      throw new Error('Susun semua kepingan terlebih dahulu.');
    const tiles=new Map(q.public.tiles.map(t=>[t.id,t.text]));
    if(data.tiles.some(id=>!tiles.has(id))) throw new Error('Kepingan tidak valid.');
    value=data.tiles.map(id=>tiles.get(id)).join(q.public.separator);
  } else {
    value=q.public.options.find(o=>o.id===data.optionId)?.text;
    if(value===undefined) throw new Error('Pilih salah satu jawaban.');
  }
  const accepted=[q.answer,...(q.mode==='arrange'?q.item.alternatives:[])];
  return finish(s,q,accepted.some(expected=>isCorrect(value,expected,q.lang)));
}
function pair(s,data) {
  const q=current(s,data.questionId);
  if(q.mode!=='pairs') throw new Error('Soal ini bukan pasangan kartu.');
  const key=`${data.left}:${data.right}`;
  if(q.seenPairs.has(key)) return {...q.seenPairs.get(key),feedback:q.result || null};
  const item=q.links.get(data.left), right=q.right.get(data.right);
  if(!item || !right) throw new Error('Kartu tidak ditemukan.');
  if(q.result || q.matched.some(p=>p.left===data.left||p.right===data.right)) throw new Error('Kartu ini sudah dipasangkan.');
  const correct=item.id===right;
  if(correct) q.matched.push({left:data.left,right:data.right});
  else q.wrong=true;
  const feedback=q.matched.length===q.items.length?finish(s,q,!q.wrong):null;
  const result={correct,matched:q.matched.map(p=>({...p})),feedback};
  q.seenPairs.set(key,result);
  return result;
}
function next(s,id) {
  if(s.lastAdvanced===id) return snapshot(s);
  const q=current(s,id);
  if(!q.result) throw new Error('Jawab soal sebelum melanjutkan.');
  s.lastAdvanced=id;s.index++;
  return snapshot(s);
}
module.exports={createSession,snapshot,answer,pair,next};
