const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,readFileSync}=require('node:fs');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
process.env.DB_PATH=join(mkdtempSync(join(tmpdir(),'mufrodat-quran-')),'quran.db');
const data=require('../lib/quran-data');
const store=require('../lib/quran-store');
const game=require('../lib/quran-game');

test('Corpus and Tanzil map without rewriting Quran text, including basmalah and split words',()=>{
  const input=data.load();assert.equal(input.surahs.length,114);assert.equal(input.verses.length,6236);
  assert.equal(data.arabic('bi'), 'بِ');assert.equal(data.arabic('p'), 'ة');assert.equal(data.arabic('ktb'), 'كتب');
  assert.equal(input.aligned,6234);
  const unaligned=input.verses.flatMap(v=>v.words.filter(w=>w.start===undefined).map(w=>w.id));assert.deepEqual(unaligned,['12:39:1','12:41:1']);
  for(const v of input.verses)for(const w of v.words)if(w.start!==undefined)assert.equal(data.skeleton(v.text.slice(w.start,w.end)).replace(/\s/g,''),data.skeleton(w.form).replace(/\s/g,''));
  const two=store.verse(2,1);assert.equal(two.text,'الٓمٓ');assert.equal(game.questions(two).length,0,'muqattaah does not become a guessed question');
  assert.ok(store.verse(2,181).annotations.some(a=>a.start!==null&&store.verse(2,181).text.slice(a.start,a.end).includes('بَعْدَ مَا')));
  const text=readFileSync(join(__dirname,'../public/quran-sources/tanzil-uthmani-1.1.txt'),'utf8');assert.equal(store.verse(1,1).text,text.split('\n')[0].split('|')[2]);
});

test('opening basmalah is omitted outside Al-Fatihah with matching question offsets',()=>{
  const input=data.load();
  for(const raw of input.verses.filter(v=>v.ayah===1||v.surah===27&&v.ayah===30)){
    const v=store.verse(raw.surah,raw.ayah);
    const expected=raw.ayah===1&&raw.surah!==1&&raw.surah!==9?raw.text.replace(/^(?:\S+\s+){4}/u,''):raw.text;
    assert.equal(v.text,expected,`reading text ${v.id}`);
    for(const annotation of v.annotations.filter(a=>a.start!==null)){
      assert.ok(annotation.start>=0);
      assert.equal(data.skeleton(v.text.slice(annotation.start,annotation.end)).replace(/\s/g,''),data.skeleton(annotation.word).replace(/\s/g,''),annotation.id);
    }
  }
  const {DatabaseSync}=require('node:sqlite'),db=new DatabaseSync(process.env.DB_PATH);
  try{assert.equal(db.prepare('SELECT text FROM quran_verses WHERE id=?').get('112:1').text,input.verses.find(v=>v.surah===112&&v.ayah===1).text);}finally{db.close();}
  assert.ok(store.verse(27,30).text.includes('بِسْمِ'));
});

test('random selection chooses playable verses and skips the previous choice',()=>{
  let previous='1:1';
  for(let i=0;i<8;i++){
    const v=store.randomVerse(previous);
    assert.notEqual(v.id,previous);
    const questions=game.questions(v);assert.ok(questions.length>0);
    for(const q of questions){assert.ok(!['disabled','needs_correction'].includes(q.status));assert.equal(v.text.slice(q.start,q.end),q.word);}
    previous=v.id;
  }
  assert.throws(()=>store.randomVerse(['1:1']),/tidak valid/);
});

test('questions use available fields, precise segments and a single distinct answer',()=>{
  for(const [s,a]of [[1,1],[1,5],[2,3],[12,39],[112,1],[114,6]]) {
    const v=store.verse(s,a);for(const q of game.questions(v)){assert.equal(new Set(q.options).size,q.options.length);assert.equal(q.options.filter(x=>x===q.answer).length,1);assert.equal(v.text.slice(q.start,q.end),q.word);assert.notEqual(q.location,'12:39:1:1');assert.match(q.source,/corpus.quran.com/);}
  }
  const session=game.create(store.verse(1,1)),q=session.questions[0];assert.equal(game.snapshot(session).question.answer,undefined);
  assert.throws(()=>game.next(session,{questionId:q.id}));assert.throws(()=>game.answer(session,{questionId:q.id,choice:'fake'}));
  const r=game.answer(session,{questionId:q.id,choice:q.answer});assert.equal(r.score,100);assert.equal(game.answer(session,{questionId:q.id,choice:q.answer}).score,100);
  game.next(session,{questionId:q.id});assert.throws(()=>game.answer(session,{questionId:q.id,choice:q.answer}));
});

test('admin corrections preserve source, freeze existing sessions, reject stale edits and restore history',()=>{
  const id='1:1:1:2/root',session=game.create(store.verse(1,1));const original=store.verse(1,1).annotations.find(a=>a.id===id);
  const review=store.review(id,{revision:0,status:'verified',value:'ك ت ب',reason:'Fixture koreksi',reference:'Fixture sumber'});
  const corrected=store.verse(1,1).annotations.find(a=>a.id===id);assert.equal(corrected.value,original.value);assert.equal(corrected.effective,'ك ت ب');assert.equal(review.revision,1);
  assert.equal(session.questions.find(q=>q.id===id).answer,original.value);assert.equal(game.create(store.verse(1,1)).questions.find(q=>q.id===id).answer,'ك ت ب');
  assert.throws(()=>store.review(id,{revision:0,status:'verified',reason:'stale',reference:'source'}),/berubah/);
  const h=store.history(id)[0];store.restore(id,{historyId:h.id,revision:1,reason:'Pulihkan fixture'});assert.equal(store.verse(1,1).annotations.find(a=>a.id===id).effective,original.value);assert.equal(store.history(id).length,2);
  store.review(id,{revision:2,status:'disabled',reason:'Fixture nonaktif',reference:'Fixture'});assert.ok(!game.questions(store.verse(1,1)).some(q=>q.id===id));
  store.review(id,{revision:3,status:'source',reason:'Pulihkan sumber',reference:'Corpus'});
  assert.throws(()=>store.review(id,{revision:4,status:'verified',value:'<script>',reason:'Invalid',reference:'Fixture'}));
});

test('HTTP endpoints protect review operations and serve playable Quran sessions',async t=>{
  const child=spawn(process.execPath,['server.js'],{cwd:join(__dirname,'..'),env:{...process.env,PORT:'0',ADMIN_PASSWORD:'quran-test-password'},stdio:['ignore','pipe','pipe']});
  t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){const done=once(child,'exit');child.kill('SIGTERM');await done;}});
  const port=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(new Error('Startup timeout '+log)),20000);child.stdout.on('data',b=>{log+=b;const match=log.match(/localhost:(\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});child.stderr.on('data',b=>log+=b);child.on('error',reject);child.on('exit',()=>{clearTimeout(timer);reject(new Error(log));});});
  const base=`http://127.0.0.1:${port}/api/qiroah/quran`;
  assert.equal((await fetch(base+'/admin/verses/1/1')).status,401);
  const denied=await fetch(base+'/admin/review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'1:1:1:1/pos',status:'disabled'})});assert.equal(denied.status,401);
  const admin=await fetch(base+'/admin/verses/1/1',{headers:{authorization:'Bearer quran-test-password'}});assert.equal(admin.status,200);assert.ok((await admin.json()).annotations.length);
  const preview=await (await fetch(base+'/verses/112/1')).json();assert.ok(preview.text.startsWith('قُلْ'));
  const adminPreview=await (await fetch(base+'/admin/verses/112/1',{headers:{authorization:'Bearer quran-test-password'}})).json();assert.equal(adminPreview.text,preview.text);
  const random=await (await fetch(base+'/random?exclude=1:1')).json();assert.notEqual(random.id,'1:1');assert.ok(random.questions>0);
  assert.equal((await fetch(base+'/verses/115/1')).status,400);assert.equal((await fetch(base+'/sessions/missing')).status,410);
  const post=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();};
  const [surah,ayah]=random.id.split(':').map(Number),randomSession=await post('/sessions',{surah,ayah});assert.equal(randomSession.verse.id,random.id);assert.equal(randomSession.verse.text,random.text);
  let s=await post('/sessions',{surah:1,ayah:1});assert.ok(!('answer' in s.question));
  while(!s.complete){const q=s.question;s=await post(`/sessions/${s.id}/answer`,{questionId:q.id,choice:q.options[0]});assert.ok(s.feedback.answer);s=await post(`/sessions/${s.id}/next`,{questionId:q.id});}
  assert.equal(s.results.length,s.total);
});
