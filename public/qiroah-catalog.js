import {icon} from './learn-shared.js';

export const qiroahGames = {
  quran: {name:'Analisa Al-Qur’an', tag:'SATU AYAT, LANGKAH DEMI LANGKAH', description:'Pilih surah dan ayat. Kenali jenis kata, akar, dan bentuknya.', bg:'#edf3e7', ink:'#809765'},
  explore: {name:'Eksplorasi Kata', tag:'KENALI BAGIAN KALIMAT', description:'Ketuk satu kata. Temukan bentuk dan kedudukannya dalam kalimat.', bg:'#fff6db', ink:'#a18736'},
  bedah: {name:'Bedah Kalimat', tag:'PAHAMI LANGKAH DEMI LANGKAH', description:'Telusuri bacaan, satu bagian setiap kali. Pahami alasan di baliknya.', bg:'#eef4e8', ink:'#829b68'},
  detective: {name:'Detektif Analisis', tag:'TEMUKAN KEKELIRUANNYA', description:'Ada analisis yang kurang tepat. Cari petunjuk dan pelajari koreksinya.', bg:'#f3edf8', ink:'#a08bb6'},
  reading: {name:'Latihan Membaca', tag:'BACA DENGAN PERCAYA DIRI', description:'Coba tanpa harakat, buka bantuan, lalu rekam dan dengarkan bacaanmu.', bg:'#edf3f8', ink:'#789cb6'},
};

// Illustrations use the same paper tiles, soft colors and outline weight as the other games.
function illustration(mode) {
  if (mode==='quran') return '<div class="q-card-book">'+icon('book')+'</div><span class="q-card-badge">'+icon('compass')+'</span>';
  if (mode==='explore') return '<div class="q-card-word" lang="ar" dir="rtl">كِتَابٌ</div><span class="q-card-label">isim</span><span class="q-card-badge">'+icon('check')+'</span>';
  if (mode==='bedah') return '<div class="q-card-sentence" lang="ar" dir="rtl"><span>قَرَأَ</span><span class="q-card-active">زَيْدٌ</span><span>كِتَابًا</span></div><span class="q-card-connector"></span><span class="q-card-label">Kedudukan kata</span>';
  if (mode==='detective') return '<div class="q-card-clues"><span></span><span></span><span></span></div><svg class="q-card-lens" viewBox="0 0 86 86" fill="none"><path d="m54 54 22 22" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><circle cx="35" cy="35" r="26" fill="#fffefb" stroke="currentColor" stroke-width="5"/><path d="M28 28a7 7 0 0 1 14 0c0 6-7 6-7 11" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="35" cy="46" r="2" fill="currentColor"/></svg>';
  return '<div class="q-card-book">'+icon('book')+'</div><span class="q-card-voice">'+icon('volume')+'</span>';
}

export function qiroahCards() {
  return Object.entries(qiroahGames).map(([mode,g])=>`<a class="game-card qiroah-game-card" href="${mode==='quran'?'qiroah-quran.html':`qiroah.html?mode=${mode}`}" data-qiroah-game="${mode}" style="--art-bg:${g.bg};--art-ink:${g.ink}"><div class="game-art q-card-art q-card-art-${mode}" aria-hidden="true">${illustration(mode)}</div><small>${g.tag}</small><h3>${g.name}</h3><p>${g.description}</p><div class="game-bottom"><span>${icon('book')} ${mode==='quran'?'Pilih ayat':'Pilih bacaan'}</span><span class="go">${icon('arrow')}</span></div></a>`).join('');
}
