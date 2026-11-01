// Bacaan contoh untuk mencoba keempat mode Qiroah. Posisi dihitung dari teks asli
// agar harakat dan tanda baca tetap sama dengan yang diberikan pengajar.
const teks = 'فَقَالَ: (الْمِيَاهُ الَّتِيْ يَجُوْزُ - أَيْ يَصِحُّ - التَّطْهِيْرُ بِهَا سَبْعُ مِيَاهٍ: مَاءُ السَّمَاءِ، وَمَاءُ الْبَحْرِ، وَمَاءُ النَّهْرِ، وَمَاءُ الْبِئْرِ، وَمَاءُ الْعَيْنِ، وَمَاءُ الثَّلْجِ، وَمَاءُ الْبَرَدِ)';

function annotation(part, jenis, nilai, judul, isi, extra = {}) {
  const start = teks.indexOf(part);
  if (start < 0 || teks.indexOf(part, start + part.length) >= 0) throw new Error(`Bagian contoh Qiroah tidak unik: ${part}`);
  return { start, end: start + part.length, jenis, nilai, catatan: '', notes: [{ judul, isi }], ...extra };
}

module.exports = {
  bab: 'Fikih · Macam-macam Air',
  judul: 'Air yang Dapat Dipakai Bersuci',
  teks,
  spans: [
    annotation('قَالَ', 'shigot', 'fi‘l madhi', 'Bentuk kata', 'قَالَ adalah fi‘l madhi: menunjukkan perbuatan yang telah terjadi.'),
    annotation('الْمِيَاهُ', 'irob', 'mubtada’ marfu‘', 'Kedudukan', 'الْمِيَاهُ menjadi mubtada’ yang dibicarakan. Tanda rafaknya dhammah.'),
    annotation('يَجُوْزُ', 'shigot', 'fi‘l mudhari‘', 'Makna dalam konteks', 'يَجُوْزُ berarti “boleh” atau “sah” dalam penjelasan hukum bersuci.', { detektifSalah: 'fi‘l madhi', detektifKoreksi: 'Awalan يَ menunjukkan fi‘l mudhari‘, bukan fi‘l madhi.' }),
    annotation('التَّطْهِيْرُ', 'irob', 'fa‘il marfu‘', 'Pelaku gramatikal', 'التَّطْهِيْرُ adalah fa‘il dari يَجُوْزُ; karena itu dibaca rafa‘ dengan dhammah.'),
    annotation('بِهَا', 'irob', 'jar dan majrur', 'Susunan kata', 'بِ adalah huruf jar; هَا adalah dhamir yang merujuk kepada air. Keduanya membentuk jar dan majrur.'),
    annotation('سَبْعُ', 'irob', 'khabar marfu‘', 'Jumlah', 'سَبْعُ adalah khabar bagi الْمِيَاهُ, dan menjadi mudhaf bagi مِيَاهٍ.'),
    annotation('مِيَاهٍ', 'irob', 'mudhaf ilaih majrur', 'Tanda i‘rab', 'مِيَاهٍ berkedudukan sebagai mudhaf ilaih; tanda jarnya kasrah.'),
  ],
  relations: [],
};
