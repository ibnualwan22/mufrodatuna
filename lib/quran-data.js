const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const directory = path.join(__dirname, '../public/quran-sources');
const alphabet = Object.fromEntries([..."'>&<}AbptvjHxd*rzs$SDTZEg_fqklmnhwYyFNKaui~o^#`{:@\"[;,.!-+%]"].map((c,i)=>[c,[...'ءأؤإئابةتثجحخدذرزسشصضطظعغـفقكلمنهوىيًٌٍَُِّْٰٓٔٱۣۜ۟۠ۢۥۦ۪ۭۨ۫۬'][i]]));
function arabic(value) { return [...value].map(c=>{if(c===' ')return c;if(!alphabet[c])throw new Error(`Buckwalter tidak dikenal: ${c}`);return alphabet[c];}).join(''); }
// Only compare normalized copies; displayed Quran text stays verbatim.
function skeleton(text) { return text.replace(/ـٔ/g,'ء').normalize('NFD').replace(/[\u0640\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/ٱ/g,'ا'); }
function load() {
  const sources = JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
  for(const source of sources) {
    const bytes=fs.readFileSync(path.join(directory,source.file));
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==source.sha256)throw new Error(`Checksum sumber Al-Qur’an berubah: ${source.file}`);
  }
  const metadata=fs.readFileSync(path.join(directory,'quran-data.xml'),'utf8');
  const surahs=[...metadata.matchAll(/<sura\s+([^>]+)\/>/g)].map(m=>{
    const a=Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
    return {id:Number(a.index),name:a.name,latin:a.tname,count:Number(a.ayas),type:a.type};
  });
  const verses=new Map();
  for(const line of fs.readFileSync(path.join(directory,'tanzil-uthmani-1.1.txt'),'utf8').split(/\r?\n/)) {
    const m=line.match(/^(\d+)\|(\d+)\|(.+)$/);if(!m)continue;
    verses.set(`${m[1]}:${m[2]}`,{surah:Number(m[1]),ayah:Number(m[2]),text:m[3],words:[]});
  }
  const words=new Map();
  for(const line of fs.readFileSync(path.join(directory,'corpus-morphology-0.4.txt'),'utf8').split(/\r?\n/)) {
    const m=line.match(/^\((\d+):(\d+):(\d+):(\d+)\)\t([^\t]+)\t([^\t]+)\t(.+)$/);if(!m)continue;
    const key=`${m[1]}:${m[2]}:${m[3]}`;
    if(!words.has(key)) {const word={id:key,position:Number(m[3]),segments:[],form:''};words.set(key,word);const verse=verses.get(`${m[1]}:${m[2]}`);if(!verse)throw new Error('Ayat Corpus tidak ditemukan di Tanzil');verse.words.push(word);}
    const segment={id:`${key}:${m[4]}`,index:Number(m[4]),form:arabic(m[5]),tag:m[6],features:m[7],raw:line};
    words.get(key).segments.push(segment);words.get(key).form+=segment.form;
  }
  let aligned=0;
  for(const verse of verses.values()) {
    const tokens=[...verse.text.matchAll(/\S+/gu)].filter(m=>/[\u0621-\u064a\u0671]/u.test(m[0]));
    if(verse.ayah===1&&verse.surah!==1&&verse.surah!==9&&tokens.length===verse.words.length+4)tokens.splice(0,4);
    let cursor=0;
    for(const word of verse.words) {
      let matched=0;
      for(let n=1;n<=3 && cursor+n<=tokens.length;n++) {
        if(skeleton(word.form).replace(/\s/g,'')===skeleton(tokens.slice(cursor,cursor+n).map(t=>t[0]).join(''))) {matched=n;break;}
      }
      if(matched) {word.start=tokens[cursor].index;const end=tokens[cursor+matched-1];word.end=end.index+end[0].length;word.display=verse.text.slice(word.start,word.end);cursor+=matched;}
      else if(tokens.length===verse.words.length)cursor++;
      else break;
    }
    verse.aligned=verse.words.every(w=>w.start!==undefined);
    if(verse.aligned)aligned++;
  }
  if(surahs.length!==114||verses.size!==6236||words.size<77000)throw new Error('Dataset Al-Qur’an tidak lengkap');
  return {sources,surahs,verses:[...verses.values()],aligned};
}
module.exports={load,arabic,skeleton};
