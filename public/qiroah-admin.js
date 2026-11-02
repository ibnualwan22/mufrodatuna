import {$, esc, BASE} from './learn-shared.js';
import {io} from './socket.io/socket.io.esm.min.js';
import {labels, examples} from './qiroah-core.mjs';
import {finalVowel} from './qiroah-reading-text.mjs';

export function initQiroahAdmin(getPassword) {
  const socket=io({path:`${BASE}/socket.io`,autoConnect:false});
  const root=document.createElement('section');root.className='qiroah';root.id='qiroah-admin';
  root.innerHTML=`<div class="section-heading"><div><h2>Qiroah</h2><p>Susun bacaan per bab, lalu beri catatan dan hubungan yang dibutuhkan siswa.</p></div><button class="button primary" id="q-new">Tambah teks</button></div>
    <p id="q-status" role="status"></p><div id="q-list"></div>
    <form id="q-editor" hidden><h3>Editor teks Qiroah</h3><label for="q-chapter">Bab</label><input id="q-chapter" required maxlength="200" placeholder="Contoh: Na‘at dan Man‘ut"><label for="q-title">Judul bacaan</label><input id="q-title" required maxlength="200">
    <label for="q-text">Teks Arab (harakat dipertahankan)</label><textarea id="q-text" lang="ar" dir="rtl" rows="6" maxlength="50000" required></textarea>
    <p>Ketuk kata; Shift + ketuk kata terakhir untuk beberapa kata. Atau sorot huruf/kata dengan seleksi teks, lalu tekan “Gunakan seleksi”. Di perangkat sentuh, tekan lama untuk menyeleksi.</p>
    <div id="q-preview" class="q-ar q-select" lang="ar" dir="rtl"></div><button type="button" class="button subtle" id="q-selection">Gunakan seleksi</button>
    <p id="q-range" role="status">Belum ada kelompok dipilih.</p><p id="q-anchor-warning" class="inline-error" role="alert" hidden></p>
    <label for="q-kind">Jenis anotasi</label><select id="q-kind">${Object.entries(labels).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>
    <label for="q-value">Nilai</label><input id="q-value" maxlength="200"><select id="q-kalimat" aria-label="Nilai kalimat" hidden>${examples.kalimat.map(v=>`<option>${esc(v)}</option>`).join('')}</select>
    <div class="q-note-editor-heading"><label>Referensi jawaban · catatan</label></div><div id="q-note-fields"></div><p class="q-muted">Catatan menjelaskan jawaban untuk bagian teks yang sedang dianotasi. Tambahkan judul dan isi seperlunya; catatan lama tetap tersimpan.</p>
    <details class="q-detective-editor"><summary>Tantangan Detektif (opsional)</summary><label for="q-false-claim">Pernyataan analisis yang sengaja keliru</label><textarea id="q-false-claim" maxlength="2000" rows="2" placeholder="Contoh: Kata ini adalah maf‘ul bih."></textarea><label for="q-correction">Koreksi yang akan dibahas setelah siswa memilih</label><textarea id="q-correction" maxlength="2000" rows="2" placeholder="Jelaskan alasan analisis tersebut keliru."></textarea></details>
    <div class="q-admin-answer-actions"><button type="button" class="button subtle" id="q-note-add">+ Tambah catatan · referensi</button><button type="button" class="button primary" id="q-add">+ Tambah anotasi · kunci jawaban</button></div><button type="button" class="text-button" id="q-cancel-annotation" hidden>Batal ubah anotasi</button><div id="q-annotations"></div>
    <p>Perubahan anotasi masih berupa draf sampai “Simpan teks & anotasi” ditekan. Mengubah isi teks memerlukan penghapusan anotasi lama agar posisi tidak bergeser.</p>
    <button type="button" class="text-button" id="q-unlock">Coba sesuaikan posisi anotasi setelah teks diubah</button>
    <section class="q-admin-relations"><h4>Hubungan antarbagian</h4><p class="q-muted">Hubungkan bagian yang sudah tersimpan, atau pilih unsur taqdir yang tidak tertulis.</p><div class="q-relation-form"><select id="q-rel-from" aria-label="Bagian awal hubungan"></select><select id="q-rel-to" aria-label="Bagian tujuan hubungan"></select><select id="q-rel-kind" aria-label="Jenis hubungan"><option>Na‘at–man‘ut</option><option>‘Athaf–ma‘thuf ‘alaih</option><option>Badal–mubdal minhu</option><option>Mudhaf–mudhaf ilaih</option><option>Amil–ma‘mul</option><option>Hubungan lain</option></select><input id="q-rel-label" maxlength="200" placeholder="Label hubungan"><input id="q-rel-note" maxlength="2000" placeholder="Catatan hubungan"><button type="button" class="button subtle" id="q-rel-add">Tambah hubungan</button></div><div id="q-relations"></div></section>
    <section class="q-admin-reading"><div class="q-admin-reading-heading"><div><h4>Target Latihan Membaca</h4><p class="q-muted">Pilih satu kata utuh dari pratinjau di atas. Harakat akhir harus sudah tertulis pada sumber, lalu periksa acuan bunyinya.</p></div><span id="q-reading-state" role="status"></span></div><div class="q-admin-reading-add"><select id="q-reading-vowel" aria-label="Acuan harakat akhir"><option value="u">ـُ dhammah (u)</option><option value="a">ـَ fathah (a)</option><option value="i">ـِ kasrah (i)</option></select><input id="q-reading-note" maxlength="500" placeholder="Catatan i‘rab singkat untuk rangkuman"><button type="button" class="button subtle" id="q-reading-add">+ Jadikan target</button></div><div id="q-reading-targets"></div><button type="button" class="button primary" id="q-reading-save">Simpan target membaca</button><button type="button" class="button subtle" id="q-reading-reload">Muat ulang target</button><p id="q-reading-message" role="status" class="q-muted"></p></section>
    <div class="dialog-actions"><button class="button primary" type="submit">Simpan teks & anotasi</button><button type="button" class="button subtle" id="q-cancel">Tutup editor</button></div></form>`;
  $('editor-panel').append(root);
  let draft=null, range=null, anchor=null, editing=-1, dirty=false, selection=null, epoch=0, noteDraft=[], originalText='', anchorError='';
  let readingTargets=[],readingRevision=0,readingDirty=false,readingTicket=0,readingSavedText='';
  const status=message=>$('q-status').textContent=message;
  const call=(event,data={})=>new Promise((resolve,reject)=>{
    socket.connect();socket.timeout(10000).emit(event,{...data,password:getPassword()},(err,r)=>err?reject(new Error('Koneksi terputus. Coba lagi; draf tetap tersedia.')):r?.error?reject(new Error(r.error)):resolve(r));
  });
  const safe=fn=>async()=>{try{await fn();}catch(e){status(e.message);}};
  async function refresh(){const ticket=epoch;const r=await call('admin:qiroahList');if(ticket!==epoch)return;
    const chapters=[...new Set(r.texts.map(t=>t.bab||'Materi sebelumnya'))];
    $('q-list').innerHTML=chapters.map(b=>`<section class="q-admin-chapter"><h3>${esc(b)}</h3>${r.texts.filter(t=>(t.bab||'Materi sebelumnya')===b).map(t=>`<div class="q-row"><strong>${esc(t.judul)}</strong><small>Versi ${t.versi||1}</small><button type="button" class="text-button" data-q-edit="${t.id}">Ubah</button><button type="button" class="text-button" data-q-delete="${t.id}">Hapus</button></div>`).join('')}</section>`).join('')||'<p>Belum ada teks Qiroah.</p>';
  }
  function choose(start,end){range={start,end};const word=$('q-text').value.slice(start,end);$('q-range').textContent=`Kelompok [${start}, ${end}): ${word}`;const suggested=finalVowel(word);if(suggested)$('q-reading-vowel').value=suggested;}
  function preview(){const text=$('q-text').value;range=null;selection=null;anchor=null;$('q-range').textContent='Belum ada kelompok dipilih.';
    $('q-preview').innerHTML=[...text.matchAll(/\s+|[\p{Script=Arabic}\p{M}]+|[^\s\p{Script=Arabic}\p{M}]+/gu)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length})).map(t=>/^\s+$/u.test(t.text)?esc(t.text):`<span tabindex="0" role="button" data-start="${t.start}" data-end="${t.end}" aria-label="Pilih kata ${esc(t.text)}">${esc(t.text)}</span>`).join('');
  }
  function renderNoteFields(){ $('q-note-fields').innerHTML=noteDraft.map((n,i)=>`<div class="q-note-field"><label for="q-note-title-${i}">Judul catatan ${i+1}</label><input id="q-note-title-${i}" data-note-title="${i}" value="${esc(n.judul||'')}" maxlength="200" placeholder="Contoh: Kedudukan"><label for="q-note-body-${i}">Isi catatan</label><textarea id="q-note-body-${i}" data-note-body="${i}" maxlength="2000" rows="2">${esc(n.isi||'')}</textarea><button type="button" class="text-button" data-note-remove="${i}">Hapus catatan</button></div>`).join(''); }
  function resetAnnotation(){editing=-1;noteDraft=[];renderNoteFields();$('q-false-claim').value='';$('q-correction').value='';$('q-add').textContent='+ Tambah anotasi · kunci jawaban';$('q-value').value='';$('q-cancel-annotation').hidden=true;}
  function renderAnnotations(){
    $('q-annotations').innerHTML=draft.spans.map((s,i)=>`<div class="q-row"><div><b lang="ar" dir="rtl">${esc($('q-text').value.slice(s.start,s.end))}</b> · ${labels[s.jenis]}: ${esc(s.nilai)}${(s.notes||[]).map(n=>`<p><strong>${esc(n.judul)}</strong> · ${esc(n.isi)}</p>`).join('')}<small>[${s.start}, ${s.end})</small></div><button type="button" class="text-button" data-q-span="${i}">Ubah</button><button type="button" class="text-button" data-q-remove="${i}">Hapus</button></div>`).join('');
    renderRelations();
  }
  function renderRelations(){const options=draft.spans.map(s=>`<option value="${s.id||''}" ${s.id?'':'disabled'}>${esc($('q-text').value.slice(s.start,s.end))}${s.id?'':' · simpan dahulu'}</option>`).join('');$('q-rel-from').innerHTML=options+'<option value="taqdir:muqaddar">Unsur taqdir</option>';$('q-rel-to').innerHTML=options+'<option value="taqdir:muqaddar">Unsur taqdir</option>';$('q-relations').innerHTML=(draft.relations||[]).map((r,i)=>`<div class="q-row"><div><b>${esc(r.label)}</b><p>${esc(r.jenis)} · ${esc(r.catatan||'')}</p></div><button type="button" class="text-button" data-rel-remove="${i}">Hapus</button></div>`).join('')||'<p class="q-muted">Belum ada hubungan.</p>';}
  function renderReading(){
    $('q-reading-targets').innerHTML=readingTargets.map((t,i)=>`<div class="q-reading-target-row"><span class="q-reading-target-word" lang="ar" dir="rtl">${esc($('q-text').value.slice(t.start,t.end))}</span><span class="q-reading-target-key">${{a:'fathah · a',i:'kasrah · i',u:'dhammah · u'}[t.expected]||'—'}</span><input data-reading-note="${i}" value="${esc(t.note||'')}" maxlength="500" aria-label="Catatan i‘rab untuk ${esc($('q-text').value.slice(t.start,t.end))}" placeholder="Catatan i‘rab untuk rangkuman"><button type="button" class="text-button" data-reading-remove="${i}">Hapus</button></div>`).join('')||'<p class="q-muted">Belum ada kata sasaran. Simpan bacaan, lalu pilih target latihan.</p>';
    $('q-reading-state').textContent=!draft?.id?'Simpan bacaan dahulu':readingDirty?'Perubahan belum disimpan':readingTargets.length?'Acuan tersimpan':'Belum aktif';
  }
  async function loadReading(text){
    const ticket=++readingTicket;readingTargets=[];readingRevision=0;readingDirty=false;readingSavedText=text.teks;renderReading();
    $('q-reading-save').disabled=true;$('q-reading-add').disabled=true;
    if(!text.id)return;
    try{const r=await call('admin:qiroahReadingGet',{id:text.id});if(ticket!==readingTicket)return;readingTargets=r.reading.targets;readingRevision=r.reading.revision;renderReading();$('q-reading-message').textContent=r.reading.ready?'Target suara siap dipakai.':'Target perlu diperiksa sebelum latihan suara aktif.';}
    catch(e){if(ticket===readingTicket)$('q-reading-message').textContent=e.message;}
    finally{if(ticket===readingTicket){$('q-reading-save').disabled=false;$('q-reading-add').disabled=false;}}
  }
  function open(text){draft=text;dirty=false;resetAnnotation();$('q-chapter').value=text.bab||'Materi sebelumnya';$('q-title').value=text.judul;$('q-text').value=text.teks;originalText=text.teks;anchorError='';$('q-editor').hidden=false;preview();renderAnnotations();$('q-title').focus();$('q-reading-message').textContent='';loadReading(text);}
  const discard=()=>!(dirty||readingDirty)||confirm('Tutup draf tanpa menyimpan perubahan?');
  $('q-new').onclick=()=>{if(discard())open({judul:'',bab:'Bab baru',teks:'',spans:[],relations:[]});};
  $('q-list').onclick=async e=>{const edit=e.target.closest('[data-q-edit]'),del=e.target.closest('[data-q-delete]');try{
    if(edit&&discard()){const ticket=epoch,r=await call('admin:qiroahGet',{id:Number(edit.dataset.qEdit)});if(ticket===epoch)open(r.text);}
    if(del&&confirm('Hapus teks ini beserta semua anotasinya?')){const id=Number(del.dataset.qDelete);await call('admin:qiroahDelete',{id});if(draft?.id===id){draft=null;dirty=false;$('q-editor').hidden=true;}await refresh();status('Teks dihapus.');}
  }catch(err){status(err.message);}};
  $('q-kind').onchange=()=>{const kalimat=$('q-kind').value==='kalimat';$('q-value').hidden=kalimat;$('q-kalimat').hidden=!kalimat;$('q-value').placeholder=examples[$('q-kind').value].join(' / ');};$('q-kind').onchange();
  $('q-editor').oninput=e=>{if(!e.target.closest('.q-admin-reading'))dirty=true;};$('q-text').oninput=()=>{dirty=true;const next=$('q-text').value;anchorError='';for(const s of draft.spans){const old=originalText.slice(s.start,s.end);const at=next.indexOf(old);if(!old||at<0||next.indexOf(old,at+1)>=0){anchorError='Teks berubah dan ada bagian yang tidak dapat dipetakan secara unik. Pilih ulang bagian bertanda sebelum menyimpan.';break;}s.start=at;s.end=at+old.length;}$('q-anchor-warning').hidden=!anchorError;$('q-anchor-warning').textContent=anchorError;originalText=next;preview();renderAnnotations();};
  $('q-preview').onclick=e=>{const word=e.target.closest('[data-start]');if(!word||(!e.shiftKey&&!getSelection().isCollapsed))return;const start=Number(word.dataset.start),end=Number(word.dataset.end);if(e.shiftKey&&anchor)choose(Math.min(anchor.start,start),Math.max(anchor.end,end));else{anchor={start,end};choose(start,end);}};
  $('q-preview').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();getSelection().removeAllRanges();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:e.shiftKey}));}};
  document.addEventListener('selectionchange',()=>{const s=getSelection(),el=$('q-preview');if(!s.rangeCount||s.isCollapsed)return;const r=s.getRangeAt(0);if(!el.contains(r.startContainer)||!el.contains(r.endContainer))return;
    const before=document.createRange();before.selectNodeContents(el);before.setEnd(r.startContainer,r.startOffset);const start=before.toString().length;selection={start,end:start+r.toString().length};
  });
  $('q-selection').onclick=()=>{if(selection)choose(selection.start,selection.end);else status('Sorot karakter di pratinjau dahulu.');};
  $('q-note-add').onclick=()=>{noteDraft.push({judul:'',isi:''});renderNoteFields();dirty=true;document.querySelector(`[data-note-title="${noteDraft.length-1}"]`).focus();status('Catatan baru siap diisi. Tambahkan anotasi untuk bagian teks ini, lalu simpan bacaan.');};
  $('q-note-fields').oninput=e=>{const ti=e.target.dataset.noteTitle,bi=e.target.dataset.noteBody;if(ti!==undefined)noteDraft[Number(ti)].judul=e.target.value;if(bi!==undefined)noteDraft[Number(bi)].isi=e.target.value;dirty=true;};
  $('q-note-fields').onclick=e=>{const b=e.target.closest('[data-note-remove]');if(b){noteDraft.splice(Number(b.dataset.noteRemove),1);renderNoteFields();dirty=true;}};
  $('q-add').onclick=()=>{if(!range)return status('Pilih kelompok kata atau karakter dahulu.');const jenis=$('q-kind').value,nilai=$(jenis==='kalimat'?'q-kalimat':'q-value').value;if(!nilai.trim())return status('Nilai anotasi wajib diisi.');const falseClaim=$('q-false-claim').value.trim(),correction=$('q-correction').value.trim();if(Boolean(falseClaim)!==Boolean(correction))return status('Pernyataan keliru dan koreksi harus diisi berpasangan.');const notes=noteDraft.filter(n=>n.judul.trim()||n.isi.trim()).map(n=>({id:n.id,judul:n.judul.trim()||'Catatan',isi:n.isi}));const annotation={...(editing>=0&&draft.spans[editing].id?{id:draft.spans[editing].id}:{}),...range,jenis,nilai,catatan:'',notes,detektifSalah:falseClaim,detektifKoreksi:correction};if(editing<0)draft.spans.push(annotation);else draft.spans[editing]=annotation;dirty=true;resetAnnotation();renderAnnotations();status('Kunci jawaban dan catatannya masuk draf. Simpan teks untuk menerapkan.');};
  $('q-annotations').onclick=e=>{const edit=e.target.closest('[data-q-span]'),remove=e.target.closest('[data-q-remove]');if(edit){editing=Number(edit.dataset.qSpan);const s=draft.spans[editing];choose(s.start,s.end);$('q-kind').value=s.jenis;$('q-kind').onchange();$(s.jenis==='kalimat'?'q-kalimat':'q-value').value=s.nilai;noteDraft=(s.notes||[]).map(n=>({...n}));renderNoteFields();$('q-false-claim').value=s.detektif_salah||s.detektifSalah||'';$('q-correction').value=s.detektif_koreksi||s.detektifKoreksi||'';$('q-add').textContent='Simpan perubahan anotasi';$('q-cancel-annotation').hidden=false;}if(remove){draft.spans.splice(Number(remove.dataset.qRemove),1);dirty=true;resetAnnotation();renderAnnotations();}};
  $('q-cancel-annotation').onclick=resetAnnotation;
  $('q-unlock').onclick=()=>{if(!anchorError)return status('Semua posisi anotasi berhasil disesuaikan.');status('Pilih ulang bagian yang ambigu dari pratinjau.');$('q-preview').focus();};
  $('q-rel-add').onclick=()=>{if(!draft.id||draft.spans.some(s=>!s.id))return status('Simpan teks dan anotasi dahulu agar hubungan memakai ID tetap.');const from=$('q-rel-from').value,to=$('q-rel-to').value;if(!from||!to||from===to)return status('Pilih dua bagian yang berbeda untuk dihubungkan.');draft.relations.push({jenis:$('q-rel-kind').value,dari:from,ke:to,label:$('q-rel-label').value||$('q-rel-kind').value,catatan:$('q-rel-note').value});dirty=true;renderRelations();status('Hubungan masuk draf. Simpan teks untuk menerapkan.');};
  $('q-relations').onclick=e=>{const b=e.target.closest('[data-rel-remove]');if(b){draft.relations.splice(Number(b.dataset.relRemove),1);dirty=true;renderRelations();}};
  $('q-reading-add').onclick=()=>{
    if(!draft?.id)return status('Simpan teks Qiroah dahulu, lalu pilih target membaca.');
    if($('q-text').value!==readingSavedText)return status('Simpan perubahan isi bacaan dahulu sebelum mengatur target.');
    if(!range)return status('Pilih satu kata utuh dari pratinjau dahulu.');
    const match=[...$('q-text').value.matchAll(/[\p{Script=Arabic}\p{M}]+/gu)].find(m=>m.index===range.start&&m.index+m[0].length===range.end);
    if(!match)return status('Target suara harus berupa satu kata utuh.');
    const expected=$('q-reading-vowel').value;
    if(finalVowel(match[0])!==expected)return status('Acuan bunyi harus sesuai harakat akhir pada teks sumber.');
    if(readingTargets.some(t=>t.start===range.start))return status('Kata itu sudah menjadi target. Hapus target lama untuk menggantinya.');
    readingTargets.push({start:range.start,end:range.end,expected,note:$('q-reading-note').value.trim()});readingTargets.sort((a,b)=>a.start-b.start);readingDirty=true;renderReading();$('q-reading-note').value='';$('q-reading-message').textContent='Target masuk draf. Simpan target membaca untuk mengaktifkan.';
  };
  $('q-reading-targets').onclick=e=>{const b=e.target.closest('[data-reading-remove]');if(!b)return;readingTargets.splice(Number(b.dataset.readingRemove),1);readingDirty=true;renderReading();};
  $('q-reading-targets').oninput=e=>{const index=e.target.dataset.readingNote;if(index===undefined)return;readingTargets[Number(index)].note=e.target.value;readingDirty=true;$('q-reading-state').textContent='Perubahan belum disimpan';};
  $('q-reading-reload').onclick=()=>{if(readingDirty&&!confirm('Buang perubahan target yang belum disimpan?'))return;loadReading(draft);};
  $('q-reading-save').onclick=async()=>{
    if(!draft?.id)return status('Simpan bacaan dahulu.');
    if($('q-text').value!==readingSavedText)return status('Simpan perubahan bacaan dahulu sebelum target suara.');
    const button=$('q-reading-save'),ticket=readingTicket;button.disabled=true;
    try{const r=await call('admin:qiroahReadingSave',{id:draft.id,revision:readingRevision,sourceVersion:draft.versi,targets:readingTargets});if(ticket!==readingTicket)return;readingTargets=r.reading.targets;readingRevision=r.reading.revision;readingDirty=false;renderReading();$('q-reading-message').textContent=readingTargets.length?'Target suara tersimpan dan siap dipakai.':'Target dihapus; latihan suara belum aktif.';}
    catch(e){if(ticket===readingTicket)$('q-reading-message').textContent=e.message;}finally{if(ticket===readingTicket)button.disabled=false;}
  };
  $('q-editor').onsubmit=async e=>{e.preventDefault();if(anchorError){status(anchorError);return;}if(readingDirty){status('Simpan target membaca dahulu. Jika isi teks berubah, muat ulang target untuk membuang draf target sebelum menyimpan teks.');return;}const button=e.submitter;button.disabled=true;const ticket=epoch;try{const relations=(draft.relations||[]).map(r=>({...r,dari:String(r.dari),ke:String(r.ke)}));const r=await call('admin:qiroahSave',{...(draft.id?{id:draft.id}:{}),bab:$('q-chapter').value,judul:$('q-title').value,teks:$('q-text').value,spans:draft.spans,relations});if(ticket!==epoch)return;open(r.text);await refresh();status('Bacaan, versi, dan catatan tersimpan.');}catch(err){status(err.message);}finally{button.disabled=false;}};
  $('q-cancel').onclick=()=>{if(discard()){readingTicket++;readingDirty=false;dirty=false;$('q-editor').hidden=true;}};
  window.addEventListener('beforeunload',e=>{if(dirty||readingDirty){e.preventDefault();e.returnValue='';}});
  return {refresh:safe(refresh),reset(){epoch++;readingTicket++;socket.disconnect();draft=null;dirty=false;readingDirty=false;selection=null;$('q-editor').hidden=true;$('q-list').replaceChildren();status('');}};
}
