import {BASE} from './learn-shared.js';
export const reviewLabel={source:'Dari sumber · belum ditinjau admin',verified:'Sudah diverifikasi admin',needs_correction:'Perlu koreksi',disabled:'Dinonaktifkan'};
export const fieldLabel={pos:'Jenis kata',root:'Akar kata',aspect:'Bentuk fi‘il',case:'Status i‘rab isim',mood:'Status fi‘il mudhari‘'};
export async function quranApi(path,body,password){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try {
    const res=await fetch(`${BASE}/api/qiroah/quran${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(password?{authorization:`Bearer ${password}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Permintaan belum berhasil.');return data;
  }catch(e){if(e.name==='AbortError')throw new Error('Koneksi terlalu lama. Coba lagi.');throw e;}finally{clearTimeout(timer);}
}
export function sourceFooter(){return `<footer class="qa-sources"><p>Analisis bahasa: <a href="https://corpus.quran.com/" target="_blank" rel="noopener">Quranic Arabic Corpus</a> v0.4 · © Kais Dukes, 2011.</p><p>Teks: <a href="https://tanzil.net/" target="_blank" rel="noopener">Tanzil Project</a> v1.1 · © 2007–2026.</p><a href="quran-sources.html">Sumber, lisensi &amp; tentang verifikasi ↗</a></footer>`;}
