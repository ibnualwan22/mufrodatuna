# Pemeriksaan implementasi — 2 November 2026

Ini laporan integrasi prototipe, **bukan benchmark akurasi siswa**.

## Pemeriksaan yang selesai

- `npm test`: 22 tes lolos. Mencakup regresi game lama/Al-Qur’an, penyimpanan target dan revisi admin, aturan akhir hilang/salah/tidak pasti, token pemulihan koneksi, serta pengabaian hasil inferensi usang.
- Dari direktori `services/qiroah-speech`, `.venv/bin/python -m unittest test_app.py`: 3 tes lolos.
- Browser Chromium pada lebar 1200 dan 390 px: teks awal tanpa harakat, bantuan saat inferensi, jeda, pemulihan, akhir salah, hasil akhir, perbandingan dengan bacaan pertama, tidak ada luapan horizontal, dan catatan admin yang bertahan setelah dimuat ulang. Keluaran model pada pemeriksaan perilaku UI ini dikendalikan oleh harness pengujian, bukan dianggap sebagai bukti akurasi.
- Inspeksi visual menemukan pewarnaan harakat mengikuti huruf induk dalam shaping Arab. Markah sekarang digambar dalam inline box berlebar nol dengan joiner agar harakat salah berwarna merah dan huruf tetap hitam.
- Dependensi serta checkpoint dipasang lokal melalui `npm run speech:setup`. Layanan `npm run speech` melaporkan siap; server aplikasi dapat mengaksesnya melalui `reading:health`.
- Satu audio TTS Arab melewati Socket.IO → Node → model Python → hasil sesi. Model mengembalikan `waqf`, indeks tetap 0, dengan waktu respons sekitar 2,25 detik pada satu permintaan. Bunyi TTS itu tidak dilabeli pengajar; hasil tersebut hanya membuktikan sambungan inferensi, bukan ketepatan deteksi dhammah atau waqaf. Angka ini bukan p95.

## Batas yang masih berlaku

- Membaca satu kata sasaran lalu jeda; belum bacaan kalimat terus-menerus.
- Acuan awal fathah/kasrah/dhammah saja. Model fonem dan pencocokan konsonan masih heuristik; salah deteksi dan permintaan ulang yang keliru masih mungkin.
- Belum ada rekaman berlabel dari siswa, kalibrasi, uji mikrofon fisik Android/iOS, atau pengukuran lima pembaca serentak. Jangan menyebut prototipe ini sebagai penilai yang akurat sebelum evaluasi tersebut dilakukan.
- Hasil bacaan pertama dipertahankan selama mengulang bacaan yang sama pada halaman ini; belum menjadi riwayat siswa permanen.

Protokol evaluasi berikutnya ada pada [panduan benchmark](README.md).
