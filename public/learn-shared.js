export const $ = id => document.getElementById(id);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
 book:'<path d="M12 6c-3-3-7-3-10-2v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2ZM12 6v15M5 8h3m8 0h3"/>',
 chat:'<path d="M21 11a8 8 0 0 1-8 8H8l-5 3 1-6a8 8 0 0 1-1-5 8 8 0 0 1 8-8h2a8 8 0 0 1 8 8ZM7 9h10M7 13h6"/>',
 blocks:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M14 17h7m-3.5-3.5v7"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
 spark:'<path d="m12 2 2.8 6.8L22 12l-7.2 3.2L12 22l-2.8-6.8L2 12l7.2-3.2Z"/>',
 flag:'<path d="M5 22V3m0 1c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
 headphones:'<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="2" y="12" width="5" height="9" rx="2"/><rect x="17" y="12" width="5" height="9" rx="2"/>',
 volume:'<path d="M11 4 6 8H2v8h4l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute:'<path d="M11 4 6 8H2v8h4l5 4Zm5 5 6 6m0-6-6 6"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m9 3 1-2h4l1 2 3 2 2 1 2 4-2 2 1 3-2 4h-3l-2 3h-4l-2-3H5l-2-4 1-3-2-2 2-4 2-1Z"/>',
 sliders:'<path d="M4 4v16m8-16v16m8-16v16M1 8h6m2 8h6m2-9h6"/>',play:'<path d="m8 4 13 8-13 8Z"/>',
 heart:'<path d="M20 4c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 0 9 8 16 8-7 12-12 8-16Z"/>',
 refresh:'<path d="M20 9a8 8 0 1 0 0 7M20 3v6h-6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
 home:'<path d="m2 11 10-9 10 9M5 9v12h14V9M9 21v-7h6v7"/>',lock:'<rect x="5" y="10" width="14" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v4"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
};
export const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
export function fillIcons(root=document) { root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
 root.querySelectorAll('.brand-mark').forEach(el=>el.innerHTML='<svg viewBox="115 10 310 315" aria-hidden="true"><image href="assets/mascot-poses.png" width="1254" height="1254"/></svg>');
}
// SVG viewports preserve every pixel of the supplied PNG.
const frames={welcome:[0,0,480,590],thinking:[440,0,390,590],encourage:[815,0,435,595],correct:[145,595,500,640],complete:[645,592,595,648]};
const masks={welcome:'0,0 420,0 420,350 480,390 480,480 430,500 430,590 0,590',thinking:'440,0 830,0 830,200 810,280 805,590 445,590 470,480 490,420 470,320 440,220',encourage:'875,0 1254,0 1254,595 815,595 815,200 830,145 875,145',correct:'145,595 645,595 645,1235 145,1235',complete:'645,592 1240,592 1240,1240 645,1240'};
let poseNumber=0;
export function mascot(pose='welcome') {const id=`pose-mask-${++poseNumber}`;return `<div class="mascot" data-pose="${pose}" aria-hidden="true"><svg viewBox="${frames[pose].join(' ')}" focusable="false"><defs><clipPath id="${id}"><polygon points="${masks[pose]}"/></clipPath></defs><image clip-path="url(#${id})" href="assets/mascot-poses.png" width="1254" height="1254"/></svg></div>`;}
export const memory={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}},remove(key){try{localStorage.removeItem(key);}catch{}}};
export const preferences=memory.get('mufrodat.preferences',{sfx:true,speech:true,motion:false});
const reduceQuery=matchMedia('(prefers-reduced-motion: reduce)');
export const reduced=()=>preferences.motion || reduceQuery.matches;
const animations=new Set();
export function animate(el,frames,options={}) {
 if(!el || reduced() || !el.animate)return Promise.resolve();
 const a=el.animate(frames,{duration:220,easing:'cubic-bezier(0.23,1,0.32,1)',...options});animations.add(a);
 return a.finished.catch(()=>{}).finally(()=>animations.delete(a));
}
export function stopMotion(){animations.forEach(a=>a.cancel());animations.clear();document.querySelectorAll('.tile-ghost').forEach(n=>n.remove());}
export function setPose(container,pose,celebrate=false){container.innerHTML=mascot(pose);if(celebrate)animate(container.firstElementChild,[{transform:'translateY(0)'},{transform:'translateY(-10px)',offset:.4},{transform:'translateY(0)'}],{duration:280});}
export const BASE=location.pathname.startsWith('/game/') || location.pathname==='/game'?'/game':'';
export async function api(path,body,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const res=await fetch(`${BASE}/api/learn${path}`,{method:body===undefined?'GET':'POST',...options,headers:{'Content-Type':'application/json',...options.headers},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
 const result=await res.json();if(!res.ok){const e=new Error(result.error || 'Permintaan belum berhasil. Coba lagi.');e.status=res.status;throw e;}return result;
 }catch(e){if(e.name==='AbortError')throw new Error('Koneksi terlalu lama. Coba lagi, jawabanmu tetap aman.');throw e;}finally{clearTimeout(timer);}
}
class AudioManager{
 constructor(){this.ctx=null;this.nodes=new Set();this.audio=null;this.sequence=0;this.cancelSpeech=null;}
 unlock(){if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(AC)this.ctx=new AC();}this.ctx?.resume().catch(()=>{});}
 effect(kind){if(!preferences.sfx)return;this.unlock();const ctx=this.ctx;if(!ctx)return;
 const notes={tap:[[360,.045]],tile:[[520,.075]],pair:[[660,.10],[880,.14]],correct:[[587,.11],[880,.18]],wrong:[[300,.09],[260,.12]],complete:[[523,.13],[659,.13],[784,.14],[1046,.26]]}[kind] || [];
 const volume=this.audio || window.speechSynthesis?.speaking ? .018:.055;
 notes.forEach(([freq,duration],i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+i*.09;osc.type='sine';osc.frequency.setValueAtTime(freq,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);gain.connect(ctx.destination);this.nodes.add(osc);osc.onended=()=>{this.nodes.delete(osc);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+.02);});}
 stopEffects(){for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();}
 stopSpeech(){this.sequence++;if(this.audio){this.audio.pause();this.audio.src='';this.audio=null;}window.speechSynthesis?.cancel();this.cancelSpeech?.();this.cancelSpeech=null;}
 stop(){this.stopEffects();this.stopSpeech();}
 speak(text,slow=false){this.stopSpeech();if(!preferences.speech)return Promise.reject(new Error('Pelafalan dimatikan. Aktifkan di Pengaturan atau tampilkan teks.'));const seq=this.sequence;
 return new Promise((resolve,reject)=>{let timer;const finish=error=>{clearTimeout(timer);if(seq!==this.sequence)return;this.audio=null;this.cancelSpeech=null;error?reject(new Error('Audio belum tersedia. Coba lagi atau gunakan teks.')):resolve();};
 this.cancelSpeech=()=>{clearTimeout(timer);resolve();};const synth=window.speechSynthesis,voice=synth?.getVoices().find(v=>/^ar[-_]?/i.test(v.lang));
 if(voice){const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang=voice.lang;u.rate=slow ? .65 : .9;u.onend=()=>finish();u.onerror=()=>finish(true);synth.speak(u);}
 else{const a=new Audio(`${BASE}/api/tts?q=${encodeURIComponent(text)}&slow=${slow?'1':'0'}`);this.audio=a;a.onended=()=>finish();a.onerror=()=>finish(true);a.play().catch(()=>finish(true));}
 timer=setTimeout(()=>{if(seq===this.sequence){this.audio?.pause();synth?.cancel();finish(true);}},20000);});}
}
export const audio=new AudioManager();
export function savePreferences(){memory.set('mufrodat.preferences',preferences);document.documentElement.classList.toggle('reduce-motion',reduced());if(reduced())stopMotion();if(!preferences.sfx)audio.stopEffects();if(!preferences.speech)audio.stopSpeech();}
reduceQuery.addEventListener('change',savePreferences);document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.stop();stopMotion();}});savePreferences();
