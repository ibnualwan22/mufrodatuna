// Qiroah offsets are JS UTF-16 code units, never normalized Arabic.
const JENIS = new Set(['shigot', 'kalimat', 'irob', 'tanda_irob']);
const KALIMAT = new Set(['isim', "fi'l", 'harf']);
const LIMITS = Object.freeze({ judul: 200, bab: 200, teks: 50000, spans: 2000, nilai: 200, catatan: 2000, notes: 200, relations: 1000 });
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
  const result = { judul: string(payload.judul, 'judul'), bab: string(payload.bab || 'Materi sebelumnya', 'bab'), teks: string(payload.teks, 'teks') };
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
    if(Array.isArray(span.notes)&&span.notes.length>LIMITS.notes)throw new Error('Terlalu banyak catatan pada satu kelompok.');
    const notes = Array.isArray(span.notes) ? span.notes.map(note => {
      object(note);
      return { id: Number.isSafeInteger(note.id) && note.id > 0 ? note.id : undefined,
        judul: string(note.judul, 'nilai'), isi: string(note.isi, 'catatan', true) };
    }) : (span.catatan ? [{ judul: labelsFor(jenis), isi: string(span.catatan, 'catatan', true) }] : []);
    const detektifSalah=string(span.detektifSalah||'', 'catatan', true),detektifKoreksi=string(span.detektifKoreksi||'', 'catatan', true);
    if(Boolean(detektifSalah)!==Boolean(detektifKoreksi))throw new Error('Pernyataan keliru dan koreksinya harus diisi berpasangan.');
    return { ...(Number.isSafeInteger(span.id) && span.id > 0 ? { id: span.id } : {}), start, end, jenis, nilai, catatan: string(span.catatan, 'catatan', true), notes, detektifSalah, detektifKoreksi };
  });
  result.urutan = Array.isArray(payload.urutan) ? payload.urutan.filter(Number.isSafeInteger) : [];
  if(Array.isArray(payload.relations)&&payload.relations.length>LIMITS.relations)throw new Error('Terlalu banyak hubungan pada satu bacaan.');
  result.relations = Array.isArray(payload.relations) ? payload.relations.map(r => {
    object(r);
    return { ...(Number.isSafeInteger(r.id) && r.id > 0 ? { id:r.id } : {}),
      jenis: string(r.jenis, 'nilai'), dari: r.dari, ke: r.ke,
      label: string(r.label || 'Hubungan', 'nilai'), catatan: string(r.catatan, 'catatan', true) };
  }) : [];
  return result;
}
function labelsFor(jenis) { return ({ shigot:'Shigot', kalimat:'Kalimat', irob:'I\u2018rob', tanda_irob:'Tanda i\u2018rob' })[jenis]; }
module.exports = { object, id, validateSave, LIMITS };
