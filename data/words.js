/**
 * Bank kata mufrodat (prototipe).
 * `ar`  : kata Arab DENGAN harakat (kunci jawaban resmi)
 * `id`  : arti bahasa Indonesia
 * `tema`: kelompok tema
 *
 * Pemain boleh mengetik jawaban Arab TANPA harakat —
 * lib/normalize.js yang akan menyamakannya.
 */
const WORDS = [
  // ---- Tema: Sekolah (الْمَدْرَسَةُ) ----
  { ar: "مَدْرَسَةٌ", id: "sekolah", tema: "sekolah" },
  { ar: "كِتَابٌ", id: "buku", tema: "sekolah" },
  { ar: "قَلَمٌ", id: "pena", tema: "sekolah" },
  { ar: "مَكْتَبٌ", id: "meja", tema: "sekolah" },
  { ar: "فَصْلٌ", id: "kelas", tema: "sekolah" },
  { ar: "مُعَلِّمٌ", id: "guru laki-laki", tema: "sekolah" },
  { ar: "مُعَلِّمَةٌ", id: "guru perempuan", tema: "sekolah" },
  { ar: "تِلْمِيذٌ", id: "murid laki-laki", tema: "sekolah" },
  { ar: "تِلْمِيذَةٌ", id: "murid perempuan", tema: "sekolah" },
  { ar: "دَفْتَرٌ", id: "buku tulis", tema: "sekolah" },
  { ar: "سَبُّورَةٌ", id: "papan tulis", tema: "sekolah" },
  { ar: "دَرْسٌ", id: "pelajaran", tema: "sekolah" },
  { ar: "حَقِيبَةٌ", id: "tas", tema: "sekolah" },
  { ar: "مِمْحَاةٌ", id: "penghapus", tema: "sekolah" },
  { ar: "مِسْطَرَةٌ", id: "penggaris", tema: "sekolah" },

  // ---- Tema: Rumah (الْبَيْتُ) ----
  { ar: "بَيْتٌ", id: "rumah", tema: "rumah" },
  { ar: "بَابٌ", id: "pintu", tema: "rumah" },
  { ar: "نَافِذَةٌ", id: "jendela", tema: "rumah" },
  { ar: "غُرْفَةٌ", id: "kamar", tema: "rumah" },
  { ar: "مِصْبَاحٌ", id: "lampu", tema: "rumah" },
  { ar: "كُرْسِيٌّ", id: "kursi", tema: "rumah" },
  { ar: "سَرِيرٌ", id: "tempat tidur", tema: "rumah" },
  { ar: "مَطْبَخٌ", id: "dapur", tema: "rumah" },
  { ar: "حَمَّامٌ", id: "kamar mandi", tema: "rumah" },
  { ar: "حَدِيقَةٌ", id: "taman", tema: "rumah" },

  // ---- Tema: Keluarga (الْأُسْرَةُ) ----
  { ar: "أَبٌ", id: "ayah", tema: "keluarga" },
  { ar: "أُمٌّ", id: "ibu", tema: "keluarga" },
  { ar: "أَخٌ", id: "saudara laki-laki", tema: "keluarga" },
  { ar: "أُخْتٌ", id: "saudara perempuan", tema: "keluarga" },
  { ar: "جَدٌّ", id: "kakek", tema: "keluarga" },
  { ar: "جَدَّةٌ", id: "nenek", tema: "keluarga" },
  { ar: "اِبْنٌ", id: "anak laki-laki", tema: "keluarga" },
  { ar: "بِنْتٌ", id: "anak perempuan", tema: "keluarga" },

  // ---- Tema: Alam & Waktu ----
  { ar: "شَمْسٌ", id: "matahari", tema: "alam" },
  { ar: "قَمَرٌ", id: "bulan", tema: "alam" },
  { ar: "نَجْمٌ", id: "bintang", tema: "alam" },
  { ar: "مَاءٌ", id: "air", tema: "alam" },
  { ar: "يَوْمٌ", id: "hari", tema: "alam" },
  { ar: "لَيْلٌ", id: "malam", tema: "alam" },
  { ar: "صَبَاحٌ", id: "pagi", tema: "alam" },
  { ar: "مَسَاءٌ", id: "sore", tema: "alam" },

  // ---- Tema: Masjid & Ibadah ----
  { ar: "مَسْجِدٌ", id: "masjid", tema: "ibadah" },
  { ar: "صَلَاةٌ", id: "shalat", tema: "ibadah" },
  { ar: "قُرْآنٌ", id: "al-quran", tema: "ibadah" },
  { ar: "إِمَامٌ", id: "imam", tema: "ibadah" },
];

module.exports = { WORDS };
