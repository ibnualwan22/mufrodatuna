/**
 * Normalisasi teks Arab agar jawaban tanpa harakat tetap terdeteksi benar.
 *
 * Contoh: "كِتَابٌ" (dengan harakat) dan "كتاب" (tanpa harakat)
 * keduanya dinormalisasi menjadi "كتاب".
 *
 * Langkah:
 * 1. Buang semua harakat/tashkeel (fathah, dhammah, kasrah, sukun,
 *    tanwin, shaddah, maddah, dll.)
 * 2. Buang tanda tatweel (ـ)
 * 3. Samakan varian alef: أ إ آ ٱ → ا
 * 4. Samakan ؤ → و, ئ → ي, ى → ي
 * 5. Rapikan spasi
 */
function normalizeArabic(text) {
  if (!text) return "";
  let s = String(text);

  // 1. Buang harakat: U+064B–U+065F (tashkeel) + U+0670 (alef khan jariyah)
  s = s.replace(/[ً-ٰٟ]/g, "");

  // 2. Buang tatweel
  s = s.replace(/ـ/g, "");

  // 3. Samakan alef
  s = s.replace(/[أإآٱ]/g, "ا");

  // 4. Samakan varian huruf lain
  s = s.replace(/ؤ/g, "و");
  s = s.replace(/ئ/g, "ي");
  s = s.replace(/ى/g, "ي");

  // 5. Rapikan spasi
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Normalisasi jawaban bahasa Indonesia: huruf kecil + rapikan spasi.
 */
function normalizeLatin(text) {
  if (!text) return "";
  return String(text).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Bandingkan jawaban pemain dengan kunci jawaban.
 * @param {string} input   jawaban yang diketik pemain
 * @param {string} expected kunci jawaban
 * @param {'ar'|'id'} lang  bahasa kunci jawaban
 */
function isCorrect(input, expected, lang) {
  if (lang === "ar") {
    return normalizeArabic(input) === normalizeArabic(expected);
  }
  return normalizeLatin(input) === normalizeLatin(expected);
}

module.exports = { normalizeArabic, normalizeLatin, isCorrect };
