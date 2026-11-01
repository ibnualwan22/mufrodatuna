import {$, esc, BASE} from './learn-shared.js';
import {io} from './socket.io/socket.io.esm.min.js';
import {tokens, labels, examples} from './qiroah-core.mjs';

export function initQiroahAdmin(getPassword) {
  const socket=io({path:`${BASE}/socket.io`,autoConnect:false});
  const root=document.createElement('section');root.className='qiroah';root.id='qiroah-admin';
  root.innerHTML=`<div class="section-heading"><div><h2>Qiroah</h2><p>Latihan membaca dan mengenali anotasi. Harakat disimpan utuh.</p></div><button class="button primary" id="q-new">Tambah teks</button></div>
    <p id="q-status" role="status"></p><div id="q-list"></div>
    <form id="q-editor" hidden><h3>Editor teks Qiroah</h3><label for="q-title">Judul</label><input id="q-title" required maxlength="200">
    <label for="q-text">Teks Arab (harakat dipertahankan)</label><textarea id="q-text" lang="ar" dir="rtl" rows="6" maxlength="50000" required></textarea>
    <p>Ketuk kata; Shift + ketuk kata terakhir untuk beberapa kata. Atau sorot huruf/kata dengan seleksi teks, lalu tekan “Gunakan seleksi”. Di perangkat sentuh, tekan lama untuk menyeleksi.</p>
    <div id="q-preview" class="q-ar q-select" lang="ar" dir="rtl"></div><button type="button" class="button subtle" id="q-selection">Gunakan seleksi</button>
    <p id="q-range" role="status">Belum ada kelompok dipilih.</p>
    <label for="q-kind">Jenis anotasi</label><select id="q-kind">${Object.entries(labels).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>
    <label for="q-value">Nilai</label><input id="q-value" maxlength="200"><select id="q-kalimat" aria-label="Nilai kalimat" hidden>${examples.kalimat.map(v=>`<option>${esc(v)}</option>`).join('')}</select>
    <label for="q-note">Catatan (opsional)</label><textarea id="q-note" maxlength="2000" rows="2"></textarea>
    <button type="button" class="button subtle" id="q-add">Tambahkan anotasi</button><button type="button" class="text-button" id="q-cancel-annotation" hidden>Batal ubah anotasi</button><div id="q-annotations"></div>
    <p>Perubahan anotasi masih berupa draf sampai “Simpan teks & anotasi” ditekan. Mengubah isi teks memerlukan penghapusan anotasi lama agar posisi tidak bergeser.</p>
    <button type="button" class="text-button" id="q-unlock">Ubah isi teks / hapus anotasi draf</button>
    <div class="dialog-actions"><button class="button primary" type="submit">Simpan teks & anotasi</button><button type="button" class="button subtle" id="q-cancel">Tutup editor</button></div></form>`;
  $('editor-panel').append(root);
  let draft=null, range=null, anchor=null, editing=-1, dirty=false, selection=null, epoch=0;
  const status=message=>$('q-status').textContent=message;
  const call=(event,data={})=>new Promise((resolve,reject)=>{
    socket.connect();socket.timeout(10000).emit(event,{...data,password:getPassword()},(err,r)=>err?reject(new Error('Koneksi terputus. Coba lagi; draf tetap tersedia.')):r?.error?reject(new Error(r.error)):resolve(r));
  });
  const safe=fn=>async()=>{try{await fn();}catch(e){status(e.message);}};
  async function refresh(){const ticket=epoch;const r=await call('admin:qiroahList');if(ticket!==epoch)return;
    $('q-list').innerHTML=r.texts.map(t=>`<div class="q-row"><strong>${esc(t.judul)}</strong><button type="button" class="text-button" data-q-edit="${t.id}">Ubah</button><button type="button" class="text-button" data-q-delete="${t.id}">Hapus</button></div>`).join('')||'<p>Belum ada teks Qiroah.</p>';
  }
  function choose(start,end){range={start,end};$('q-range').textContent=`Kelompok [${start}, ${end}): ${$('q-text').value.slice(start,end)}`;}
  function preview(){const text=$('q-text').value;range=null;selection=null;anchor=null;$('q-range').textContent='Belum ada kelompok dipilih.';
    $('q-preview').innerHTML=tokens(text).map(t=>/^\s+$/u.test(t.text)?esc(t.text):`<span tabindex="0" role="button" data-start="${t.start}" data-end="${t.end}" aria-label="Pilih kata ${esc(t.text)}">${esc(t.text)}</span>`).join('');
  }
  function resetAnnotation(){editing=-1;$('q-add').textContent='Tambahkan anotasi';$('q-note').value='';$('q-value').value='';$('q-cancel-annotation').hidden=true;}
  function renderAnnotations(){
    $('q-text').readOnly=draft.spans.length>0;
    $('q-annotations').innerHTML=draft.spans.map((s,i)=>`<div class="q-row"><div><b lang="ar" dir="rtl">${esc($('q-text').value.slice(s.start,s.end))}</b> · ${labels[s.jenis]}: ${esc(s.nilai)}<p>${esc(s.catatan)}</p><small>[${s.start}, ${s.end})</small></div><button type="button" class="text-button" data-q-span="${i}">Ubah</button><button type="button" class="text-button" data-q-remove="${i}">Hapus</button></div>`).join('');
  }
  function open(text){draft=text;dirty=false;resetAnnotation();$('q-title').value=text.judul;$('q-text').value=text.teks;$('q-editor').hidden=false;preview();renderAnnotations();$('q-title').focus();}
  const discard=()=>!dirty||confirm('Tutup draf tanpa menyimpan perubahan?');
  $('q-new').onclick=()=>{if(discard())open({judul:'',teks:'',spans:[]});};
  $('q-list').onclick=async e=>{const edit=e.target.closest('[data-q-edit]'),del=e.target.closest('[data-q-delete]');try{
    if(edit&&discard()){const ticket=epoch,r=await call('admin:qiroahGet',{id:Number(edit.dataset.qEdit)});if(ticket===epoch)open(r.text);}
    if(del&&confirm('Hapus teks ini beserta semua anotasinya?')){const id=Number(del.dataset.qDelete);await call('admin:qiroahDelete',{id});if(draft?.id===id){draft=null;dirty=false;$('q-editor').hidden=true;}await refresh();status('Teks dihapus.');}
  }catch(err){status(err.message);}};
  $('q-kind').onchange=()=>{const kalimat=$('q-kind').value==='kalimat';$('q-value').hidden=kalimat;$('q-kalimat').hidden=!kalimat;$('q-value').placeholder=examples[$('q-kind').value].join(' / ');};$('q-kind').onchange();
  $('q-editor').oninput=()=>{dirty=true;};$('q-text').oninput=()=>{dirty=true;preview();};
  $('q-preview').onclick=e=>{const word=e.target.closest('[data-start]');if(!word||(!e.shiftKey&&!getSelection().isCollapsed))return;const start=Number(word.dataset.start),end=Number(word.dataset.end);if(e.shiftKey&&anchor)choose(Math.min(anchor.start,start),Math.max(anchor.end,end));else{anchor={start,end};choose(start,end);}};
  $('q-preview').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();getSelection().removeAllRanges();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:e.shiftKey}));}};
  document.addEventListener('selectionchange',()=>{const s=getSelection(),el=$('q-preview');if(!s.rangeCount||s.isCollapsed)return;const r=s.getRangeAt(0);if(!el.contains(r.startContainer)||!el.contains(r.endContainer))return;
    const before=document.createRange();before.selectNodeContents(el);before.setEnd(r.startContainer,r.startOffset);const start=before.toString().length;selection={start,end:start+r.toString().length};
  });
  $('q-selection').onclick=()=>{if(selection)choose(selection.start,selection.end);else status('Sorot karakter di pratinjau dahulu.');};
  $('q-add').onclick=()=>{if(!range)return status('Pilih kelompok kata atau karakter dahulu.');const jenis=$('q-kind').value,nilai=$(jenis==='kalimat'?'q-kalimat':'q-value').value;if(!nilai.trim())return status('Nilai anotasi wajib diisi.');const annotation={...range,jenis,nilai,catatan:$('q-note').value};if(editing<0)draft.spans.push(annotation);else draft.spans[editing]=annotation;dirty=true;resetAnnotation();renderAnnotations();status('Anotasi masuk draf. Simpan teks untuk menerapkan.');};
  $('q-annotations').onclick=e=>{const edit=e.target.closest('[data-q-span]'),remove=e.target.closest('[data-q-remove]');if(edit){editing=Number(edit.dataset.qSpan);const s=draft.spans[editing];choose(s.start,s.end);$('q-kind').value=s.jenis;$('q-kind').onchange();$(s.jenis==='kalimat'?'q-kalimat':'q-value').value=s.nilai;$('q-note').value=s.catatan;$('q-add').textContent='Terapkan perubahan anotasi';$('q-cancel-annotation').hidden=false;}if(remove){draft.spans.splice(Number(remove.dataset.qRemove),1);dirty=true;resetAnnotation();renderAnnotations();}};
  $('q-cancel-annotation').onclick=resetAnnotation;
  $('q-unlock').onclick=()=>{if(!draft.spans.length||confirm('Hapus seluruh anotasi draf agar teks bisa diubah? Database belum berubah sampai disimpan.')){draft.spans=[];dirty=true;resetAnnotation();renderAnnotations();$('q-text').focus();}};
  $('q-editor').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;const ticket=epoch;try{const r=await call('admin:qiroahSave',{...(draft.id?{id:draft.id}:{}),judul:$('q-title').value,teks:$('q-text').value,spans:draft.spans});if(ticket!==epoch)return;open(r.text);await refresh();status('Teks dan anotasi tersimpan.');}catch(err){status(err.message);}finally{button.disabled=false;}};
  $('q-cancel').onclick=()=>{if(discard()){dirty=false;$('q-editor').hidden=true;}};
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  return {refresh:safe(refresh),reset(){epoch++;socket.disconnect();draft=null;dirty=false;selection=null;$('q-editor').hidden=true;$('q-list').replaceChildren();status('');}};
}
