# ⚡ Sprint Mufrodat

Game lomba hafalan mufrodat Arab–Indonesia multipemain, real-time via WebSocket.
Prototipe layanan terpisah (bukan di dalam Siakad) — deploy di `https://siakad.markazarabiyah.site/game/`

## Fitur

- **1–2 sesi per game**, tiap sesi dikonfigurasi ustadz:
  - **Arah**: Arab→Indonesia (keyboard Latin) atau Indonesia→Arab (keyboard Arab)
  - **Tipe jawaban**: *essay* (ketik) atau *pilihan ganda* (tap)
  - **Durasi**: 30 / 45 / 60 / 90 detik
- **Jeda antar sesi** (15 dtk) + peringatan ganti keyboard
- **Juara Umum** dari total skor semua sesi (+ papan skor live per sesi di host)
- **Bank mufrodat berjenjang**: Program → Bab → Kata, dikelola lewat halaman admin
- **Essay Arab tanpa harakat**: `كتاب` diterima untuk `كِتَابٌ` (normalisasi alef/hamzah/tatweel)
- Room 4-karakter, nama pemain dari NIS, 2 bot untuk tes solo
- Skor: 100 + bonus kecepatan (s.d. 50) + bonus 100 tiap streak kelipatan 5

## Halaman admin

`/game/admin.html` — kelola program, bab, dan kata (tambah/edit/hapus).
Login dengan `ADMIN_PASSWORD`.

## Env

| Var | Default | Keterangan |
|---|---|---|
| `PORT` | 3000 | |
| `SPRINT_SECONDS` | 60 | default durasi sesi |
| `ADMIN_PASSWORD` | `mufrodat123` | **ganti di production!** |
| `DB_PATH` | `./data/sprint.db` | file SQLite (mount volume agar awet) |

## Struktur DB (SQLite, via node:sqlite bawaan)

`programs(id, nama)` → `babs(id, program_id, judul, urutan)` → `words(id, bab_id, arab, indonesia)`

Skema disiapkan menyerupai struktur Siakad agar migrasi mudah.
Seed awal: 2 program (I'dad Lughawi, Mutawassith), 5 bab, 45 kata.

## Struktur kode

```
server.js            → logika game (Socket.io): room, sesi, timer, skor, bot, admin API
lib/normalize.js     → normalisasi Arab tanpa harakat
lib/db.js            → SQLite: skema + seed + query
data/words.js        → data seed awal (±45 mufrodat + harakat, per tema)
public/              → tampilan web (home, wizard host, arena, admin.html)
test/simulate.js     → simulasi end-to-end (npm test)
```

## Jalankan lokal

```bash
npm install
node server.js        # http://localhost:3000
```

## Tes otomatis

```bash
npm test   # simulasi: admin CRUD + game 2 sesi (MC + essay) + jeda + juara umum
```

## Deploy (VPS)

```bash
docker build -t sprint-mufrodat .
docker run -d --name sprint-mufrodat --restart unless-stopped \
  -p 127.0.0.1:3010:3000 \
  -e ADMIN_PASSWORD='isi-password-kuat' \
  -v /home/ubuntu/sprint-mufrodat/data:/app/data \
  sprint-mufrodat
```

Nginx: proxy `/game/` → `127.0.0.1:3010` (lihat blok location siakad).
**Penting**: bind ke `127.0.0.1` saja (jangan `0.0.0.0`) agar tidak bisa
ditembak langsung dari internet.

## TODO sebelum produksi

- Ganti `lookupSantri()` mock dengan query Siakad asli; tolak NIS tak dikenal/duplikat
- Rate-limit jawaban per pemain (anti-spam)
- Auth host (ustadz) untuk buat room
- Simpan riwayat game & skor
