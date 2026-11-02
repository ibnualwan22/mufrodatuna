const {randomUUID}=require('node:crypto');
const {classify}=require('./qiroah-reading');

class ReadingSessions {
  constructor(db,{url=process.env.READING_SPEECH_URL||'http://127.0.0.1:8891',token=process.env.READING_SPEECH_TOKEN||'',fetcher=fetch}={}){
    this.db=db;this.url=url.replace(/\/$/,'');this.token=token;this.fetcher=fetcher;this.sessions=new Map();
    this.timer=setInterval(()=>this.prune(),60000);this.timer.unref();
  }
  prune(){for(const [id,s] of this.sessions)if(Date.now()-s.touched>300000){s.controller?.abort();this.sessions.delete(id);}}
  async health(){
    if(process.env.READING_SPEECH_ENABLED==='0')throw new Error('Pemeriksaan suara sedang dinonaktifkan.');
    const response=await this.fetcher(`${this.url}/health`,{signal:AbortSignal.timeout(2500)});
    if(!response.ok)throw new Error('Layanan pemeriksa suara belum tersedia.');
    const status=await response.json();
    if(status?.ready!==true)throw new Error('Model pemeriksa suara belum siap.');
    return status;
  }
  async start(owner,textId){
    await this.health();
    this.prune();if([...this.sessions.values()].filter(s=>s.owner!==owner).length>=20)throw new Error('Latihan suara sedang penuh. Coba lagi sebentar.');
    const config=this.db.getQiroahReading(textId,true);
    if(!config.ready)throw new Error('Target membaca untuk bacaan ini belum siap atau perlu diperiksa admin.');
    const text=this.db.getQiroahText(textId);
    for(const [id,prior] of this.sessions)if(prior.owner===owner){prior.controller?.abort();this.sessions.delete(id);}
    const session={id:randomUUID(),resumeToken:randomUUID(),owner,textId,text:text.teks,title:text.judul,textVersion:text.versi,revision:config.revision,
      targets:config.targets,index:0,attempt:1,results:[],retries:{waqf:0,uncertain:0},audio:[],bytes:0,seq:-1,processing:false,touched:Date.now()};
    this.sessions.set(session.id,session);return {...this.view(session),resumeToken:session.resumeToken};
  }
  get(owner,id){
    const s=this.sessions.get(id);if(!s||s.owner!==owner||Date.now()-s.touched>300000)throw new Error('Sesi membaca berakhir. Mulai lagi dari katalog.');
    s.touched=Date.now();return s;
  }
  view(s){
    const target=s.targets[s.index];return {id:s.id,text:s.text,title:s.title,textVersion:s.textVersion,revision:s.revision,index:s.index,total:s.targets.length,
      attempt:s.attempt,retries:{...s.retries},complete:!target,target:target?{id:target.id,start:target.start,end:target.end,word:target.word}:null,
      targets:s.targets.map(item=>({id:item.id,start:item.start,end:item.end,word:item.word})),
      results:s.results.map(result=>({...result,...(target?{expected:undefined,note:undefined}:{})}))};
  }
  audio(owner,payload){
    const s=this.get(owner,payload?.id);
    if(s.processing||!s.targets[s.index]||payload.attempt!==s.attempt)return {accepted:false};
    if(!Number.isSafeInteger(payload.seq)||payload.seq!==s.seq+1)throw new Error('Urutan audio terputus. Ulangi kata ini.');
    const bytes=Buffer.isBuffer(payload.samples)?payload.samples:payload.samples instanceof ArrayBuffer?Buffer.from(payload.samples):null;
    if(!bytes||bytes.length<2||bytes.length>8192||bytes.length%2)throw new Error('Potongan audio tidak valid.');
    if(s.bytes+bytes.length>256000)throw new Error('Durasi audio melebihi batas. Ulangi kata ini.');
    s.audio.push(bytes);s.bytes+=bytes.length;s.seq=payload.seq;return {accepted:true};
  }
  clearAttempt(s){s.controller?.abort();s.controller=null;s.processing=false;s.audio=[];s.bytes=0;s.seq=-1;s.attempt++;}
  reset(owner,id){const s=this.get(owner,id);this.clearAttempt(s);return {session:this.view(s)};}
  resume(owner,id,token){
    this.prune();const s=this.sessions.get(id);
    if(!s||!token||s.resumeToken!==token)throw new Error('Sesi tidak dapat dilanjutkan. Mulai ulang latihan.');
    s.owner=owner;s.touched=Date.now();this.clearAttempt(s);return {session:this.view(s)};
  }
  async analyze(owner,payload){
    const s=this.get(owner,payload?.id),target=s.targets[s.index];
    if(!target||payload.attempt!==s.attempt)throw new Error('Percobaan ini sudah berganti.');
    if(s.processing)throw new Error('Bacaan sedang diperiksa.');
    if(s.bytes<6400)throw new Error('Bacaan terlalu singkat. Ulangi kata ini.');
    s.processing=true;const controller=new AbortController();s.controller=controller;
    try{
      const response=await this.fetcher(`${this.url}/analyze`,{method:'POST',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),
        headers:{'content-type':'application/json',...(this.token?{'x-reading-token':this.token}:{})},
        body:JSON.stringify({audio:Buffer.concat(s.audio).toString('base64'),sample_rate:16000,word:target.word.normalize('NFC').replace(/[\u064B-\u0652\u0670]/gu,'')})});
      if(!response.ok)throw new Error('Pemeriksaan suara gagal. Coba ulangi kata ini.');
      const evidence=await response.json();
      if(process.env.QIROAH_SPEECH_DEBUG)console.log('Qiroah speech evidence',JSON.stringify({word_match:evidence.word_match,confidence:evidence.confidence,ending:evidence.ending}));
      if(this.sessions.get(s.id)!==s||s.owner!==owner||payload.attempt!==s.attempt)throw new Error('Percobaan ini sudah berganti.');
      const decision=classify(evidence,target.expected);
      const result={id:target.id,word:target.word,kind:decision.kind,heard:decision.heard,
        expected:target.expected,note:target.note,confidence:evidence.confidence};
      s.audio=[];s.bytes=0;s.seq=-1;s.attempt++;
      if(decision.kind==='correct'||decision.kind==='wrong'){s.results.push(result);s.index++;}
      else s.retries[decision.kind]++;
      return {decision:{id:result.id,word:result.word,kind:result.kind,heard:result.heard,confidence:result.confidence},session:this.view(s)};
    }catch(error){
      if(s.controller===controller){s.audio=[];s.bytes=0;s.seq=-1;}
      if(error.name==='TimeoutError')throw new Error('Pemeriksaan terlalu lama. Coba ulangi kata ini.');
      throw error;
    }finally{if(s.controller===controller){s.processing=false;s.controller=null;}}
  }
  cancel(owner,id,token){const s=this.sessions.get(id);if(!s||(s.owner!==owner&&s.resumeToken!==token))throw new Error('Sesi tidak ditemukan.');s.controller?.abort();this.sessions.delete(s.id);return {ok:true};}
  disconnect(owner){for(const s of this.sessions.values())if(s.owner===owner){this.clearAttempt(s);s.owner=null;s.touched=Date.now();}}
  close(){clearInterval(this.timer);for(const s of this.sessions.values())s.controller?.abort();this.sessions.clear();}
}
module.exports={ReadingSessions};
