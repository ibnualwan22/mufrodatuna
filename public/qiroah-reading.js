import {esc,mascot,setPose} from './learn-shared.js';
import {hideVowels} from './qiroah-reading-text.mjs';

const MARK={a:'َ',i:'ِ',u:'ُ'};
const NAME={a:'fathah',i:'kasrah',u:'dhammah'};

export function createReadingArena({textElement,toolsElement,progressElement,helpElement,call}){
  let source=null,config=null,session=null,stream=null,context=null,node=null,gain=null;
  let phase='idle',generation=0,seq=0,heard=false,spokenMs=0,silentMs=0,preRoll=[],sending=Promise.resolve(),assist=false;
  let resumeToken=null,pauseRequested=false,usedHelp=false;
  let firstResult=null,round=0;
  const rcall=(event,data={})=>call(event,data,20000);
  const message=(value)=>{const el=toolsElement.querySelector('#qr-message');if(el)el.textContent=value;};
  const active=()=>session?session.target:config?.targets?.[0]||null;
  function drawText(){
    if(!source)return;
    if(assist){textElement.textContent=source.teks;textElement.classList.add('qr-with-help');return;}
    textElement.classList.remove('qr-with-help');
    const targets=config?.targets||[],completed=new Map((session?.results||[]).map(item=>[item.id,item]));
    let cursor=0,html='';
    for(const target of targets){
      html+=esc(hideVowels(source.teks.slice(cursor,target.start)));
      const result=completed.get(target.id),selected=active()?.id===target.id;
      const mark=result?.heard?`<span class="qr-heard-mark ${result.kind==='wrong'?'is-wrong':''}" role="img" aria-label="${result.kind==='wrong'?'Perlu ditinjau. ':''}Harakat terdengar ${NAME[result.heard]}">&#8205;${MARK[result.heard]}</span>`:'';
      html+=`<span class="qr-word ${selected?'is-active':''} ${result?'is-done':''} ${result?.kind==='wrong'?'has-error':''}" ${selected?'aria-current="step"':''}>${esc(hideVowels(source.teks.slice(target.start,target.end)))}${mark}</span>`;
      cursor=target.end;
    }
    html+=esc(hideVowels(source.teks.slice(cursor)));textElement.innerHTML=html;
  }
  function drawProgress(){
    if(!session){progressElement.textContent=config?.targets?.length?`${config.targets.length} kata sasaran · belum dimulai`:'';const word=toolsElement.querySelector('#qr-current-word');if(word)word.textContent=active()?hideVowels(active().word):'—';return;}
    progressElement.textContent=session.complete?`Selesai · ${session.total} kata diperiksa`:`Kata ${session.index+1} dari ${session.total} · percobaan ${session.attempt}`;
    const bar=toolsElement.querySelector('#qr-progress-bar');if(bar)bar.style.transform=`scaleX(${session.total?session.index/session.total:0})`;
    const word=toolsElement.querySelector('#qr-current-word');if(word)word.textContent=active()?hideVowels(active().word):'Selesai';
  }
  function summary(){
    phase='complete';assist=false;stopMic();drawText();drawProgress();toolsElement.querySelector('#qr-help-note').hidden=true;
    const list=toolsElement.querySelector('#qr-summary');list.hidden=false;
    list.innerHTML=`<h3>Hasil bacaanmu</h3><p>Harakat merah adalah bunyi yang terbaca berbeda dari acuan. Lihat catatan i‘rab, lalu coba lagi bila perlu.</p>${session.results.map(r=>`<article class="qr-summary-row"><div><span lang="ar" dir="rtl" class="qr-summary-word">${esc(hideVowels(r.word))}<span class="qr-final-mark ${r.kind==='wrong'?'qr-summary-wrong':''}">&#8205;${MARK[r.heard]||''}</span></span><b>${r.kind==='wrong'?'Perlu ditinjau':'Tepat'}</b></div><p>Bacaanmu: ${NAME[r.heard]||'belum jelas'} · Acuan: ${NAME[r.expected]||'—'}</p>${r.note?`<small>${esc(r.note)}</small>`:''}</article>`).join('')}<button type="button" class="button primary" id="qr-again">Ulangi latihan</button>`;
    round++;
    if(!firstResult)firstResult={results:session.results.map(result=>({...result})),usedHelp};
    else{
      const previous=document.createElement('details');previous.className='qr-previous';
      previous.innerHTML=`<summary>Lihat bacaan pertama${firstResult.usedHelp?' · dengan bantuan':''}</summary>${firstResult.results.map(result=>`<p><span lang="ar" dir="rtl" class="qr-summary-word">${esc(hideVowels(result.word))}<span class="qr-final-mark ${result.kind==='wrong'?'qr-summary-wrong':''}">&#8205;${MARK[result.heard]||''}</span></span> · ${result.kind==='correct'?'Tepat':'Perlu ditinjau'} · Acuan: ${NAME[result.expected]}</p>`).join('')}`;
      list.insertBefore(previous,list.querySelector('#qr-again'));
      list.querySelector('h3').textContent=`Hasil bacaan ke-${round}`;
    }
    list.querySelector('#qr-again').onclick=()=>start(source,true);
    const details=document.createElement('p');details.textContent=`${usedHelp?'Dengan bantuan acuan. ':''}${session.retries?.waqf||0} kali mengulang akhir kata · ${session.retries?.uncertain||0} bacaan belum jelas. Pengulangan tidak dihitung sebagai jawaban salah.`;list.prepend(details);
    toolsElement.querySelector('#qr-controls').hidden=true;
    setPose(toolsElement.querySelector('#qr-mascot'),'correct',true);
    message('Latihan selesai. Catatan i‘rab ada di bawah.');
  }
  function resetCapture(){seq=0;heard=false;spokenMs=0;silentMs=0;preRoll=[];sending=Promise.resolve();}
  function setPaused(reason){
    phase='paused';pauseRequested=false;stream?.getTracks().forEach(track=>track.enabled=false);
    const button=toolsElement.querySelector('#qr-pause');if(button){button.textContent='Lanjut';button.disabled=false;}
    const meter=toolsElement.querySelector('#qr-meter-fill');if(meter)meter.style.transform='scaleX(0)';
    message(reason);
  }
  function send(buffer){
    const number=seq++,id=session.id,attempt=session.attempt,ticket=generation;
    sending=sending.then(async()=>{
      if(ticket!==generation||session?.id!==id||session?.attempt!==attempt)return;
      const response=await rcall('reading:audio',{id,attempt,seq:number,samples:buffer});
      if(!response.accepted&&ticket===generation&&session?.attempt===attempt)throw new Error('Potongan audio belum diterima.');
    }).catch(error=>{if(ticket===generation&&session?.attempt===attempt)setPaused(error.message+' Tekan Lanjut untuk mencoba lagi.');});
  }
  async function finishWord(){
    if(phase!=='listening')return;phase='processing';message('Memeriksa harakat akhir…');
    const ticket=generation,current=session?.attempt;
    try{
      await sending;if(phase==='paused'||ticket!==generation)return;
      const response=await rcall('reading:analyze',{id:session.id,attempt:current});
      if(ticket!==generation)return;
      session=response.session;drawText();drawProgress();
      const result=response.decision;
      if(session.complete){summary();return;}
      if(pauseRequested||assist){setPaused('Latihan dijeda. Tutup acuan bila terbuka, lalu tekan Lanjut.');return;}
      if(result.kind==='waqf')message('Akhir kata belum terdengar. Baca lagi dengan harakat akhirnya.');
      else if(result.kind==='uncertain')message('Bunyi belum cukup jelas. Coba ulangi kata yang disorot.');
      else if(result.kind==='wrong')message('Harakat terdengar berbeda. Kita lanjut; koreksi lengkap muncul di akhir.');
      else message('Tepat. Lanjutkan ke kata berikutnya.');
      setPose(toolsElement.querySelector('#qr-mascot'),result.kind==='correct'?'correct':'thinking');
      phase='feedback';setTimeout(()=>{if(ticket!==generation||phase!=='feedback')return;resetCapture();phase='listening';message('Baca kata yang disorot sampai bunyi akhir, lalu beri jeda singkat.');setPose(toolsElement.querySelector('#qr-mascot'),'encourage');},result.kind==='correct'||result.kind==='wrong'?900:1300);
    }catch(error){if(ticket!==generation)return;setPaused(error.message+' Tekan Lanjut untuk mencoba lagi.');}
  }
  function onPcm(buffer){
    if(phase!=='listening'||!session)return;
    const pcm=new Int16Array(buffer),ms=pcm.length/16;
    let power=0;for(let i=0;i<pcm.length;i++)power+=(pcm[i]/32768)**2;
    const rms=Math.sqrt(power/pcm.length),voice=rms>0.014;
    const meter=toolsElement.querySelector('#qr-meter-fill');if(meter)meter.style.transform=`scaleX(${Math.min(1,rms*14)})`;
    if(!heard){
      if(voice){heard=true;for(const chunk of preRoll)send(chunk);preRoll=[];send(buffer);spokenMs+=ms;message('Suaramu terdengar. Bunyikan akhir kata dengan jelas.');}
      else{preRoll.push(buffer);if(preRoll.length>2)preRoll.shift();}
      return;
    }
    send(buffer);spokenMs+=ms;silentMs=voice?0:silentMs+ms;
    if((silentMs>=380&&spokenMs>=260)||spokenMs>=6000)finishWord();
  }
  async function startMic(ticket){
    const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false}});
    if(ticket!==generation){acquired.getTracks().forEach(track=>track.stop());return;}
    stream=acquired;const audioContext=new AudioContext({sampleRate:16000});context=audioContext;
    for(const track of acquired.getTracks())track.onended=()=>{if(stream===acquired&&phase!=='complete'&&phase!=='idle'){if(phase==='processing')pauseRequested=true;else setPaused('Mikrofon terputus. Hubungkan kembali, lalu tekan Lanjut.');}};
    await audioContext.audioWorklet.addModule(new URL('./qiroah-audio-worklet.js',import.meta.url));
    if(ticket!==generation)return;
    const sourceNode=context.createMediaStreamSource(stream);
    node=new AudioWorkletNode(context,'qiroah-pcm');
    gain=context.createGain();gain.gain.value=0;
    sourceNode.connect(node);node.connect(gain);gain.connect(context.destination);
    node.port.onmessage=event=>onPcm(event.data);
    await context.resume();
  }
  function stopMic(){
    if(node){node.port.onmessage=null;node.disconnect();node=null;}
    gain?.disconnect();gain=null;
    stream?.getTracks().forEach(track=>{track.onended=null;track.stop();});stream=null;
    context?.close().catch(()=>{});context=null;
  }
  async function begin(){
    if(phase!=='ready')return;
    phase='starting';message('Meminta izin mikrofon…');
    const ticket=generation;
    try{
      if(!navigator.mediaDevices?.getUserMedia||!window.AudioWorkletNode)throw new Error('Browser belum mendukung mikrofon latihan ini.');
      await startMic(ticket);if(ticket!==generation)return;
      const response=await rcall('reading:start',{id:source.id});if(ticket!==generation){rcall('reading:cancel',{id:response.session.id,resumeToken:response.session.resumeToken}).catch(()=>{});return;}
      session=response.session;resumeToken=session.resumeToken;source={...source,teks:session.text};config.targets=session.targets;resetCapture();phase='listening';assist=false;pauseRequested=false;
      toolsElement.querySelector('#qr-help-note').hidden=true;toolsElement.querySelector('#qr-help').textContent='Lihat acuan harakat';
      toolsElement.querySelector('#qr-start').hidden=true;
      toolsElement.querySelector('#qr-pause').hidden=false;
      toolsElement.querySelector('#qr-help').hidden=false;
      drawText();drawProgress();message('Baca kata yang disorot sampai bunyi akhir, lalu beri jeda singkat.');
    }catch(error){if(ticket!==generation)return;stopMic();phase='ready';toolsElement.querySelector('#qr-help').hidden=false;message(error.name==='NotAllowedError'?'Izin mikrofon ditolak. Kamu masih bisa latihan mandiri.':error.message);}
  }
  async function pause(){if(phase==='paused'){
      if(assist)return message('Tutup acuan harakat sebelum melanjutkan.');
      phase='starting';message('Menyiapkan kata untuk dibaca ulang…');
      const ticket=generation;
      try{if(!stream?.getAudioTracks().some(track=>track.readyState==='live')){stopMic();await startMic(ticket);if(ticket!==generation)return;}const response=await rcall('reading:resume',{id:session.id,resumeToken});if(ticket!==generation)return;session=response.session;if(session.complete){summary();return;}resetCapture();phase='listening';stream?.getTracks().forEach(track=>track.enabled=true);drawText();drawProgress();toolsElement.querySelector('#qr-pause').textContent='Jeda';message('Lanjutkan membaca kata yang disorot.');}
      catch(error){if(ticket!==generation)return;setPaused(error.message);toolsElement.querySelector('#qr-start').hidden=false;toolsElement.querySelector('#qr-start').textContent='Mulai ulang latihan';toolsElement.querySelector('#qr-start').onclick=()=>start(source);}
      return;
    }
    if(phase==='processing'){pauseRequested=true;toolsElement.querySelector('#qr-pause').disabled=true;message('Menyelesaikan pemeriksaan kata ini, lalu jeda.');return;}
    if(phase==='listening'||phase==='feedback')setPaused('Latihan dijeda.');}
  function help(){
    assist=!assist;if(assist){usedHelp=true;if(['listening','feedback','processing'].includes(phase))pause();}
    toolsElement.querySelector('#qr-help').textContent=assist?'Tutup acuan harakat':'Lihat acuan harakat';
    toolsElement.querySelector('#qr-help-note').hidden=!assist;drawText();
  }
  function render(){
    toolsElement.innerHTML=`<div class="qr-shell"><div class="qr-top"><div id="qr-mascot" class="qr-mascot">${mascot('encourage')}</div><div><span class="overline muted">LATIHAN I‘RAB SUARA</span><h3>Bunyikan akhir kata</h3><p>Satu kata yang disorot setiap giliran. Baca lalu beri jeda singkat.</p></div></div><div class="qr-current"><span>KATA SEKARANG</span><strong id="qr-current-word" lang="ar" dir="rtl">—</strong><div class="qr-meter" aria-hidden="true"><i id="qr-meter-fill"></i></div></div><div class="qr-progress-track" aria-hidden="true"><i id="qr-progress-bar"></i></div><p id="qr-message" role="status" aria-live="polite"></p><div id="qr-controls" class="qr-controls"><button type="button" class="button primary" id="qr-start" hidden>Mulai dengan mikrofon</button><button type="button" class="button subtle" id="qr-pause" hidden>Jeda</button><button type="button" class="button subtle" id="qr-help" hidden>Lihat acuan harakat</button></div><p class="qr-pilot-note">Pengenalan suara masih tahap uji. Jika hasil terasa keliru, ulangi dan periksa bersama pengajar.</p><p id="qr-help-note" class="qr-help-note" hidden>Ini acuan dari teks admin, bukan hasil deteksi suara. Penilaian dijeda selama acuan terbuka.</p><div id="qr-summary" hidden></div></div>`;
    toolsElement.querySelector('#qr-start').onclick=begin;
    toolsElement.querySelector('#qr-pause').onclick=pause;
    toolsElement.querySelector('#qr-help').onclick=help;
  }
  async function start(text,keepFirstResult=false){
    if(!keepFirstResult){firstResult=null;round=0;}
    stop();source=text;phase='loading';render();textElement.textContent=hideVowels(text.teks);
    progressElement.textContent='';helpElement.textContent='Kalimat tampil tanpa harakat. Baca kata sasaran sampai bunyi akhir.';
    message('Memeriksa kesiapan target dan layanan suara…');
    const ticket=generation;
    try{
      const reading=await rcall('qiroah:readingGet',{id:text.id});if(ticket!==generation)return;
      config=reading.reading;if(!config.ready)config.targets=[];drawText();drawProgress();toolsElement.querySelector('#qr-help').hidden=false;
      if(!config.ready){phase='manual';message('Admin belum menyiapkan target suara untuk bacaan ini. Kamu bisa membaca mandiri dan melihat acuan teks.');toolsElement.querySelector('#qr-start').hidden=true;toolsElement.querySelector('#qr-help').hidden=false;return;}
      await rcall('reading:health');if(ticket!==generation)return;
      phase='ready';toolsElement.querySelector('#qr-start').hidden=false;message('Siap. Tekan Mulai, izinkan mikrofon, lalu baca kata yang disorot.');
    }catch(error){if(ticket!==generation)return;phase='manual';toolsElement.querySelector('#qr-start').hidden=true;toolsElement.querySelector('#qr-help').hidden=false;message('Pemeriksaan suara belum tersedia. Kamu tetap dapat membaca mandiri dan melihat acuan harakat.');}
  }
  function disconnect(){if(!session||phase==='complete'||phase==='idle')return;generation++;setPaused('Koneksi terputus. Hasil sebelumnya tersimpan sementara; tekan Lanjut saat terhubung kembali.');}
  function stop(){generation++;phase='idle';stopMic();if(session?.id)rcall('reading:cancel',{id:session.id,resumeToken}).catch(()=>{});session=null;resumeToken=null;config=null;assist=false;pauseRequested=false;usedHelp=false;}
  return {start,stop,disconnect};
}
