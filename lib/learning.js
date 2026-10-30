const express = require('express');
const store = require('./learn-db');
const engine = require('./learn-engine');
module.exports = function learningRouter(password) {
  const router=express.Router(), sessions=new Map();
  router.use(express.json({limit:'32kb'}));
  router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
  const cleanup=setInterval(()=>{
    for(const [id,s] of sessions) if(Date.now()-s.touchedAt>30*60*1000) sessions.delete(id);
  },60000);cleanup.unref();
  const route=fn=>(req,res)=>{try{fn(req,res);}catch(error){res.status(400).json({error:error.message});}};
  router.get('/catalog',route((req,res)=>res.json(store.catalog())));
  router.post('/sessions',route((req,res)=>{
    const {chapterId,mode,reviewIds}=req.body || {};
    const chapter=store.catalog().chapters.find(c=>c.id===Number(chapterId));
    if(!chapter || !chapter.modes[mode]) throw new Error('Tema ini belum memiliki cukup materi untuk permainan tersebut.');
    if(sessions.size>=500) return res.status(503).json({error:'Latihan sedang ramai. Coba sebentar lagi.'});
    let items=store.eligible(store.items(chapter.id),mode);
    if(Array.isArray(reviewIds) && reviewIds.length) {
      const selected=items.filter(i=>reviewIds.includes(i.id));
      // Keep distractors available for choice modes; prioritize review in arrange.
      if(mode==='arrange' && selected.length) items=selected;
    }
    const s=engine.createSession(chapter,items,mode);sessions.set(s.id,s);res.json(engine.snapshot(s));
  }));
  router.use('/sessions/:id',(req,res,next)=>{
    const s=sessions.get(req.params.id);
    if(!s || Date.now()-s.touchedAt>30*60*1000) return res.status(410).json({error:'Sesi sudah berakhir. Mulai latihan baru, ya.'});
    s.touchedAt=Date.now();req.lesson=s;next();
  });
  router.get('/sessions/:id',route((req,res)=>res.json(engine.snapshot(req.lesson))));
  router.post('/sessions/:id/answer',route((req,res)=>res.json(engine.answer(req.lesson,req.body || {}))));
  router.post('/sessions/:id/pair',route((req,res)=>res.json(engine.pair(req.lesson,req.body || {}))));
  router.post('/sessions/:id/next',route((req,res)=>res.json(engine.next(req.lesson,req.body?.questionId))));
  router.delete('/sessions/:id',route((req,res)=>{sessions.delete(req.lesson.id);res.json({ok:true});}));
  router.use('/admin',(req,res,next)=>{
    if(req.get('authorization')!==`Bearer ${password}`) return res.status(401).json({error:'Kata sandi admin tidak sesuai.'});
    next();
  });
  router.get('/admin/catalog',route((req,res)=>res.json(store.catalog())));
  router.post('/admin/programs',route((req,res)=>res.json({id:store.addProgram(req.body)})));
  router.get('/admin/chapters/:id/items',route((req,res)=>res.json({items:store.items(Number(req.params.id))})));
  router.post('/admin/chapters',route((req,res)=>res.json({id:store.addChapter(req.body)})));
  router.put('/admin/chapters/:id',route((req,res)=>res.json({updated:store.updateChapter(Number(req.params.id),req.body)})));
  router.delete('/admin/chapters/:id',route((req,res)=>res.json({deleted:store.deleteChapter(Number(req.params.id))})));
  router.post('/admin/chapters/:id/items',route((req,res)=>res.json({id:store.addItem(Number(req.params.id),req.body)})));
  router.put('/admin/items/:id',route((req,res)=>res.json({updated:store.updateItem(Number(req.params.id),req.body)})));
  router.delete('/admin/items/:id',route((req,res)=>res.json({deleted:store.deleteItem(Number(req.params.id))})));
  return router;
};
