import {$, esc, mascot, setPose, audio, BASE} from './learn-shared.js';
import {io} from './socket.io/socket.io.esm.min.js';
import {groups, segments, labels, optionsFor, award} from './qiroah-core.mjs';

const socket=io({path:`${BASE}/socket.io`,autoConnect:false});
const call=(event,data={})=>new Promise((resolve,reject)=>{socket.connect();socket.timeout(10000).emit(event,data,(err,r)=>err?reject(new Error('Koneksi terputus. Silakan coba lagi.')):r?.error?reject(new Error(r.error)):resolve(r));});
const root=document.createElement('section');root.className='qiroah';
root.innerHTML=`<div class="section-heading"><div><span class="overline">LATIHAN MEMBACA</span><h2>Qiroah</h2><p>Kenali bentuk kata dan i‘rob, tanpa timer.</p></div><button class="button subtle" id="qp-refresh">Muat teks</button></div><p id="qp-status" role="status">Tekan Muat teks untuk memilih bacaan.</p><div id="qp-list"></div><div id="qp-practice" hidden><h3 id="qp-title"></h3><p>Ketuk bagian emas untuk berlatih. Jika kelompok bertumpuk, pilih kelompok yang ingin dijawab.</p><div class="q-ar" id="qp-text" lang="ar" dir="rtl"></div><div id="qp-groups"></div><p id="qp-score" role="status"></p><button class="text-button" id="qp-restart">Ulangi latihan teks ini</button><div id="qp-question" tabindex="-1" hidden><div id="qp-mascot">${mascot('encourage')}</div><h3>Apa anotasi kelompok ini?</h3><p class="q-ar" id="qp-selected" lang="ar" dir="rtl"></p><p id="qp-kind"></p><div id="qp-options" class="answer-options"></div><p id="qp-feedback" role="status" aria-live="polite"></p><button class="button subtle" id="qp-next" hidden>Anotasi berikutnya</button></div></div>`;
$('home-view').insertBefore(root,document.querySelector('.home-footer'));
let text=null, state={score:0,streak:0,best:0}, answered=new Set(), active=null, queue=[], epoch=0;
const status=m=>$('qp-status').textContent=m;
function stats(){$('qp-score').textContent=`Skor ${state.score} · Streak ${state.streak} jawaban benar beruntun · Terbaik ${state.best} · ${answered.size}/${text.spans.length} anotasi dijawab. Skor hanya untuk sesi teks ini.`;}
async function load(){const ticket=++epoch;$('qp-refresh').disabled=true;try{const r=await call('qiroah:list');if(ticket!==epoch)return;$('qp-list').innerHTML=r.texts.map(t=>`<button class="button subtle" data-qp-text="${t.id}">${esc(t.judul)}</button>`).join('');status(r.texts.length?'Pilih satu bacaan.':'Belum ada teks Qiroah. Minta admin menambahkan bacaan.');}catch(e){status(e.message);}finally{$('qp-refresh').disabled=false;}}
$('qp-refresh').onclick=load;
function begin(){state={score:0,streak:0,best:0};answered=new Set();queue=[];active=null;$('qp-title').textContent=text.judul;$('qp-practice').hidden=false;$('qp-question').hidden=true;$('qp-groups').replaceChildren();
  // Inline spans preserve Arabic joining; split at every boundary to support overlaps.
  $('qp-text').innerHTML=segments(text.teks,text.spans).map(s=>s.active?`<span class="q-highlight ${/^\p{M}+$/u.test(s.text)?'q-mark':''}" role="button" tabindex="0" data-qp-start="${s.start}" data-qp-end="${s.end}" aria-label="Latih kelompok ${esc(s.text)}">${esc(s.text)}</span>`:esc(s.text)).join('');
  stats();status(text.spans.length?'Ketuk kelompok berwarna emas.':'Teks ini belum memiliki anotasi.');
}
$('qp-list').onclick=async e=>{const b=e.target.closest('[data-qp-text]');if(!b)return;const ticket=++epoch;try{const r=await call('qiroah:get',{id:Number(b.dataset.qpText)});if(ticket!==epoch)return;text=r.text;begin();}catch(err){status(err.message);}};
$('qp-restart').onclick=()=>{if(confirm('Mulai ulang skor dan streak untuk teks ini?'))begin();};
function askNext(){active=queue.shift();if(!active){$('qp-question').hidden=true;status(answered.size===text.spans.length?'Latihan selesai! Semua anotasi sudah dijawab. Ulangi bila ingin berlatih lagi.':'Kelompok selesai. Pilih bagian emas lainnya.');return;}
  $('qp-question').hidden=false;$('qp-next').hidden=true;$('qp-selected').textContent=text.teks.slice(active.start,active.end);$('qp-kind').textContent=`Jenis yang ditanyakan: ${labels[active.jenis]}`;$('qp-feedback').textContent='Pilih jawabanmu. Tidak perlu terburu-buru.';setPose($('qp-mascot'),'encourage');
  $('qp-options').replaceChildren();for(const value of optionsFor(active,text.spans)){const b=document.createElement('button');b.className='answer-option';b.textContent=value;b.onclick=()=>answer(value);$('qp-options').append(b);}$('qp-question').focus({preventScroll:true});
}
function choose(group){queue=group.annotations.filter(s=>!answered.has(s.id));$('qp-groups').replaceChildren();askNext();}
$('qp-text').onclick=e=>{const b=e.target.closest('[data-qp-start]');if(!b)return;const start=Number(b.dataset.qpStart),end=Number(b.dataset.qpEnd),matches=groups(text.spans).filter(g=>g.start<=start&&g.end>=end);if(matches.length===1)choose(matches[0]);else{$('qp-groups').replaceChildren();for(const group of matches){const option=document.createElement('button');option.className='button subtle';option.textContent=`Kelompok: ${text.teks.slice(group.start,group.end)}`;option.onclick=()=>choose(group);$('qp-groups').append(option);}}};
$('qp-text').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.target.click();}};
function answer(value){if(!active||answered.has(active.id))return;const correct=value===active.nilai;answered.add(active.id);state=award(state,correct);stats();$('qp-options').querySelectorAll('button').forEach(b=>{b.disabled=true;if(b.textContent===active.nilai)b.classList.add('correct');});
  $('qp-feedback').textContent=correct?`Tepat sekali! +100. ${state.streak>0&&state.streak%5===0?`${state.streak} jawaban benar beruntun!`: 'Satu langkah lebih maju.'}`:`Belum tepat. Jawaban benar: ${active.nilai}.${active.catatan?' '+active.catatan:''} Streak kembali ke 0; skor yang sudah diperoleh tetap milikmu.`;
  setPose($('qp-mascot'),correct?'correct':'thinking',false);audio.effect(correct?'correct':'wrong');$('qp-next').hidden=false;$('qp-next').textContent=queue.length?'Anotasi berikutnya':'Pilih kelompok lain';
}
$('qp-next').onclick=askNext;
