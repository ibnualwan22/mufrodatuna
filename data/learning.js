// Demo content is seeded once; subsequent edits belong to the administrator.
const vocabulary = (rows) => rows.map(([arab, meaning]) => ({ arab, meaning }));
const expressions = (rows) => rows.map(([arab, meaning, context]) => ({ arab, meaning, context }));
const patterns = (rows) => rows.map(([arab, meaning, pattern, blank]) => ({ arab, meaning, pattern, blank }));
module.exports = [
  { name: 'Mufrodat Dasar', category: 'mufrodat', chapters: [
    { title: 'Benda di kelas', description: 'Kenali benda-benda yang menemani belajarmu.', items: vocabulary([
      ['كِتَابٌ', 'buku'], ['قَلَمٌ', 'pena'], ['دَفْتَرٌ', 'buku tulis'], ['حَقِيبَةٌ', 'tas'],
      ['سَبُّورَةٌ', 'papan tulis'], ['كُرْسِيٌّ', 'kursi'], ['مِمْحَاةٌ', 'penghapus'], ['مِسْطَرَةٌ', 'penggaris'],
    ]) },
    { title: 'Di dalam rumah', description: 'Temukan kata Arab dari tempat terdekatmu.', items: vocabulary([
      ['بَيْتٌ', 'rumah'], ['بَابٌ', 'pintu'], ['نَافِذَةٌ', 'jendela'], ['غُرْفَةٌ', 'kamar'],
      ['مَطْبَخٌ', 'dapur'], ['سَرِيرٌ', 'tempat tidur'], ['مِصْبَاحٌ', 'lampu'], ['حَدِيقَةٌ', 'taman'],
    ]) },
  ] },
  { name: 'Ta’birot Harian', category: 'tabirot', chapters: [
    { title: 'Sapa dan berkenalan', description: 'Mulai percakapan kecil yang berarti.', items: expressions([
      ['صَبَاحُ الْخَيْرِ', 'selamat pagi', 'Kamu bertemu teman pada pagi hari. Bagaimana kamu menyapanya?'],
      ['مَسَاءُ الْخَيْرِ', 'selamat sore', 'Sore hari, kamu menyapa tetangga. Apa yang kamu ucapkan?'],
      ['كَيْفَ حَالُكَ؟', 'bagaimana kabarmu?', 'Kamu ingin menanyakan kabar seorang teman laki-laki.'],
      ['أَنَا بِخَيْرٍ', 'saya baik-baik saja', 'Teman menanyakan kabarmu. Kamu sedang baik-baik saja.'],
      ['مَا اسْمُكَ؟', 'siapa namamu?', 'Kamu ingin mengetahui nama teman laki-laki yang baru kamu temui.'],
      ['اسْمِي أَحْمَدُ', 'nama saya Ahmad', 'Namamu Ahmad. Perkenalkan dirimu kepada teman baru.'],
      ['أَهْلًا وَسَهْلًا', 'selamat datang', 'Seorang tamu baru datang. Sambut kedatangannya.'],
      ['إِلَى اللِّقَاءِ', 'sampai jumpa', 'Kamu akan berpisah dan berharap bertemu lagi.'],
    ]) },
    { title: 'Izin dan bantuan', description: 'Berlatih meminta, membantu, dan berterima kasih.', items: expressions([
      ['هَلْ تَسْمَحُ لِي بِالدُّخُولِ؟', 'bolehkah saya masuk?', 'Kamu berada di depan kelas dan ingin meminta izin masuk kepada guru laki-laki.'],
      ['سَاعِدْنِي مِنْ فَضْلِكَ', 'tolong bantu saya', 'Kamu membutuhkan bantuan seorang teman laki-laki.'],
      ['شُكْرًا جَزِيلًا', 'terima kasih banyak', 'Teman telah membantumu menyelesaikan pekerjaan. Ucapkan terima kasih.'],
      ['عَفْوًا', 'sama-sama', 'Seseorang mengucapkan terima kasih. Bagaimana kamu membalasnya?'],
      ['أَعِدْ مِنْ فَضْلِكَ', 'tolong ulangi', 'Kamu belum mendengar ucapan teman laki-laki dengan jelas. Minta ia mengulanginya.'],
      ['أَنَا آسِفٌ', 'saya minta maaf', 'Sebagai penutur laki-laki, kamu ingin meminta maaf karena terlambat.'],
      ['لَا بَأْسَ', 'tidak apa-apa', 'Teman meminta maaf atas kesalahan kecil. Tenangkan dia.'],
      ['لَمْ أَفْهَمْ', 'saya belum paham', 'Penjelasan tadi belum kamu mengerti. Sampaikan dengan jujur.'],
    ]) },
  ] },
  { name: 'Uslub Praktis', category: 'uslub', chapters: [
    { title: 'Aku ingin…', description: 'Gunakan أُرِيدُ untuk menyatakan keinginan.', items: patterns([
      ['أُرِيدُ كِتَابًا', 'saya ingin sebuah buku', 'أُرِيدُ ___', 'كِتَابًا'],
      ['أُرِيدُ قَلَمًا', 'saya ingin sebuah pena', 'أُرِيدُ ___', 'قَلَمًا'],
      ['أُرِيدُ مَاءً', 'saya ingin air', 'أُرِيدُ ___', 'مَاءً'],
      ['أُرِيدُ طَعَامًا', 'saya ingin makanan', 'أُرِيدُ ___', 'طَعَامًا'],
      ['أُرِيدُ خُبْزًا', 'saya ingin roti', 'أُرِيدُ ___', 'خُبْزًا'],
      ['أُرِيدُ حَلِيبًا', 'saya ingin susu', 'أُرِيدُ ___', 'حَلِيبًا'],
      ['أُرِيدُ شَايًا', 'saya ingin teh', 'أُرِيدُ ___', 'شَايًا'],
      ['أُرِيدُ تَمْرًا', 'saya ingin kurma', 'أُرِيدُ ___', 'تَمْرًا'],
    ]) },
    { title: 'Di mana…?', description: 'Tanyakan letak sesuatu dengan أَيْنَ.', items: patterns([
      ['أَيْنَ الْكِتَابُ؟', 'di mana buku itu?', 'أَيْنَ ___؟', 'الْكِتَابُ'],
      ['أَيْنَ الْقَلَمُ؟', 'di mana pena itu?', 'أَيْنَ ___؟', 'الْقَلَمُ'],
      ['أَيْنَ الْمَسْجِدُ؟', 'di mana masjid itu?', 'أَيْنَ ___؟', 'الْمَسْجِدُ'],
      ['أَيْنَ الْمَدْرَسَةُ؟', 'di mana sekolah itu?', 'أَيْنَ ___؟', 'الْمَدْرَسَةُ'],
      ['أَيْنَ الْبَيْتُ؟', 'di mana rumah itu?', 'أَيْنَ ___؟', 'الْبَيْتُ'],
      ['أَيْنَ الْمَطْبَخُ؟', 'di mana dapur itu?', 'أَيْنَ ___؟', 'الْمَطْبَخُ'],
      ['أَيْنَ الْحَقِيبَةُ؟', 'di mana tas itu?', 'أَيْنَ ___؟', 'الْحَقِيبَةُ'],
      ['أَيْنَ الْحَمَّامُ؟', 'di mana kamar mandi itu?', 'أَيْنَ ___؟', 'الْحَمَّامُ'],
    ]) },
  ] },
];
