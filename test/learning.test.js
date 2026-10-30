const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const {once}=require('node:events');
const engine=require('../lib/learn-engine');
const seed=require('../data/learning');

const words=seed[0].chapters[0].items.map((item,i)=>({...item,id:i+1,alternatives:[]}));
const chapter={id:1,title:'Test',category:'mufrodat'};
function solve(q,items){
 const item=items.find(i=>q.mode==='dialogue'?i.context===q.prompt:q.mode==='arrange'||q.mode==='cloze'?i.meaning===q.meaning:i.arab===(q.audioText||q.prompt));
 if(q.mode==='arrange'){
   const desired=q.separator?item.arab.split(/\s+/):[...new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(item.arab)].map(s=>s.segment);
   const pool=[...q.tiles];return {tiles:desired.map(text=>{const index=pool.findIndex(t=>t.text===text);assert.ok(index>=0);return pool.splice(index,1)[0].id;})};
 }
 const value=q.mode==='dialogue'?item.arab:q.mode==='cloze'?item.blank:item.meaning;
 return {optionId:q.options.find(o=>o.text===value).id};
}
test('answers and navigation are idempotent; stale answers cannot affect a new question',()=>{
 const s=engine.createSession(chapter,words,'choice'),q=engine.snapshot(s).question;
 assert.equal(q.meaning,undefined);assert.equal(q.answer,undefined);
 assert.throws(()=>engine.next(s,q.id));
 const answer={questionId:q.id,...solve(q,words)},first=engine.answer(s,answer);
 assert.equal(first.points,10);assert.deepEqual(engine.answer(s,answer),first);assert.equal(s.score,10);
 engine.next(s,q.id);engine.next(s,q.id);assert.equal(s.index,1);
 assert.throws(()=>engine.answer(s,answer));assert.equal(s.score,10);
});
test('arrangement rejects forged/reused tiles and accepts correctly joined Arabic',()=>{
 const s=engine.createSession(chapter,words,'arrange'),q=engine.snapshot(s).question;
 assert.throws(()=>engine.answer(s,{questionId:q.id,tiles:q.tiles.map(()=>q.tiles[0].id)}));
 assert.throws(()=>engine.answer(s,{questionId:q.id,tiles:['invented']}));
 assert.equal(engine.answer(s,{questionId:q.id,...solve(q,words)}).correct,true);
});
test('matching is checked on the server and duplicate matches cannot score twice',()=>{
 const s=engine.createSession(chapter,words,'pairs'),q=engine.snapshot(s).question;
 assert.throws(()=>engine.answer(s,{questionId:q.id,text:'PAIRS_DONE'}));
 for(const l of q.left){const item=words.find(i=>i.arab===l.text);const r=q.right.find(i=>i.text===item.meaning);const data={questionId:q.id,left:l.id,right:r.id};
   assert.equal(engine.pair(s,data).correct,true);assert.equal(engine.pair(s,data).correct,true);
 }
 assert.equal(s.score,40);assert.equal(s.questions[0].matched.length,4);
});
test('listening can be skipped without points or a wrong-answer review entry',()=>{
 const s=engine.createSession(chapter,words.slice(0,1),'listen'),q=engine.snapshot(s).question;
 const r=engine.answer(s,{questionId:q.id,skip:true});assert.equal(r.skipped,true);assert.equal(r.points,0);
 const end=engine.next(s,q.id);assert.equal(end.result.studied,0);assert.equal(end.result.skipped,1);assert.equal(end.result.review.length,0);
});

test('HTTP curriculum, all six games, admin validation, and non-destructive seed migration',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'mufrodat-learning-')),database=join(dir,'learning.db');
 const child=spawn(process.execPath,['server.js'],{cwd:join(__dirname,'..'),env:{...process.env,PORT:'0',DB_PATH:database,ADMIN_PASSWORD:'test-pass'},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{child.kill('SIGTERM');await once(child,'exit').catch(()=>{});rmSync(dir,{recursive:true,force:true});});
 let output='';const port=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('Server startup timed out: '+output)),15000);
   child.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/localhost:(\d+)/);if(m){clearTimeout(timeout);resolve(Number(m[1]));}});
   child.on('error',reject);child.on('exit',code=>{clearTimeout(timeout);reject(new Error('Server exited: '+code));});
 });
 const call=async(path,body,method='POST',admin=false)=>{const r=await fetch(`http://127.0.0.1:${port}/api/learn${path}`,{method:body===undefined?(method==='POST'?'GET':method):method,headers:{'content-type':'application/json',...(admin?{authorization:'Bearer test-pass'}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const {data:catalog}=await call('/catalog');assert.equal(catalog.programs.length,3);assert.equal(catalog.chapters.length,6);assert.equal(catalog.chapters.reduce((n,c)=>n+c.count,0),48);
 assert.equal((await call('/admin/catalog')).status,401);
 for(const mode of Object.keys(catalog.modes)){
   const c=catalog.chapters.find(c=>c.modes[mode]);const {data:{items}}=await call(`/admin/chapters/${c.id}/items`,undefined,'GET',true);
   let {data:s}=await call('/sessions',{chapterId:c.id,mode});let score=0;
   while(!s.done){const q=s.question;let feedback;
     if(mode==='pairs')for(const l of q.left){const item=items.find(i=>i.arab===l.text);const right=q.right.find(r=>r.text===item.meaning);const r=await call(`/sessions/${s.sessionId}/pair`,{questionId:q.id,left:l.id,right:right.id});assert.equal(r.status,200);assert.equal(r.data.correct,true);if(r.data.feedback)feedback=r.data.feedback;}
     else {const body={questionId:q.id,...solve(q,items)};const r=await call(`/sessions/${s.sessionId}/answer`,body);assert.equal(r.status,200);feedback=r.data;const duplicate=await call(`/sessions/${s.sessionId}/answer`,body);assert.deepEqual(duplicate.data,feedback);}
     assert.equal(feedback.correct,true,mode);score+=feedback.points;
     const next=await call(`/sessions/${s.sessionId}/next`,{questionId:q.id});s=next.data;assert.equal(next.status,200);
   }
   assert.equal(s.result.score,80,mode);assert.equal(score,80);assert.equal(s.result.studied,8);assert.equal(s.result.review.length,0);
 }
 const c=await call('/admin/chapters',{programId:1,title:'Bab uji',description:'Pengujian'},'POST',true);assert.equal(c.status,200);
 const invalid=await call(`/admin/chapters/${c.data.id}/items`,{arab:'أُرِيدُ كِتَابًا',meaning:'saya ingin buku',pattern:'___ ___',blank:'كِتَابًا'},'POST',true);assert.equal(invalid.status,400);
 const item=await call(`/admin/chapters/${c.data.id}/items`,{arab:'قَلَمٌ',meaning:'pena uji'},'POST',true);assert.equal(item.status,200);
 const update=await call(`/admin/items/${item.data.id}`,{arab:'قَلَمٌ',meaning:'pena yang diperbarui'},'PUT',true);assert.equal(update.data.updated,1);
 const output2=execFileSync(process.execPath,['-e','const db=require("./lib/learn-db"); console.log(JSON.stringify(db.catalog()))'],{cwd:join(__dirname,'..'),env:{...process.env,DB_PATH:database},encoding:'utf8'});
 const migrated=JSON.parse(output2.trim());assert.equal(migrated.chapters.length,7);assert.equal(migrated.chapters.reduce((n,c)=>n+c.count,0),49);
 assert.equal((await call(`/admin/chapters/${c.data.id}/items`,undefined,'GET',true)).data.items[0].meaning,'pena yang diperbarui');
 assert.equal((await call(`/admin/chapters/${c.data.id}`,undefined,'DELETE',true)).data.deleted,1);
 assert.equal((await call('/sessions',{chapterId:c.data.id,mode:'choice'})).status,400);
 assert.equal((await call('/sessions/missing')).status,410);
});
