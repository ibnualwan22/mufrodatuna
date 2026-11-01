// All positions are UTF-16 offsets into the original string, never normalized.
export const examples = {
  shigot: ['madhi', "mudhari'", 'amr', "ism fa'il", 'mashdar'],
  kalimat: ['isim', "fi'l", 'harf'],
  irob: ["fa'il", "maf'ul bih", "mubtada'", 'khabar'],
  tanda_irob: ['dhammah', 'fathah', 'kasrah', 'sukun', 'waw', 'alif', "ya'"],
};
export const labels = {shigot:'Shigot', kalimat:'Kalimat', irob:'I‘rob', tanda_irob:'Tanda i‘rob'};
export function tokens(text) {
  return Array.from(text.matchAll(/\s+|\S+/gu), m => ({text:m[0],start:m.index,end:m.index+m[0].length}));
}
export function groups(spans) {
  const result = new Map();
  for (const span of spans) {
    const key = `${span.start}:${span.end}`;
    if (!result.has(key)) result.set(key,{start:span.start,end:span.end,annotations:[]});
    result.get(key).annotations.push(span);
  }
  return [...result.values()];
}
export function segments(text, spans) {
  const points = [...new Set([0,text.length,...spans.flatMap(s=>[s.start,s.end])])].sort((a,b)=>a-b);
  return points.slice(0,-1).map((start,i)=>({start,end:points[i+1],text:text.slice(start,points[i+1]),active:spans.some(s=>s.start<=start && s.end>=points[i+1])}));
}
export function shuffle(values) {
  const copy=[...values];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
export function optionsFor(annotation, spans) {
  const same=[...new Set(spans.filter(s=>s.jenis===annotation.jenis).map(s=>s.nilai))].filter(v=>v!==annotation.nilai);
  const fallback=examples[annotation.jenis].filter(v=>v!==annotation.nilai&&!same.includes(v));
  return shuffle([annotation.nilai,...[...shuffle(same),...shuffle(fallback)].slice(0,3)]);
}
export function award(state, correct) {
  return {score:state.score+(correct?100:0),streak:correct?state.streak+1:0,best:Math.max(state.best,correct?state.streak+1:0)};
}
