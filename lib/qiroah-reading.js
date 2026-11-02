const VOWELS=Object.freeze({a:'َ',i:'ِ',u:'ُ'});
const vowelMarks=Object.fromEntries(Object.entries(VOWELS).map(([name,mark])=>[mark,name]));

function words(text){
  return [...text.matchAll(/[\p{Script=Arabic}\p{M}]+/gu)]
    .filter(match=>/[\p{Script=Arabic}]/u.test(match[0]))
    .map(match=>({start:match.index,end:match.index+match[0].length,word:match[0]}));
}
function finalVowel(word){
  const last=word.match(/[\p{L}][\p{M}]*$/u)?.[0]||'';
  const endings=last.match(/[\u064B-\u0650\u0652]/gu)||[];
  return endings.length===1?(vowelMarks[endings[0]]||null):null;
}
function validateTargets(text,targets){
  if(!Array.isArray(targets)||targets.length>30)throw new Error('Maksimal 30 target membaca per bacaan.');
  const tokens=words(text),found=new Set();
  return targets.map((target,index)=>{
    if(!target||typeof target!=='object'||Array.isArray(target))throw new Error('Target membaca tidak valid.');
    const {start,end,expected}=target;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>text.length)throw new Error('Posisi target membaca tidak valid.');
    const token=tokens.find(item=>item.start===start&&item.end===end);
    if(!token)throw new Error('Pilih satu kata utuh sebagai target membaca.');
    if(token.word.length>100||/ة[\p{M}]*$/u.test(token.word))throw new Error('Pilih kata pendek tanpa ta marbuthah pada tahap latihan ini.');
    if(found.has(start))throw new Error('Kata target membaca tidak boleh ganda.');
    found.add(start);
    if(!Object.hasOwn(VOWELS,expected)||finalVowel(token.word)!==expected)throw new Error('Harakat akhir target harus sesuai teks sumber: fathah, kasrah, atau dhammah.');
    const note=target.note===undefined?'':target.note;
    if(typeof note!=='string'||note.length>500||!note.isWellFormed())throw new Error('Catatan target membaca tidak valid.');
    return {start,end,expected,note:note.trim(),word:token.word,order:index};
  }).sort((a,b)=>a.start-b.start).map((item,index)=>({...item,order:index}));
}
function classify(result,expected,minConfidence=.6){
  if(!result||typeof result!=='object'||result.word_match!==true||!Number.isFinite(result.confidence)||result.confidence<minConfidence||result.confidence>1)return {kind:'uncertain',heard:null};
  if(result.ending==='none')return {kind:'waqf',heard:null};
  if(!Object.hasOwn(VOWELS,result.ending))return {kind:'uncertain',heard:null};
  return {kind:result.ending===expected?'correct':'wrong',heard:result.ending};
}
module.exports={VOWELS,words,finalVowel,validateTargets,classify};
