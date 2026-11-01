const {randomUUID}=require('node:crypto');
const store=require('./quran-store');
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const reference=a=>`https://corpus.quran.com/wordmorphology.jsp?location=(${a.word_id})`;
function candidates(verse){return verse.annotations.filter(a=>a.start!==null&&!['disabled','needs_correction'].includes(a.status));}
function questions(verse){
  const grouped=new Map();for(const a of candidates(verse)){if(!grouped.has(a.segment_id))grouped.set(a.segment_id,[]);grouped.get(a.segment_id).push(a);}
  return [...grouped.values()].slice(0,12).map((rows,index)=>{
    const preferred=['pos','root','case','aspect','mood'][index%5];
    const a=rows.find(r=>r.field===preferred)||rows[index%rows.length];
    const pool=store.fields[a.field].choices||store.roots;
    const options=shuffle([a.effective,...shuffle(pool.filter(v=>v!==a.effective)).slice(0,3)]);
    return {id:a.id,field:a.field,label:store.fields[a.field].name,prompt:store.fields[a.field].prompt,word:verse.text.slice(a.start,a.end),segment:a.segment,start:a.start,end:a.end,location:a.segment_id,options,answer:a.effective,status:a.status,revision:a.revision,source:reference(a),explanation:a.override?`Koreksi admin: ${a.reason}`:`Acuan Corpus untuk bagian ini: ${a.effective}. ${a.field==='mood'?'Mood mudhari‘ tanpa penanda khusus dipetakan sebagai marfu‘ sesuai dokumentasi Corpus.':'Analisis berlaku untuk bagian yang ditandai, bukan otomatis untuk seluruh kata gabungan.'}`,reference:a.reference||''};
  });
}
function create(verse){const list=questions(verse);if(!list.length)throw new Error('Ayat ini belum memiliki analisis yang dapat dijadikan soal. Pilih ayat lain.');return {id:randomUUID(),verse:{id:verse.id,surahName:verse.surahName,text:verse.text},questions:list,index:0,results:[],feedback:null,touchedAt:Date.now(),version:store.importId};}
function snapshot(s){const q=s.questions[s.index];return {id:s.id,verse:s.verse,version:s.version,index:s.index,total:s.questions.length,score:s.results.filter(x=>x.correct).length*100,complete:!q,question:q?{...q,answer:undefined,explanation:undefined,reference:undefined}:null,feedback:s.feedback,results:!q?s.results:undefined};}
function answer(s,input){const q=s.questions[s.index];if(!q||input?.questionId!==q.id)throw new Error('Pertanyaan sudah berganti. Muat ulang sesi.');if(s.feedback)return snapshot(s);if(!q.options.includes(input.choice))throw new Error('Pilih salah satu jawaban yang tersedia.');s.feedback={correct:input.choice===q.answer,chosen:input.choice,answer:q.answer,explanation:q.explanation,reference:q.reference,source:q.source,status:q.status};s.results.push({word:q.word,segment:q.segment,label:q.label,...s.feedback});return snapshot(s);}
function next(s,input){const q=s.questions[s.index];if(!q||q.id!==input?.questionId||!s.feedback)throw new Error('Jawab pertanyaan ini sebelum melanjutkan.');s.index++;s.feedback=null;return snapshot(s);}
module.exports={candidates,questions,create,snapshot,answer,next};
