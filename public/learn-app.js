import { $, esc, icon, fillIcons, mascot, memory, preferences, reduced, animate, stopMotion, setPose, api, audio, savePreferences } from './learn-shared.js';

const games = {
 choice:{name:'Pilih Makna',tag:'KENALI KATA',description:'Satu kata, satu makna. Seberapa banyak yang kamu tahu?',bg:'#fff6db',ink:'#a18736',art:'choice'},
 pairs:{name:'Temukan Pasangan',tag:'HUBUNGKAN MAKNA',description:'Pertemukan kata Arab dengan pasangan artinya.',bg:'#eef4e8',ink:'#829b68',art:'pairs'},
 listen:{name:'Dengar & Temukan',tag:'LATIH TELINGAMU',description:'Dengarkan baik-baik. Temukan arti yang tepat.',bg:'#edf3f8',ink:'#789cb6',art:'listen'},
 arrange:{name:'Susun Kata',tag:'RANGKAI JAWABAN',description:'Kepingan kecil, makna yang utuh. Susun dan temukan.',bg:'#f3edf8',ink:'#a08bb6',art:'arrange'},
 dialogue:{name:'Sambung Percakapan',tag:'COBA UNGKAPKAN',description:'Ada cerita kecil. Apa yang akan kamu ucapkan?',bg:'#fbefeb',ink:'#b78c7c',art:'dialogue'},
 cloze:{name:'Lengkapi Pola',tag:'TEMUKAN POLANYA',description:'Isi bagian yang hilang dan buat kalimatmu sendiri.',bg:'#edf3ed',ink:'#819b80',art:'cloze'},
};
const categoryNames={mufrodat:'Mufrodat',tabirot:'Ta’birot',uslub:'Uslub'};
let catalog=null, category='mufrodat', session=null, selected=null, picked=[], pairSelection={left:null,right:null};
let epoch=0, busy=false, view='home', modeForDialog='choice';
const history=()=>memory.get('mufrodat.history',[]);
function errorAt(id,error){$(id).textContent=error?.message || String(error);$(id).hidden=false;}
function clearError(id){$(id).hidden=true;$(id).textContent='';}
function updateTotals(){$('total-xp').textContent=history().reduce((n,r)=>n+r.score,0);}
function switchView(name){epoch++;busy=false;audio.stop();stopMotion();$('celebration').replaceChildren();view=name;
 document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==`${name}-view`);
 document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
 $('page-label').textContent={home:'Permainan',progress:'Perjalananmu',lesson:'Latihan',result:'Hasil latihan'}[name];
 window.scrollTo({top:0,behavior:'instant'});$('main').focus({preventScroll:true});
 if(name==='home')updateResume();if(name==='progress')renderHistory();
}
function art(type){
 if(type==='choice'||type==='pairs')return `<span class="art-tile" lang="ar">${type==='choice'?'كِتَابٌ':'قَلَمٌ'}</span><span class="art-tile second">${type==='choice'?'buku':'pena'}</span><span class="art-check">${icon('check')}</span>`;
 if(type==='listen')return `<span class="art-icon">${icon('headphones')}</span><span class="sound-bars"><i></i><i></i><i></i><i></i></span>`;
 if(type==='arrange')return '<span class="mini-tiles" dir="rtl"><span>أَنَا</span><span>أَتَعَلَّمُ</span></span>';
 return `<span class="art-chat" lang="ar" dir="rtl">${type==='dialogue'?'كَيْفَ حَالُكَ؟':'أُرِيدُ ...'}</span>`;
}
function renderCatalog(){if(!catalog)return;
 const chapters=catalog.chapters.filter(c=>c.category===category);
 $('games').innerHTML=Object.entries(games).filter(([mode])=>catalog.modes[mode].categories.includes(category)).map(([mode,g])=>{
 const count=chapters.filter(c=>c.modes[mode]).length;
 return `<button class="game-card" data-game="${mode}" ${count?'':'disabled'} style="--art-bg:${g.bg};--art-ink:${g.ink}"><div class="game-art" aria-hidden="true">${art(g.art)}</div><small>${g.tag}</small><h3>${g.name}</h3><p>${g.description}</p><div class="game-bottom"><span>${icon('clock')} ±2 menit · ${count} tema</span><span class="go">${icon('arrow')}</span></div></button>`;
 }).join('');
 $('theme-count').textContent=`${chapters.length} tema`;
 $('themes').innerHTML=chapters.map((c,i)=>`<button class="theme-card" data-theme="${c.id}"><span class="theme-icon">${icon(i%2?'home':'book')}</span><span><strong>${esc(c.title)}</strong><small>${c.count} materi · ${esc(c.program_name)}</small></span><span class="arrow-icon">${icon('arrow')}</span></button>`).join('');
 $('catalog-status').hidden=chapters.length>0;
 if(!chapters.length)$('catalog-status').textContent='Materi kategori ini sedang disiapkan. Coba kategori lainnya.';
}
async function loadCatalog(){try{catalog=await api('/catalog');renderCatalog();}catch(e){$('catalog-status').hidden=false;$('catalog-status').innerHTML=`<p>${esc(e.message)}</p><button id="retry-catalog" class="button subtle">Coba lagi</button>`;$('retry-catalog').onclick=loadCatalog;}}
function themeCard(c,mode){const count=c.modes[mode];return `<button class="theme-card" data-start="${c.id}" ${count?'':'disabled'}><span class="theme-icon">${icon('book')}</span><span><strong>${esc(c.title)}</strong><small>${count?`${Math.min(count,8)} materi · ${esc(c.description)}`:'Materi untuk mode ini belum cukup.'}</small></span><span class="arrow-icon">${icon('arrow')}</span></button>`;}
function chooseTheme(mode,chapterId){if(!catalog)return;audio.effect('tap');modeForDialog=mode;clearError('start-error');$('theme-dialog-title').textContent=games[mode].name;$('theme-dialog-copy').textContent=`Pilih tema ${categoryNames[category]} yang ingin kamu latih.`;
 const chapters=catalog.chapters.filter(c=>c.category===category && (!chapterId || c.id===chapterId));
 $('theme-options').innerHTML=chapters.map(c=>themeCard(c,mode)).join('') || '<p class="muted">Belum ada tema. Tambahkan materi melalui admin.</p>';
 $('theme-dialog').showModal();
}
function updateResume(){const active=memory.get('mufrodat.active',null);$('resume').hidden=!active;$('resume-name').textContent=active?.title || '';}
async function start(chapterId,mode,reviewIds){if(busy)return;busy=true;const ticket=epoch;clearError('start-error');document.querySelectorAll('[data-start]').forEach(b=>b.disabled=true);
 try{audio.unlock();const result=await api('/sessions',{chapterId,mode,reviewIds});if(ticket!==epoch)return;
 session=result;memory.set('mufrodat.active',{id:session.sessionId,title:session.chapter.title});$('theme-dialog').close();switchView('lesson');renderQuestion();
 }catch(e){if(ticket!==epoch)return;if($('theme-dialog').open)errorAt('start-error',e);else{errorAt('lesson-error',e);if(view==='result'){$('result-description').textContent=e.message;}}}
 finally{if(ticket===epoch)busy=false;document.querySelectorAll('[data-start]').forEach(b=>{const c=catalog?.chapters.find(c=>c.id===Number(b.dataset.start));b.disabled=!c?.modes[modeForDialog];});}
}
async function resume(){const active=memory.get('mufrodat.active',null);if(!active||busy)return;busy=true;try{session=await api(`/sessions/${active.id}`);switchView(session.done?'result':'lesson');session.done?showResult():renderQuestion();}catch(e){if(e.status===410){memory.remove('mufrodat.active');updateResume();}$('catalog-status').hidden=false;$('catalog-status').textContent=e.message;}finally{busy=false;}}
function setProgress(completed){const p=completed/session.total;$('lesson-fill').style.transform=`scaleX(${p})`;$('lesson-fill').parentElement.setAttribute('aria-valuenow',Math.round(p*100));$('lesson-count').textContent=`${Math.min(session.index+1,session.total)} / ${session.total}`;}
const prompts={choice:'Apa arti kata ini?',pairs:'Temukan pasangan yang tepat',listen:'Dengarkan, lalu pilih artinya',arrange:'Susun jawaban dalam bahasa Arab',dialogue:'Apa yang akan kamu ucapkan?',cloze:'Lengkapi pola kalimat ini'};
const tips={choice:'Kenali maknanya, satu kata setiap kali.',pairs:'Pilih satu kartu Arab dan satu kartu arti.',listen:'Ketuk speaker. Kamu boleh mendengarkan lagi.',arrange:'Ketuk kepingan sesuai urutan. Ketuk lagi untuk mengembalikan.',dialogue:'Bayangkan dirimu dalam situasi ini.',cloze:'Gunakan arti kalimat untuk menemukan bagian yang hilang.'};
function renderQuestion(){if(session.done)return showResult();const q=session.question;busy=false;selected=null;picked=[];pairSelection={left:null,right:null};audio.stopSpeech();stopMotion();clearError('lesson-error');
 $('lesson-mode').textContent=`${categoryNames[session.chapter.category]} / ${games[session.mode].name}`;$('lesson-title').textContent=prompts[q.mode];setProgress(session.index);
 setPose($('lesson-mascot'),'encourage');$('guide-copy').textContent=tips[q.mode];$('feedback').className='feedback-panel';$('feedback-title').textContent='Tidak perlu terburu-buru.';$('feedback-copy').textContent='Setiap percobaan adalah bagian dari belajar.';
 $('check-answer').disabled=true;$('check-answer').innerHTML=`Periksa jawaban ${icon('check')}`;
 if(q.mode==='pairs'){$('question-area').innerHTML=`<div class="pair-grid"><div class="pair-column">${q.left.map(p=>`<button class="pair-card ar" data-left="${p.id}" lang="ar" dir="rtl">${esc(p.text)}</button>`).join('')}</div><div class="pair-column">${q.right.map(p=>`<button class="pair-card" data-right="${p.id}">${esc(p.text)}</button>`).join('')}</div></div><p class="arrange-hint" style="margin-top:16px">Pasangan yang tepat akan ditandai centang.</p>`;applyPairs(q.matched || []);}
 else if(q.mode==='arrange'){$('question-area').innerHTML=`<p class="meaning-prompt">${esc(q.meaning)}</p><div id="tile-tray" class="arrange-tray" dir="rtl" aria-label="Jawaban tersusun"></div><div id="assembled" class="assembled-preview" lang="ar" dir="rtl" aria-live="polite"></div><div id="tile-bank" class="tile-bank" dir="rtl">${q.tiles.map(t=>`<button class="word-tile" data-tile="${t.id}" lang="ar" aria-label="Pilih ${esc(t.text)}">${esc(t.text)}</button>`).join('')}</div><p class="arrange-hint">Kepingan dapat dikembalikan sebelum jawaban diperiksa.</p>`;}
 else {
 let prompt=q.mode==='listen'?`<div class="listen-stage"><button class="listen-main" id="play-audio" aria-label="Dengarkan pelafalan">${icon('volume')}</button><span class="muted">Dengarkan kata atau ungkapannya</span><div class="audio-actions"><button class="text-button" id="slow-audio">Putar lebih lambat</button><button class="text-button" id="reveal-audio">Tampilkan teks</button><button class="text-button" id="skip-audio">Lewati</button></div><p id="audio-note" class="audio-note" role="status"></p><p id="revealed-audio" class="revealed-audio" lang="ar" dir="rtl" hidden>${esc(q.audioText)}</p></div>`:
 `<div class="question-prompt ${q.mode==='dialogue'?'context':'ar'}" ${q.mode==='dialogue'?'':'lang="ar" dir="rtl"'}>${esc(q.prompt)}</div>${q.mode==='cloze'?`<p class="meaning-prompt">${esc(q.meaning)}</p>`:''}`;
 $('question-area').innerHTML=prompt+`<div class="answer-options">${q.options.map((o,i)=>`<button class="answer-option" data-option="${o.id}" aria-pressed="false"><span class="option-number">${i+1}</span><span ${q.answerLang==='ar'?'class="ar" lang="ar" dir="rtl"':''}>${esc(o.text)}</span></button>`).join('')}</div>`;
 }
 if(session.feedback)showFeedback(session.feedback,false);
 $('lesson-title').focus({preventScroll:true});animate($('question-area'),[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180});
}
function applyPairs(matched){for(const p of matched){for(const side of ['left','right']){const el=document.querySelector(`[data-${side}="${p[side]}"]`);if(el){el.disabled=true;el.classList.remove('selected');el.classList.add('matched');el.setAttribute('aria-label',`${el.textContent}, pasangan ditemukan`);}}}}
async function selectPair(button){if(busy||session.feedback||button.disabled)return;audio.effect('tap');const side=button.dataset.left?'left':'right',id=button.dataset[side];
 document.querySelectorAll(`[data-${side}]`).forEach(el=>el.classList.remove('selected','incorrect'));button.classList.add('selected');pairSelection[side]=id;
 if(!pairSelection.left || !pairSelection.right)return;
 busy=true;const ticket=epoch,qid=session.question.id,chosen={...pairSelection};pairSelection={left:null,right:null};
 try{const result=await api(`/sessions/${session.sessionId}/pair`,{questionId:qid,...chosen});if(ticket!==epoch)return;session.question.matched=result.matched;applyPairs(result.matched);
 const elements=['left','right'].map(side=>document.querySelector(`[data-${side}="${chosen[side]}"]`));
 elements.forEach(el=>el.classList.remove('selected'));
 if(result.correct){audio.effect('pair');$('guide-copy').textContent='Cocok! Temukan pasangan berikutnya.';setPose($('lesson-mascot'),'correct',true);}
 else{audio.effect('wrong');$('guide-copy').textContent='Belum cocok. Coba pasangan yang lain, ya.';setPose($('lesson-mascot'),'thinking');elements.forEach(el=>el.classList.add('incorrect'));await Promise.all(elements.map(el=>animate(el,[{transform:'translateX(0)'},{transform:'translateX(-3px)',offset:.3},{transform:'translateX(3px)',offset:.65},{transform:'translateX(0)'}],{duration:180})));if(ticket!==epoch)return;elements.forEach(el=>el.classList.remove('incorrect'));}
 if(result.feedback)showFeedback(result.feedback);
 }catch(e){if(ticket===epoch){errorAt('lesson-error',e);document.querySelectorAll('.pair-card.selected').forEach(el=>el.classList.remove('selected'));}}
 finally{if(ticket===epoch)busy=false;}
}
async function moveTile(button){if(busy||session.feedback||button.disabled)return;const q=session.question,id=button.dataset.tile || button.dataset.picked;const bank=document.querySelector(`[data-tile="${id}"]`),removing=!!button.dataset.picked;
 const before=button.getBoundingClientRect();let destination;
 if(removing){picked=picked.filter(x=>x!==id);button.remove();bank.classList.remove('used');bank.disabled=false;destination=bank;}
 else{picked.push(id);bank.classList.add('used');bank.disabled=true;destination=document.createElement('button');destination.className='word-tile';destination.dataset.picked=id;destination.lang='ar';destination.textContent=bank.textContent;destination.setAttribute('aria-label',`Kembalikan ${bank.textContent}`);$('tile-tray').append(destination);}
 $('assembled').textContent=picked.map(id=>q.tiles.find(t=>t.id===id).text).join(q.separator);$('check-answer').disabled=picked.length!==q.tiles.length;audio.effect('tile');
 if(reduced())return;const after=destination.getBoundingClientRect(),ghost=destination.cloneNode(true);ghost.removeAttribute('data-tile');ghost.removeAttribute('data-picked');ghost.removeAttribute('aria-label');ghost.setAttribute('aria-hidden','true');ghost.classList.add('tile-ghost');ghost.style.cssText=`left:${after.left}px;top:${after.top}px;width:${after.width}px;height:${after.height}px`;document.body.append(ghost);destination.style.opacity='0';
 await animate(ghost,[{transform:`translate(${before.left-after.left}px,${before.top-after.top}px)`},{transform:'translate(0,0)'}],{duration:220});ghost.remove();destination.style.opacity='';
}
function showFeedback(result,withSound=true){session.feedback=result;session.score=result.score;busy=false;setProgress(session.index+1);
 const ok=result.correct,skip=result.skipped,pairs=session.mode==='pairs';
 $('feedback').className=`feedback-panel ${skip?'':ok?'ok':'no'}`;$('feedback').querySelector('.feedback-symbol').innerHTML=icon(ok?'check':'refresh');
 $('feedback-title').textContent=skip?'Kita lanjutkan, ya.':pairs?'Semua pasangan ditemukan!':ok?'Tepat sekali!':'Kita pelajari lagi, ya.';
 $('feedback-copy').textContent=skip?'Soal ini dilewati tanpa penalti.':`${result.explanation}${result.points?` · +${result.points} XP`:''}`;
 $('guide-copy').textContent=skip?'Kamu bisa kembali berlatih mendengar nanti.':ok?'أَحْسَنْتَ! Satu langkah lebih maju.':'Perhatikan jawabannya. Kamu boleh mencoba lagi setelah sesi ini.';
 setPose($('lesson-mascot'),skip?'encourage':ok?'correct':'thinking',withSound&&ok);
 document.querySelectorAll('#question-area button').forEach(el=>{if(!['play-audio','slow-audio','reveal-audio'].includes(el.id))el.disabled=true;});
 if(selected){const el=document.querySelector(`[data-option="${selected}"]`);el?.classList.add(ok?'correct':'incorrect');}
 if(withSound&&!skip)audio.effect(ok?'correct':'wrong');$('check-answer').innerHTML=`${session.index===session.total-1?'Lihat hasil':'Lanjut'} ${icon('arrow')}`;$('check-answer').disabled=false;
}
async function submit(skip=false){if(busy||!session||session.feedback)return;busy=true;const ticket=epoch,qid=session.question.id;clearError('lesson-error');$('check-answer').disabled=true;$('check-answer').textContent='Memeriksa…';
 try{const result=await api(`/sessions/${session.sessionId}/answer`,{questionId:qid,optionId:selected,tiles:picked,skip});if(ticket===epoch)showFeedback(result);}
 catch(e){if(ticket===epoch){errorAt('lesson-error',e);$('check-answer').disabled=false;$('check-answer').textContent='Coba periksa lagi';}}
 finally{if(ticket===epoch)busy=false;}
}
async function next(){if(busy||!session.feedback)return;busy=true;const ticket=epoch;clearError('lesson-error');$('check-answer').disabled=true;audio.effect('tap');audio.stopSpeech();
 try{const result=await api(`/sessions/${session.sessionId}/next`,{questionId:session.question.id});if(ticket!==epoch)return;session=result;session.done?showResult():renderQuestion();}
 catch(e){if(ticket===epoch){errorAt('lesson-error',e);$('check-answer').disabled=false;}}finally{if(ticket===epoch)busy=false;}}
async function speak(slow){const q=session.question,button=$('play-audio');if(!button)return;const ticket=epoch;button.classList.add('speaking');$('audio-note').textContent='';try{await audio.speak(q.audioText,slow);}catch(e){if(ticket===epoch)$('audio-note').textContent=e.message;}finally{if(ticket===epoch)button.classList.remove('speaking');}}
function celebrate(){if(reduced())return;const colors=['#ffce3d','#8fac79','#dfaa87','#94b8c7'];for(let i=0;i<24;i++){const p=document.createElement('i');p.className='confetti-piece';p.style.background=colors[i%4];$('celebration').append(p);const angle=i/24*Math.PI*2,dist=80+Math.random()*200;animate(p,[{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:`translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist-80}px) rotate(${i*30}deg)`,opacity:1,offset:.55},{transform:`translate(${Math.cos(angle)*dist*1.3}px,${Math.sin(angle)*dist+130}px) rotate(${i*60}deg)`,opacity:0}],{duration:850,easing:'ease-out'}).finally(()=>p.remove());}}
function showResult(){switchView('result');memory.remove('mufrodat.active');const r=session.result;const previous=history();if(!previous.some(h=>h.id===session.sessionId)){previous.unshift({id:session.sessionId,title:session.chapter.title,mode:session.mode,score:r.score,correct:r.correct,total:r.total,studied:r.studied,date:new Date().toISOString()});memory.set('mufrodat.history',previous.slice(0,200));}updateTotals();
 setPose($('result-mascot'),'complete',true);$('result-description').textContent=`Kamu berlatih ${r.studied} materi dalam tema “${session.chapter.title}”.`;
 $('result-stats').innerHTML=`<div class="result-stat"><small>XP didapat</small><strong>+${r.score}</strong></div><div class="result-stat"><small>${session.mode==='pairs'?'Ronde tanpa keliru':'Jawaban tepat'}</small><strong>${r.correct}/${r.total-r.skipped}</strong></div><div class="result-stat"><small>Materi dilatih</small><strong>${r.studied}</strong></div>`;
 const review=[...new Map(r.review.map(i=>[i.id,i])).values()];$('review-list').innerHTML=review.length?`<div class="review-list"><h3>Bekal untuk percobaan berikutnya</h3>${review.map(i=>`<div class="review-row"><span class="ar" lang="ar" dir="rtl">${esc(i.arab)}</span><span>${esc(i.meaning)}</span></div>`).join('')}</div>`:'';
 $('review-button').hidden=!review.length;$('review-button').onclick=()=>start(session.chapter.id,'arrange',review.map(i=>i.id));$('again-button').onclick=()=>start(session.chapter.id,session.mode);
 audio.effect('complete');celebrate();
}
function renderHistory(){const rows=history();$('history').innerHTML=rows.length?rows.map(h=>`<div class="history-card"><span class="history-icon">${icon('flag')}</span><div><b>${esc(h.title)}</b><p>${games[h.mode]?.name || 'Latihan'} · ${new Date(h.date).toLocaleDateString('id-ID',{day:'numeric',month:'long'})} · ${h.studied} materi</p></div><strong>+${h.score} XP</strong></div>`).join(''):`<div class="state-panel"><span class="empty-icon">${icon('flag')}</span><h2>Langkah pertamamu menunggu.</h2><p>Selesaikan satu latihan, lalu lihat perjalananmu di sini.</p><button class="button primary" id="history-start">Pilih permainan ${icon('arrow')}</button></div>`;if($('history-start'))$('history-start').onclick=()=>switchView('home');}
function settingsUI(){for(const key of ['sfx','speech','motion'])$(`setting-${key}`).checked=!!preferences[key];$('quick-sound').innerHTML=icon(preferences.sfx?'volume':'mute');$('quick-sound').setAttribute('aria-pressed',String(!preferences.sfx));$('quick-sound').setAttribute('aria-label',preferences.sfx?'Matikan efek suara':'Aktifkan efek suara');}
fillIcons();$('welcome-mascot').innerHTML=mascot('welcome');updateTotals();updateResume();settingsUI();loadCatalog();
const sprite=new Image();sprite.src='assets/mascot-poses.png';sprite.decode?.().catch(()=>{});
document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-pressed',String(t===b));});audio.effect('tap');renderCatalog();});
$('games').onclick=e=>{const b=e.target.closest('[data-game]');if(b)chooseTheme(b.dataset.game);};
$('themes').onclick=e=>{const b=e.target.closest('[data-theme]');if(b)chooseTheme('choice',Number(b.dataset.theme));};
$('theme-options').onclick=e=>{const b=e.target.closest('[data-start]');if(b)start(Number(b.dataset.start),modeForDialog);};
$('recommended').onclick=()=>chooseTheme('choice');$('resume').onclick=resume;
document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>switchView(b.dataset.nav));
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('theme-dialog').addEventListener('close',()=>{if(busy&&view!=='lesson'){epoch++;busy=false;}});
$('settings-button').onclick=()=>{$('settings-dialog').showModal();settingsUI();};
for(const key of ['sfx','speech','motion'])$(`setting-${key}`).onchange=e=>{preferences[key]=e.target.checked;savePreferences();settingsUI();};
$('quick-sound').onclick=()=>{preferences.sfx=!preferences.sfx;savePreferences();settingsUI();if(preferences.sfx)audio.effect('tap');};
$('exit-lesson').onclick=()=>$('exit-dialog').showModal();$('stay-lesson').onclick=()=>$('exit-dialog').close();$('confirm-exit').onclick=()=>{$('exit-dialog').close();switchView('home');};$('back-home').onclick=()=>switchView('home');
$('check-answer').onclick=()=>session.feedback?next():submit();
$('question-area').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='play-audio')return speak(false);if(b.id==='slow-audio')return speak(true);if(b.id==='reveal-audio'){$('revealed-audio').hidden=false;return;}if(b.id==='skip-audio')return submit(true);if(busy||session.feedback)return;
 if(b.dataset.option){selected=b.dataset.option;document.querySelectorAll('[data-option]').forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));});$('check-answer').disabled=false;audio.effect('tap');}
 if(b.dataset.left||b.dataset.right)selectPair(b);if(b.dataset.tile||b.dataset.picked)moveTile(b);
};
