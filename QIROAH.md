# Qiroah v1 — latihan lokal

Gunakan Node.js 24 (node:sqlite). Dari root repo:

    npm install
    DB_PATH=/tmp/qiroah-test.db ADMIN_PASSWORD=qiroah-lokal-sekali-pakai node server.js

Jangan gunakan kata sandi contoh ini untuk produksi. Server di http://localhost:3000.

## Admin

Buka /admin.html, masuk dengan password lokal tadi, lalu gulir ke seksi Qiroah.

1. Tambah teks, isi judul dan teks Arab berharakat.
2. Ketuk kata di pratinjau. Untuk beberapa kata: ketuk kata pertama lalu Shift + ketuk kata terakhir (juga mendukung Shift + Enter pada kata terfokus). Untuk huruf/harakat: sorot teks di pratinjau, lalu Gunakan seleksi. Pada layar sentuh gunakan seleksi teks native dengan tekan lama.
3. Pilih jenis, isi nilai dan catatan opsional, Tambahkan anotasi. Kelompok yang sama dapat diberi beberapa anotasi.
4. Simpan teks & anotasi. Ubah/Hapus pada baris anotasi hanya mengubah draf sampai disimpan. Hapus pada daftar teks menghapus teks beserta seluruh anotasinya setelah konfirmasi.
5. Ketika sudah ada anotasi, teks dikunci agar offset tidak bergeser. Ubah isi teks / hapus anotasi draf membuka kembali teks setelah konfirmasi; anotasi harus dibuat ulang. Mengubah judul tidak memengaruhi anotasi.

## Pemain

Di beranda Learn, gulir ke Qiroah, Muat teks, pilih bacaan, lalu ketuk bagian emas. Kelompok bertumpuk menampilkan pilihan kelompok tanpa membocorkan label. Jawab satu jenis anotasi per soal; gunakan Anotasi berikutnya untuk kelompok dengan beberapa anotasi.

Benar +100 dan streak bertambah. Salah menunjukkan jawaban dan catatan admin, streak kembali 0 tanpa mengurangi skor. Tiap anotasi hanya mendapat satu percobaan per sesi. Ulangi latihan teks ini mereset sesi. Skor/streak hanya selama sesi teks ini, tidak ditambahkan ke XP/progres Learn; tidak ada timer atau room.

## Data dan API

Teks disimpan persis tanpa normalisasi: offset start inklusif/end eksklusif memakai UTF-16 JavaScript. Span karakter, harakat tunggal, beberapa kata, overlap, dan beberapa anotasi dengan rentang sama didukung. Save atomik menyimpan teks serta mengganti daftar anotasinya. ID anotasi berubah pada save.

Event admin melalui helper admin() dan password pada setiap payload:
- admin:qiroahList {password}
- admin:qiroahGet {password,id}
- admin:qiroahSave {password,id?,judul,teks,spans:[{start,end,jenis,nilai,catatan}]}
- admin:qiroahDelete {password,id}

Event publik qiroah:list {} dan qiroah:get {id}. Mode latihan mengirim anotasi kepada browser; bukan protokol anti-cheat. Nilai jawaban tidak ditampilkan sampai soal/feedback.

## Pengujian

    DB_PATH=/tmp/qiroah-test.db ADMIN_PASSWORD=qiroah-lokal-sekali-pakai npm test

Tes otomatis memakai DB terisolasi di scratch, bukan data repo. Test browser opsional memakai Playwright yang diinstal terpisah, tidak menambah dependency aplikasi:

    PLAYWRIGHT_PATH=/absolute/path/to/playwright CHROMIUM_PATH=/absolute/path/to/chrome node test/qiroah-ui.cjs

Browser test menjalankan server sendiri dengan password acak, port acak, dan DB /tmp/qiroah-test.db. Memeriksa input/seleksi harakat, multi-anotasi, CRUD, jawaban benar/salah, skor/streak, keutuhan teks, overflow viewport 390px, dan error JavaScript. Uji sentuhan fisik/seleksi native pada iOS/Android tetap disarankan.
