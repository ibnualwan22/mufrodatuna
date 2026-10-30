import {$,esc,icon,fillIcons,api} from './learn-shared.js';
let password='',catalog=null,programId=null,chapterId=null,editingItem=null,editingChapter=false,items=[],deleteAction=null,loading=0;
const call=(path,body,method)=>api(`/admin${path}`,body,{...(method?{method}:{}),headers:{authorization:`Bearer ${password}`}});
const fail=(id,e)=>{$(id).hidden=false;$(id).textContent=e.message;};
const clear=id=>{$(id).hidden=true;$(id).textContent='';};
const current=()=>catalog?.chapters.find(c=>c.id===chapterId);
async function refresh(){catalog=await call('/catalog');if(!catalog.programs.some(p=>p.id===programId))programId=catalog.programs[0]?.id;
 $('program').innerHTML=catalog.programs.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');$('program').value=programId;
 const chapters=catalog.chapters.filter(c=>c.program_id===programId);if(!chapters.some(c=>c.id===chapterId))chapterId=chapters[0]?.id;
 $('chapters').innerHTML=chapters.map(c=>`<button class="chapter-select ${c.id===chapterId?'active':''}" data-chapter="${c.id}"><strong>${esc(c.title)}</strong><small>${c.count} materi${c.is_demo?' · contoh':''}</small></button>`).join('') || '<p class="muted">Tambahkan bab pertama.</p>';
 await loadItems();
}
async function loadItems(){const ticket=++loading,c=current();$('item-editor').hidden=true;$('chapter-title').textContent=c?.title || 'Belum ada bab';$('chapter-description').textContent=c?.description || 'Tambahkan bab, lalu isi materi latihannya.';$('demo-label').hidden=!c?.is_demo;
 for(const id of ['new-item-button','edit-chapter-button','delete-chapter-button'])$(id).disabled=!c;
 $('mode-tags').innerHTML=c?Object.entries(c.modes).map(([m,count])=>`<span class="${count?'':'unavailable'}">${esc(catalog.modes[m].name)} · ${count?`${count} materi`:'belum cukup materi'}</span>`).join(''):'';
 $('item-list').innerHTML='<p class="muted">Memuat materi…</p>';
 if(!c){$('item-list').innerHTML='';return;}
 try{const result=await call(`/chapters/${c.id}/items`);if(ticket!==loading)return;items=result.items;$('item-list').innerHTML=items.map(i=>`<div class="admin-item"><div><p class="ar" lang="ar" dir="rtl">${esc(i.arab)}</p><small>${esc(i.meaning)}</small></div><button class="text-button" data-edit="${i.id}">Ubah</button><button class="icon-button" data-delete="${i.id}" aria-label="Hapus ${esc(i.meaning)}">${icon('trash')}</button></div>`).join('') || '<div class="state-panel">Belum ada materi. Tambahkan beberapa item agar permainan bisa dimulai.</div>';}catch(e){if(ticket===loading)fail('admin-status',e);}
}
function editItem(item){editingItem=item?.id || null;$('item-editor').hidden=false;$('item-form-title').textContent=item?'Ubah materi':'Tambah materi';clear('item-error');
 for(const key of ['arab','meaning','context','pattern','blank','explanation'])$(`item-${key}`).value=item?.[key] || '';
 $('item-alternatives').value=(item?.alternatives||[]).join('\n');const c=current();$('context-fields').hidden=c.category!=='tabirot';$('pattern-fields').hidden=c.category!=='uslub';$('item-context').required=c.category==='tabirot';$('item-pattern').required=c.category==='uslub';$('item-blank').required=c.category==='uslub';preview();$('item-editor').scrollIntoView({block:'start'});$('item-arab').focus({preventScroll:true});
}
function itemData(){const input=Object.fromEntries(['arab','meaning','context','pattern','blank','explanation'].map(k=>[k,$(`item-${k}`).value]));input.alternatives=$('item-alternatives').value.split('\n').map(s=>s.trim()).filter(Boolean);return input;}
function preview(){const data=itemData();$('preview-arab').textContent=data.arab || '…';$('preview-meaning').textContent=data.meaning || 'Arti akan muncul di sini';$('preview-context').textContent=data.context;$('preview-pattern').textContent=data.pattern;}
function askDelete(description,action){deleteAction=action;$('delete-description').textContent=description;clear('delete-error');$('delete-dialog').showModal();}
fillIcons();
$('login-form').onsubmit=async e=>{e.preventDefault();password=$('password').value;clear('login-error');const b=e.submitter;b.disabled=true;try{await refresh();$('login-panel').hidden=true;$('editor-panel').hidden=false;$('password').value='';}catch(err){fail('login-error',err);password='';}finally{b.disabled=false;}};
$('logout').onclick=()=>{password='';loading++;$('editor-panel').hidden=true;$('login-panel').hidden=false;};
$('program').onchange=async e=>{programId=Number(e.target.value);chapterId=null;try{await refresh();}catch(err){fail('admin-status',err);}};
$('chapters').onclick=e=>{const b=e.target.closest('[data-chapter]');if(!b)return;chapterId=Number(b.dataset.chapter);document.querySelectorAll('.chapter-select').forEach(el=>el.classList.toggle('active',el===b));loadItems();};
$('item-list').onclick=e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit)editItem(items.find(i=>i.id===Number(edit.dataset.edit)));if(del){const id=Number(del.dataset.delete);askDelete('Materi ini akan dihapus dari bab. Latihan yang sudah dimulai tetap dapat diselesaikan.',()=>call(`/items/${id}`,undefined,'DELETE'));}};
$('new-item-button').onclick=()=>editItem();$('cancel-item').onclick=()=>$('item-editor').hidden=true;$('item-form').oninput=preview;
$('item-form').onsubmit=async e=>{e.preventDefault();clear('item-error');const b=e.submitter;b.disabled=true;try{await call(editingItem?`/items/${editingItem}`:`/chapters/${chapterId}/items`,itemData(),editingItem?'PUT':'POST');await refresh();}catch(err){fail('item-error',err);}finally{b.disabled=false;}};
function chapterDialog(edit){editingChapter=edit;clear('chapter-error');$('chapter-form-title').textContent=edit?'Ubah bab':'Bab baru';$('chapter-name').value=edit?current().title:'';$('chapter-summary').value=edit?current().description:'';$('chapter-dialog').showModal();}
$('new-chapter-button').onclick=()=>chapterDialog(false);$('edit-chapter-button').onclick=()=>chapterDialog(true);
$('chapter-form').onsubmit=async e=>{e.preventDefault();clear('chapter-error');const b=e.submitter;b.disabled=true;try{const result=await call(editingChapter?`/chapters/${chapterId}`:'/chapters',{programId,title:$('chapter-name').value,description:$('chapter-summary').value},editingChapter?'PUT':'POST');if(result.id)chapterId=result.id;$('chapter-dialog').close();await refresh();}catch(err){fail('chapter-error',err);}finally{b.disabled=false;}};
$('delete-chapter-button').onclick=()=>askDelete(`Bab “${current().title}” beserta seluruh materinya akan dihapus.`,()=>call(`/chapters/${chapterId}`,undefined,'DELETE'));
$('confirm-delete').onclick=async()=>{const b=$('confirm-delete');b.disabled=true;try{await deleteAction();$('delete-dialog').close();await refresh();}catch(err){fail('delete-error',err);}finally{b.disabled=false;}};
$('new-program-button').onclick=()=>{clear('program-error');$('program-dialog').showModal();};
$('program-form').onsubmit=async e=>{e.preventDefault();clear('program-error');const b=e.submitter;b.disabled=true;try{const r=await call('/programs',{name:$('program-name').value,category:$('program-category').value});programId=r.id;chapterId=null;$('program-dialog').close();$('program-form').reset();await refresh();}catch(err){fail('program-error',err);}finally{b.disabled=false;}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
