// Qiroah offsets are JS UTF-16 code units, never normalized Arabic.
const JENIS = new Set(['shigot', 'kalimat', 'irob', 'tanda_irob']);
const KALIMAT = new Set(['isim', "fi'l", 'harf']);
const LIMITS = Object.freeze({ judul: 200, teks: 50000, spans: 2000, nilai: 200, catatan: 2000 });
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payload Qiroah harus objek.');
  return value;
}
function id(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('ID Qiroah tidak valid.');
  return value;
}
function string(value, key, optional = false) {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || value.length > LIMITS[key] || (!optional && !value.trim()) || !value.isWellFormed()) {
    throw new Error(`${key} Qiroah tidak valid (maksimal ${LIMITS[key]} karakter UTF-16).`);
  }
  return value;
}
function splitsSurrogate(text, offset) {
  const prev = text.charCodeAt(offset - 1), next = text.charCodeAt(offset);
  return prev >= 0xd800 && prev <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
}
function validateSave(payload) {
  object(payload);
  const result = { judul: string(payload.judul, 'judul'), teks: string(payload.teks, 'teks') };
  if (payload.id !== undefined) result.id = id(payload.id);
  if (!Array.isArray(payload.spans) || payload.spans.length > LIMITS.spans) throw new Error('Daftar anotasi Qiroah tidak valid.');
  result.spans = Array.from(payload.spans, span => {
    object(span);
    const { start, end, jenis } = span;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > result.teks.length ||
        splitsSurrogate(result.teks, start) || splitsSurrogate(result.teks, end)) throw new Error('Rentang anotasi Qiroah tidak valid.');
    if (!JENIS.has(jenis)) throw new Error('Jenis anotasi Qiroah tidak valid.');
    const nilai = string(span.nilai, 'nilai');
    if (jenis === 'kalimat' && !KALIMAT.has(nilai)) throw new Error("Nilai kalimat harus isim, fi'l, atau harf.");
    return { start, end, jenis, nilai, catatan: string(span.catatan, 'catatan', true) };
  });
  return result;
}
module.exports = { object, id, validateSave, LIMITS };