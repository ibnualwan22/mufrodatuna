const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');

process.env.DB_PATH=join(mkdtempSync(join(tmpdir(),'qiroah-reading-')),'reading.db');
const db=require('../lib/db');
const {words,finalVowel,validateTargets,classify}=require('../lib/qiroah-reading');
const {ReadingSessions}=require('../lib/qiroah-sessions');

test('target admin memakai satu kata lengkap, harakat akhir sumber, revisi, dan versi teks',()=>{
  const text='كَتَبَ الطَّالِبُ الدَّرْسَ بِالْقَلَمِ.';
  const tokens=words(text);
  assert.equal(tokens.length,4);
  assert.equal(db.listQiroahTexts().filter(t=>t.bab==='Latihan I‘rab Suara').length,10);
  assert.deepEqual(tokens.slice(1).map(t=>finalVowel(t.word)),['u','a','i']);
  const sample=db.listQiroahTexts().find(t=>t.judul==='Pelajar Menulis');
  const config=db.getQiroahReading(sample.id,true);
  assert.equal(config.ready,true);
  assert.equal(config.targets.length,3);
  assert.deepEqual(config.targets.map(t=>t.word),tokens.slice(1).map(t=>t.word));
  assert.throws(()=>validateTargets(text,[{...tokens[1],end:tokens[1].end-1,expected:'u'}]),/kata utuh/);
  assert.throws(()=>validateTargets(text,[{...tokens[1],expected:'a'}]),/Harakat akhir/);
  const edited=db.saveQiroahReading({id:sample.id,revision:config.revision,sourceVersion:sample.versi,
    targets:config.targets.map((t,i)=>({start:t.start,end:t.end,expected:t.expected,note:`Catatan ${i}`}))});
  assert.equal(edited.revision,config.revision+1);
  assert.deepEqual(edited.targets.map(t=>t.id),config.targets.map(t=>t.id));
  assert.throws(()=>db.saveQiroahReading({id:sample.id,revision:config.revision,sourceVersion:sample.versi,targets:[]}),/sudah berubah/);
  const changed=db.saveQiroahText({id:sample.id,judul:sample.judul,bab:sample.bab,teks:sample.teks+' وَالْحِبْرِ',spans:[],relations:[]});
  assert.equal(db.getQiroahReading(sample.id).ready,false);
  assert.throws(()=>db.saveQiroahReading({id:sample.id,revision:edited.revision,sourceVersion:sample.versi,targets:[]}),/Versi bacaan/);
  assert.equal(changed.versi,sample.versi+1);
});

test('huruf hamza dipertahankan; urutan shadda tidak mengubah acuan, tanwin ditolak',async()=>{
  const display=await import('../public/qiroah-reading-text.mjs');
  assert.equal(display.hideVowels('ا\u0654َكَلَ ا\u0655ِبْنُ'), 'ا\u0654كل ا\u0655بن');
  for(const word of ['حَقُّ','حَقُّ','حَقٌّ','حَقّْ'])assert.equal(display.finalVowel(word),finalVowel(word));
  assert.equal(finalVowel('حَقُّ'),'u');assert.equal(finalVowel('حَقٌّ'),null);
  assert.throws(()=>validateTargets('شَجَرَةُ',[{start:0,end:8,expected:'u'}]));
});

test('hasil model tidak dipaksa menjadi benar; waqaf menahan dan salah lanjut',async()=>{
  const sample=db.listQiroahTexts().find(t=>t.judul==='Air yang Dapat Dipakai Bersuci');
  const text=db.saveQiroahText({judul:'Tes suara',bab:'Tes',teks:'الطَّالِبُ الدَّرْسَ',spans:[],relations:[]});
  const source=words(text.teks);
  db.saveQiroahReading({id:text.id,revision:0,sourceVersion:text.versi,targets:source.map((t,i)=>({start:t.start,end:t.end,expected:['u','a'][i],note:'Catatan'}))});
  let evidence=[{word_match:true,confidence:.9,ending:'none'},{word_match:true,confidence:.9,ending:'i'},{word_match:true,confidence:.9,ending:'a'}];
  const fetcher=async(url,options)=>{
    if(url.endsWith('/health'))return {ok:true,json:async()=>({ready:true})};
    assert.doesNotMatch(JSON.parse(options.body).word,/[\u064B-\u0652]/u);
    return {ok:true,json:async()=>evidence.shift()};
  };
  const sessions=new ReadingSessions(db,{fetcher});
  try{
    const first=await sessions.start('owner',text.id);
    assert.equal(first.target.word,source[0].word);
    assert.equal(first.target.expected,undefined);
    assert.throws(()=>sessions.audio('other',{id:first.id,attempt:1,seq:0,samples:Buffer.alloc(8000)}),/berakhir/);
    const packet=Buffer.alloc(8000);
    sessions.audio('owner',{id:first.id,attempt:1,seq:0,samples:packet});
    assert.throws(()=>sessions.audio('owner',{id:first.id,attempt:1,seq:2,samples:packet}),/Urutan/);
    const waqf=await sessions.analyze('owner',{id:first.id,attempt:1});
    assert.equal(waqf.decision.kind,'waqf');assert.equal(waqf.session.index,0);
    sessions.audio('owner',{id:first.id,attempt:2,seq:0,samples:packet});
    const wrong=await sessions.analyze('owner',{id:first.id,attempt:2});
    assert.equal(wrong.decision.kind,'wrong');assert.equal(wrong.decision.heard,'i');
    assert.equal(wrong.decision.expected,undefined);assert.equal(wrong.session.index,1);
    sessions.audio('owner',{id:first.id,attempt:3,seq:0,samples:packet});
    const end=await sessions.analyze('owner',{id:first.id,attempt:3});
    assert.equal(end.session.complete,true);
    assert.equal(end.session.results[0].expected,'u');
    assert.equal(end.session.results[0].note,'Catatan');
    assert.equal(sample.judul,'Air yang Dapat Dipakai Bersuci');
  }finally{sessions.close();}
});

test('model yang ragu dan kata lain tidak diberi nilai; reset mengganti percobaan',async()=>{
  assert.deepEqual(classify({word_match:true,confidence:.9,ending:'u'},'u'),{kind:'correct',heard:'u'});
  assert.equal(classify({word_match:true,confidence:.5,ending:'a'},'u').kind,'uncertain');
  assert.equal(classify({word_match:false,confidence:.99,ending:'a'},'u').kind,'uncertain');
  const fake={getQiroahReading:()=>({ready:true,revision:1,targets:[{id:9,start:0,end:3,word:'بُ',expected:'u',note:''}]}),getQiroahText:()=>({teks:'بُ',judul:'Tes',versi:1})};
  const sessions=new ReadingSessions(fake,{fetcher:async()=>({ok:true,json:async()=>({ready:true})})});
  try{
    const session=await sessions.start('owner',1);
    sessions.audio('owner',{id:session.id,attempt:1,seq:0,samples:Buffer.alloc(8000)});
    const reset=sessions.reset('owner',session.id);
    assert.equal(reset.session.attempt,2);
    assert.deepEqual(sessions.audio('owner',{id:session.id,attempt:1,seq:1,samples:Buffer.alloc(8000)}),{accepted:false});
    await assert.rejects(sessions.analyze('owner',{id:session.id,attempt:1}),/berganti/);
    sessions.cancel('owner',session.id);
    assert.throws(()=>sessions.get('owner',session.id),/berakhir/);
  }finally{sessions.close();}
});

test('putus koneksi mempertahankan hasil; token diperlukan untuk melanjutkan',async()=>{
  const targets=[{id:1,start:0,end:2,word:'بُ',expected:'u',note:'Pertama'},{id:2,start:3,end:5,word:'تَ',expected:'a',note:'Kedua'}];
  const fake={getQiroahReading:()=>({ready:true,revision:1,targets}),getQiroahText:()=>({teks:'بُ تَ',judul:'Tes',versi:1})};
  const sessions=new ReadingSessions(fake,{fetcher:async url=>({ok:true,json:async()=>url.endsWith('/health')?{ready:true}:{word_match:true,confidence:.9,ending:'u'}})});
  try{
    const started=await sessions.start('first',1);
    sessions.audio('first',{id:started.id,attempt:1,seq:0,samples:Buffer.alloc(8000)});
    await sessions.analyze('first',{id:started.id,attempt:1});
    sessions.disconnect('first');
    assert.throws(()=>sessions.resume('second',started.id,'invalid'),/tidak dapat/);
    const resumed=sessions.resume('second',started.id,started.resumeToken).session;
    assert.equal(resumed.index,1);assert.equal(resumed.results[0].heard,'u');
    assert.equal(resumed.results[0].expected,undefined);
    assert.throws(()=>sessions.get('first',started.id),/berakhir/);
    assert.equal(sessions.audio('second',{id:started.id,attempt:1,seq:0,samples:Buffer.alloc(8000)}).accepted,false);
  }finally{sessions.close();}
});

test('hasil lama setelah reset tidak dapat menimpa percobaan baru',async()=>{
  let release;
  const fake={getQiroahReading:()=>({ready:true,revision:1,targets:[{id:1,start:0,end:2,word:'بُ',expected:'u',note:''}]}),getQiroahText:()=>({teks:'بُ',judul:'Tes',versi:1})};
  const sessions=new ReadingSessions(fake,{fetcher:async url=>{
    if(url.endsWith('/health'))return {ok:true,json:async()=>({ready:true})};
    return new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({word_match:true,confidence:.9,ending:'u'})});});
  }});
  try{
    const s=await sessions.start('owner',1);
    sessions.audio('owner',{id:s.id,attempt:1,seq:0,samples:Buffer.alloc(8000)});
    const old=sessions.analyze('owner',{id:s.id,attempt:1});
    const rejection=assert.rejects(old,/berganti/);
    const next=sessions.reset('owner',s.id).session;
    sessions.audio('owner',{id:s.id,attempt:next.attempt,seq:0,samples:Buffer.alloc(8000)});
    release();await rejection;
    const current=sessions.get('owner',s.id);
    assert.equal(current.index,0);assert.equal(current.bytes,8000);assert.equal(current.results.length,0);
  }finally{sessions.close();}
});
