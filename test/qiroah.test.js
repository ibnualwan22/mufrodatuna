const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { join } = require('node:path');
const { homedir } = require('node:os');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { DatabaseSync } = require('node:sqlite');
const { io } = require('socket.io-client');
const { validateSave, LIMITS } = require('../lib/qiroah');

// Never open the repository database; preserve isolated fixtures for inspection.
const dir = mkdtempSync(join(process.env.TMPDIR || join(homedir(), '.hermes/cache/scratch'), 'qiroah-'));
process.env.DB_PATH = join(dir, 'qiroah.db');
const db = require('../lib/db');
const span = { start: 0, end: 6, jenis: 'kalimat', nilai: 'isim', catatan: 'مَرْفُوعٌ' };
const fixture = () => ({ judul: '  قراءة  ', teks: 'قَلَمٌ  كِتَابٌ\n😀 ا\u0654', spans: [{ ...span }, { ...span, jenis: 'irob', nilai: 'mubtada' }, { start: 4, end: 9, jenis: 'tanda_irob', nilai: 'dhammah' }] });

test('Qiroah practice preserves tokens, overlapping groups, unique options and consecutive scoring', async () => {
  const {tokens, groups, segments, optionsFor, award} = await import('../public/qiroah-core.mjs');
  const input=fixture();
  assert.equal(tokens(input.teks).map(t=>t.text).join(''),input.teks);
  for(const t of tokens(input.teks))assert.equal(input.teks.slice(t.start,t.end),t.text);
  assert.equal(groups(input.spans).length,2);
  assert.equal(groups(input.spans)[0].annotations.length,2);
  assert.equal(segments(input.teks,input.spans).map(s=>s.text).join(''),input.teks);
  for(const annotation of input.spans){const options=optionsFor(annotation,input.spans);assert.ok(options.includes(annotation.nilai));assert.equal(new Set(options).size,options.length);assert.ok(options.length>=3);}
  const custom={start:0,end:1,jenis:'irob',nilai:'custom'};
  const options=optionsFor(custom,[custom,...['one','two','three'].map(nilai=>({...custom,nilai}))]);
  assert.deepEqual(new Set(options),new Set(['custom','one','two','three']));
  let state={score:0,streak:0,best:0};state=award(award(state,true),true);
  assert.deepEqual(state,{score:200,streak:2,best:2});assert.deepEqual(award(state,false),{score:200,streak:0,best:2});
});

test('Qiroah CRUD preserves harakat, whitespace, UTF-16, overlaps and cascade', () => {
  const input = fixture(), saved = db.saveQiroahText(input);
  assert.equal(saved.teks, input.teks);
  assert.equal(saved.judul, input.judul);
  assert.equal(saved.teks.slice(saved.spans[0].start, saved.spans[0].end), 'قَلَمٌ');
  assert.equal(saved.spans.length, 3);
  assert.equal(saved.spans[0].catatan, span.catatan);
  assert.ok(db.listQiroahTexts().some(t => t.id === saved.id));
  assert.deepEqual(db.getQiroahText(saved.id), saved);
  const emoji = input.teks.indexOf('😀');
  const updated = db.saveQiroahText({ ...input, id: saved.id, spans: [{ start: emoji, end: emoji + 2, jenis: 'shigot', nilai: 'amr' }] });
  assert.equal(updated.spans.length, 1);
  assert.equal(updated.teks.slice(updated.spans[0].start, updated.spans[0].end), '😀');
  assert.equal(updated.spans[0].catatan, '');
  const check = new DatabaseSync(process.env.DB_PATH);
  assert.equal(check.prepare('SELECT COUNT(*) AS n FROM qiroah_spans WHERE text_id = ?').get(saved.id).n, 1);
  assert.equal(db.deleteQiroahText(saved.id), 1);
  assert.equal(check.prepare('SELECT COUNT(*) AS n FROM qiroah_spans WHERE text_id = ?').get(saved.id).n, 0);
  check.close();
  assert.throws(() => db.getQiroahText(saved.id), /tidak ditemukan/);
  assert.throws(() => db.deleteQiroahText(saved.id), /tidak ditemukan/);
});

test('Qiroah rejects malformed types, lengths, IDs, enums, offsets and surrogate splits', () => {
  for (const value of [null, undefined, [], 'text', 42]) assert.throws(() => validateSave(value));
  for (const key of ['judul', 'teks']) {
    for (const value of [null, 1, {}, '', '  ', 'x'.repeat(LIMITS[key] + 1), '\ud800']) assert.throws(() => validateSave({ ...fixture(), [key]: value }));
  }
  for (const id of [null, '1', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateSave({ ...fixture(), id }));
    assert.throws(() => db.getQiroahText(id));
    assert.throws(() => db.deleteQiroahText(id));
  }
  for (const spans of [null, {}, 'x', Array(LIMITS.spans + 1).fill(span), [null], [42], new Array(1)]) assert.throws(() => validateSave({ ...fixture(), spans }));
  const badSpans = [
    { start: -1 }, { start: 1.2 }, { start: '0' }, { start: null }, { end: 0 }, { end: 9999 }, { end: 2.5 },
    { jenis: 'other' }, { jenis: null }, { nilai: 'verb' }, { nilai: '' }, { nilai: 1 },
    { nilai: 'x'.repeat(LIMITS.nilai + 1) }, { catatan: null }, { catatan: 1 }, { catatan: 'x'.repeat(LIMITS.catatan + 1) }
  ];
  for (const change of badSpans) assert.throws(() => validateSave({ ...fixture(), spans: [{ ...span, ...change }] }));
  for (const nilai of ['isim', "fi'l", 'harf']) assert.doesNotThrow(() => validateSave({ ...fixture(), spans: [{ ...span, nilai }] }));
  const at = fixture().teks.indexOf('😀');
  for (const range of [{ start: at, end: at + 1 }, { start: at + 1, end: at + 2 }]) assert.throws(() => validateSave({ ...fixture(), spans: [{ ...span, ...range }] }));
  // Combining marks are valid character selections, not silently stripped.
  assert.equal(validateSave({ ...fixture(), spans: [{ ...span, start: 1, end: 2 }] }).teks.slice(1, 2), 'َ');
});

test('Qiroah invalid saves and database failures roll back entire aggregate', () => {
  const saved = db.saveQiroahText(fixture());
  assert.throws(() => db.saveQiroahText({ ...fixture(), id: saved.id, judul: 'Changed', spans: [{ ...span, end: 999 }] }));
  assert.deepEqual(db.getQiroahText(saved.id), saved);
  const check = new DatabaseSync(process.env.DB_PATH);
  check.exec("CREATE TRIGGER qiroah_test_failure BEFORE INSERT ON qiroah_spans WHEN NEW.nilai = 'forced-failure' BEGIN SELECT RAISE(ABORT, 'forced failure'); END");
  const broken = { ...fixture(), spans: [{ ...span }, { ...span, jenis: 'irob', nilai: 'forced-failure' }] };
  assert.throws(() => db.saveQiroahText({ ...broken, id: saved.id, judul: 'Changed' }), /forced failure/);
  assert.deepEqual(db.getQiroahText(saved.id), saved);
  const before = db.listQiroahTexts();
  assert.throws(() => db.saveQiroahText(broken), /forced failure/);
  assert.deepEqual(db.listQiroahTexts(), before);
  check.exec('DROP TRIGGER qiroah_test_failure');
  check.close();
  assert.throws(() => db.saveQiroahText({ ...fixture(), id: 999999 }), /tidak ditemukan/);
  assert.equal(db.saveQiroahText({ ...fixture(), id: saved.id, spans: [] }).spans.length, 0);
  db.deleteQiroahText(saved.id);
});

test('Qiroah Socket.IO admin auth, public practice, CRUD and malformed payload safety', { timeout: 20000 }, async t => {
  const password = 'qiroah-disposable-test';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: join(__dirname, '..'), env: { ...process.env, PORT: '0', DB_PATH: join(dir, 'api.db'), ADMIN_PASSWORD: password }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); child.kill('SIGTERM'); await exit; }
  });
  let output = '';
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Startup timeout: ' + output)), 10000);
    child.stdout.on('data', chunk => { output += chunk; const match = output.match(/localhost:(\d+)/); if (match) { clearTimeout(timer); resolve(Number(match[1])); } });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('exit', code => { clearTimeout(timer); reject(new Error(`Server exit ${code}: ${output}`)); });
  });
  const socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false, timeout: 3000 });
  t.after(() => socket.disconnect());
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  const call = (event, args) => socket.timeout(3000).emitWithAck(event, args);
  const admin = (event, args = {}) => call(event, { ...args, password });
  for (const event of ['admin:qiroahList', 'admin:qiroahGet', 'admin:qiroahSave', 'admin:qiroahDelete']) {
    for (const args of [{}, { password: 'wrong' }, null, [], 'bad']) assert.ok((await call(event, args)).error);
  }
  assert.equal((await call('admin:login', { password })).ok, true);
  assert.ok((await call('admin:qiroahSave', fixture())).error, 'login never bypasses per-event password');
  const initial = await call('qiroah:list', {});
  assert.ok(initial.texts.some(item => item.judul === 'Air yang Dapat Dipakai Bersuci'));
  const saved = await admin('admin:qiroahSave', fixture());
  assert.equal(saved.ok, true);
  assert.equal(saved.text.teks, fixture().teks);
  const id = saved.text.id;
  assert.deepEqual(await admin('admin:qiroahGet', { id }), saved);
  assert.deepEqual(await call('qiroah:get', { id }), saved);
  assert.deepEqual(await admin('admin:qiroahList'), await call('qiroah:list', {}));
  for (const args of [null, [], {}, { id: '1' }, { id: -1 }, { id: 99999 }]) assert.ok((await call('qiroah:get', args)).error);
  assert.ok((await call('qiroah:list', null)).error);
  assert.ok((await admin('admin:qiroahSave', { ...fixture(), id, spans: [{ ...span, jenis: 'bad' }] })).error);
  assert.deepEqual(await call('qiroah:get', { id }), saved);
  const updated = await admin('admin:qiroahSave', { id, judul: 'Updated', teks: 'بِ', spans: [{ start: 1, end: 2, jenis: 'tanda_irob', nilai: 'kasrah' }] });
  assert.equal(updated.ok, true);
  assert.equal(updated.text.spans.length, 1);
  assert.deepEqual(await call('qiroah:get', { id }), updated);
  socket.emit('admin:qiroahSave', { ...fixture(), password }); // No ack: ignored, never crashes or writes.
  socket.emit('admin:qiroahDelete', { id, password }, 'not-a-function');
  socket.emit('qiroah:get', null);
  socket.emit('admin:login', null);
  assert.equal((await call('qiroah:list', {})).texts.length, initial.texts.length + 1);
  assert.deepEqual(await admin('admin:qiroahDelete', { id }), { ok: true, deleted: 1 });
  assert.ok((await call('qiroah:get', { id })).error);
  assert.deepEqual(await call('qiroah:list', {}), initial);
  assert.ok((await admin('admin:qiroahDelete', { id })).error);
});
