// Pilot material; teachers can revise these examples in the Qiroah editor.
const subject='Fa‘il (pelaku) dibaca rafa‘, dengan dhammah pada akhir kata.';
const object='Maf‘ul bih (objek) dibaca nashab, dengan fathah pada akhir kata.';
const afterJar='Isim setelah huruf jar dibaca jar, dengan kasrah pada akhir kata.';
module.exports=[
  ['Anak Membaca','قَرَأَ الْوَلَدُ الْكِتَابَ.',[['الْوَلَدُ','u',subject],['الْكِتَابَ','a',object]]],
  ['Guru Membuka Pintu','فَتَحَ الْمُعَلِّمُ الْبَابَ.',[['الْمُعَلِّمُ','u',subject],['الْبَابَ','a',object]]],
  ['Duduk di Kelas','جَلَسَ الطَّالِبُ فِي الْفَصْلِ.',[['الطَّالِبُ','u',subject],['الْفَصْلِ','i',afterJar]]],
  ['Pena di Atas Meja','وَضَعَ الْوَلَدُ الْقَلَمَ عَلَى الْمَكْتَبِ.',[['الْوَلَدُ','u',subject],['الْقَلَمَ','a',object],['الْمَكْتَبِ','i',afterJar]]],
  ['Pulang dari Pasar','رَجَعَ الْأَبُ مِنَ السُّوقِ.',[['الْأَبُ','u',subject],['السُّوقِ','i',afterJar]]],
  ['Membawa Roti','حَمَلَ الْعَامِلُ الْخُبْزَ.',[['الْعَامِلُ','u',subject],['الْخُبْزَ','a',object]]],
  ['Menuju Masjid','ذَهَبَ الْمُعَلِّمُ إِلَى الْمَسْجِدِ.',[['الْمُعَلِّمُ','u',subject],['الْمَسْجِدِ','i',afterJar]]],
  ['Mendengar Suara','سَمِعَ الطِّفْلُ الصَّوْتَ.',[['الطِّفْلُ','u',subject],['الصَّوْتَ','a',object]]],
  ['Melihat Bulan','نَظَرَ الرَّجُلُ إِلَى الْقَمَرِ.',[['الرَّجُلُ','u',subject],['الْقَمَرِ','i',afterJar]]],
].map(([judul,teks,targets])=>({judul,teks,bab:'Latihan I‘rab Suara',targets:targets.map(([word,expected,note])=>({start:teks.indexOf(word),end:teks.indexOf(word)+word.length,expected,note}))}));
