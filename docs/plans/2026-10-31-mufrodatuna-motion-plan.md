# Rencana Mufrodatuna: permainan, karakter, dan animasi

Tanggal: 31 Oktober 2026. Status: rancangan untuk ditinjau; implementasi belum dimulai.

## 1. Hasil yang dituju

Mufrodatuna menjadi tempat berlatih bahasa Arab yang langsung menampilkan pilihan permainan. Acuan kualitasnya adalah respons, kejelasan, ritme, dan perhatian terhadap detail pada Duolingo dan web game profesional. Identitas visual mengikuti maskot milik pengguna.

Keputusan yang sudah diberikan pengguna:

- Hilangkan pilihan akses ustadz, santri, dan peran lainnya dari alur awal.
- Tampilkan pilihan permainan pada halaman pertama.
- Fokus materi: mufrodat, ta’birot sehari-hari, dan uslub.
- Siapkan program dan materi dummy untuk testing.
- Materi sebenarnya nanti diisi pengguna melalui admin dan disesuaikan dengan jenis permainan.
- Gunakan lima pose PNG yang telah diberikan; GLB menyusul.
- Prioritaskan animasi yang halus dan terasa dibuat dengan sengaja.
- Saat ini hanya membuat rencana.

Ukuran keberhasilan: satu sesi belajar terasa responsif, dapat dipahami, dan menyenangkan saat diulang. Kualitas tidak dinilai dari jumlah animasi atau banyaknya library.

## 2. Asumsi kerja dan batas versi pertama

Asumsi yang dapat dikoreksi saat meninjau rencana:

- Pengguna awal adalah pemula yang sudah dapat mengenali huruf Arab; rentang usia belum ditentukan.
- Testing dimulai dengan latihan mandiri langsung, tanpa login pelajar atau NIS. Login admin tetap dipertahankan.
- HP menjadi perangkat utama, dengan tata letak yang juga nyaman di desktop.
- Sesi belajar berisi sekitar 8–10 soal, dengan tombol Lanjut setelah feedback. Timer kompetisi menjadi mode tersendiri jika dibutuhkan kemudian.
- Kemajuan awal disimpan di perangkat dan diberi keterangan yang jelas. Sinkronisasi akun menjadi pekerjaan terpisah.
- Kapasitas awal ditujukan untuk pengujian internal, bukan peluncuran dengan beban pengguna yang belum diketahui. Angka target pengguna bersamaan ditentukan sebelum produksi.
- Pengguna memiliki materi; aplikasi menyediakan struktur latihan, pemeriksaan jawaban, dan pengelolaan konten.
- Aplikasi harus pulih dari kegagalan audio, koneksi terputus, dan permintaan yang kedaluwarsa tanpa menggandakan skor atau menimpa soal baru.

Belum termasuk versi pertama: model 3D, gerak bibir, liga, pembayaran, integrasi Siakad, atau pembukaan fitur kompetisi kembali. Backend permainan lama tidak perlu dihapus untuk menghilangkan pilihan peran dari halaman awal.

## 3. Temuan dari proyek saat ini

Pemeriksaan ini berdasarkan kode, bukan hasil pengukuran FPS atau penilaian tampilan yang sudah dijalankan.

| Bagian | Temuan | Implikasi untuk rencana |
| --- | --- | --- |
| Halaman awal | Memuat latihan mandiri, room ustadz, dan gabung santri | Ubah menjadi katalog permainan dengan kategori materi |
| Mini-game | Sudah ada pilihan ganda, dengar, susun huruf, pasangan, benar/salah, dan ketik | Pertahankan bagian yang cocok, lalu tambahkan dialog serta susun kalimat |
| Maskot | Avatar permainan berupa huruf م dengan kelas cheer/oops | Ganti dengan pengendali lima keadaan PNG |
| Susun huruf | Bank dan tempat jawaban dibuat ulang melalui innerHTML setiap ketukan | Pertahankan identitas kartu dan animasikan perpindahannya |
| Pergantian soal | Mengandalkan jeda tetap 520/1450 ms | Pindah mengikuti state permainan dan pilihan pengguna |
| Audio | TTS dan efek memakai pemicu tersendiri; status bicara juga dibatasi timeout tetap | Satukan kepemilikan audio, tunggu event yang sesuai, dan tangani pembatalan |
| Progress waktu | Mengubah width | Rencanakan transform scaleX dengan ruang tampilan tetap |
| Confetti | Berjalan selama sejumlah frame dan memperbarui posisi per frame | Gunakan durasi berbasis waktu dan pembatalan saat keluar |
| Reduced motion | CSS sudah ada, tetapi canvas mempunyai loop sendiri | Terapkan preferensi juga ke JavaScript, maskot, dan partikel |
| Materi/admin | Struktur program → bab → kata, dengan teks Arab dan arti | Tambahkan struktur yang mendukung konteks dialog, pola, dan variasi jawaban |

## 4. Arah visual dan alur

Warna: putih hangat untuk latar, arang untuk teks, kuning dari maskot untuk tindakan utama. Warna feedback memiliki peran tersendiri dan selalu disertai ikon serta teks.

Bahasa bentuk: tombol dengan kedalaman yang jelas, kartu dengan ruang lega, ikon yang konsisten, dan tulisan Arab yang mudah dibaca. Motif pakaian maskot cukup menjadi aksen kecil pada momen pembuka/hasil; area soal tetap tenang.

Alur utama:

Beranda permainan → pilih kategori dan permainan → pilih tema → latihan → hasil → ulangi bagian yang sulit atau pilih latihan berikutnya.

Beranda memuat:

1. Sapaan pendek dan maskot; tombol melanjutkan hanya muncul bila ada kemajuan nyata.
2. Filter Mufrodat, Ta’birot, dan Uslub.
3. Kartu permainan dengan nama, kemampuan yang dilatih, tema, dan perkiraan durasi.
4. Akses admin yang terpisah dari pilihan bermain.

Layar latihan memuat progres, petunjuk singkat, soal, area jawaban, dan area feedback dengan posisi stabil. Maskot kecil mendampingi soal; maskot besar dipakai pada pembuka dan hasil. Pengguna dapat keluar, mengulang audio, memperbaiki pilihan, dan melanjutkan melalui kontrol yang jelas.

Keadaan yang harus dirancang sejak awal: memuat materi, materi kosong, audio tidak tersedia, jawaban sedang diperiksa, jawaban benar/keliru, koneksi terputus, dan sesi selesai. Pesan kondisi tersebut berada pada konteks tindakannya.

## 5. Standar animasi anti-slop

Setiap gerakan harus menjawab tiga hal: tindakan pemicunya, informasi yang disampaikan, dan keadaan akhirnya.

Aturan yang akan dipakai saat implementasi:

1. Respons sentuhan muncul segera. Tampilan menunggu jawaban server berbeda dari tampilan jawaban benar.
2. Setiap objek memiliki karakter gerak: tombol terasa menekan, kartu berpindah ke tempatnya, maskot bereaksi, dan progres menunjukkan perubahan hasil.
3. Satu pusat perhatian pada satu waktu. Audio, tanda centang, maskot, dan progres tersusun mengikuti kejadian yang sama.
4. Teks soal dan posisi tombol tetap stabil saat pemain membaca atau menjawab.
5. Pantulan dipakai secara selektif. Tombol dan kartu tidak seluruhnya memakai efek pop yang sama.
6. Gerakan berulang dapat dihentikan atau dialihkan dari posisi saat itu; ketukan cepat tidak membuat animasi mengantre.
7. Efek pendek mendampingi jawaban. Perayaan yang lebih panjang khusus untuk sesi selesai dan dapat dilewati.
8. Maskot diam saat pemain membutuhkan konsentrasi. Hindari seluruh halaman yang terus mengambang, berdenyut, atau bergoyang.
9. Gunakan sistem warna, ukuran, ikon, dan easing yang sama di semua mini-game. Hindari gradien, blur, glow, dan partikel yang tidak membantu permainan.
10. Tinjau gerakan pada kecepatan normal serta gerak lambat. Rekaman harus menunjukkan awal, perpindahan, dan pendaratan yang masuk akal.

Angka berikut adalah titik awal tuning untuk Mufrodatuna, bukan spesifikasi internal Duolingo:

| Interaksi | Rancangan gerak | Durasi awal |
| --- | --- | --- |
| Tombol ditekan | Bagian muka turun mengikuti kedalaman tombol; teks tidak berubah ukuran | 100–140 ms |
| Tombol dilepas | Kembali ke posisi awal dengan pendaratan pendek | 140–180 ms |
| Kartu dipilih | Status pilihan langsung jelas; penekanan visual ringan | 120–160 ms |
| Tile masuk/keluar slot | Bergerak dari posisi asal ke tujuan dengan kedua posisi tetap terhubung | 180–240 ms |
| Pasangan cocok | Kedua kartu mendapat konfirmasi serempak, lalu menjadi selesai; ruangnya tetap | 180–240 ms |
| Jawaban keliru | Bagian yang perlu diperbaiki ditandai, petunjuk muncul; gerakan kecil bila membantu | 160–220 ms |
| Pergantian soal | Konten keluar/masuk pendek dengan tempat jawaban tetap stabil | 180–240 ms total |
| Respons benar | Ikon konfirmasi, pose benar, dan progres tersusun dalam satu kejadian | 200–280 ms untuk gerak utama |
| Sesi selesai | Pose perayaan, hasil nyata, dan suara penutup dalam urutan pendek | 700–1000 ms; dapat dilewati |

Gunakan kembali token --ease-out dan --ease-in-out yang sudah ada. Jika spring benar-benar diperlukan, gunakan konfigurasi yang diuji bersama; jangan membuat kurva berbeda pada setiap komponen. Pilihan lewat keyboard tidak diberi jeda gerakan yang menahan input.

## 6. Sistem lima pose PNG

Sumber: `/mnt/c/Users/user/Downloads/Lima Pose Maskot Ceria Islami.png`.

Tahap persiapan aset setelah implementasi diizinkan:

- Pisahkan lima pose dengan mempertahankan bentuk, warna, pakaian, dan tulisan aslinya.
- Periksa alpha dan tepi gambar di latar terang serta gelap; jangan menganggap tampilan hitam pratinjau sebagai bukti jenis latarnya.
- Samakan ukuran karakter, titik pijak kaki, ruang aman tangan, dan ukuran kanvas. Pose melompat tetap mendapat ruang aman di atas/bawah.
- Siapkan ukuran yang sesuai untuk beranda dan arena; simpan sumber aslinya.
- Muat dan decode pose yang akan dipakai sebelum sesi dimulai. Sediakan tampilan cadangan jika aset gagal dimuat.

| State | Pose | Penggunaan |
| --- | --- | --- |
| welcome | Kiri atas | Menyambut dan memulai latihan |
| thinking | Tengah atas | Petunjuk dan koreksi yang mendukung |
| encourage | Kanan atas | Memulai tantangan atau mengajak mencoba kembali |
| correct | Kiri bawah | Jawaban tepat |
| complete | Kanan bawah | Sesi selesai |

Pergantian pose memakai transisi singkat yang dipilih setelah melihat hasil: crossfade sangat pendek atau pertukaran saat perpindahan kecil. Crossfade panjang antar-siluet yang berbeda dapat menghasilkan bayangan ganda dan harus dihindari. Kepala dan kaki tidak boleh meloncat posisinya akibat ukuran aset yang berbeda.

Kelima PNG memberi lima ekspresi statis. Gerakan seluruh gambar dan perpindahan pose bisa dipoles; gerak tangan, kedipan, dan mulut secara mandiri memerlukan frame tambahan, gambar berlapis, atau model dengan rig. Target versi PNG adalah kualitas interaksi yang mendekati acuan; kemiripan penuh animasi karakter belum dapat dijanjikan dari aset ini.

Saat GLB tersedia nanti, perubahan dibatasi pada cara karakter ditampilkan. Pemicu welcome/thinking/encourage/correct/complete tetap sama. Three.js baru dievaluasi untuk tahap tersebut, beserta fallback PNG pada perangkat yang memerlukannya.

## 7. Audio dan urutan kejadian

Enam bunyi inti: tekan, tile masuk, pasangan cocok, jawaban benar, perlu mencoba lagi, dan sesi selesai. Bunyi mempunyai warna suara serta volume yang konsisten; variasi kemenangan tidak terus menaikkan nada tanpa batas.

Kontrol efek suara dipisahkan dari pelafalan. Preferensi disimpan. Mematikan suara menghentikan suara yang masih berjalan. Pelafalan Arab mendapat prioritas; efek tidak menutupinya. Audio dimulai setelah interaksi pengguna sesuai aturan browser.

Contoh satu jawaban benar:

1. Ketukan memberi respons visual lokal dan mengunci pengiriman ganda.
2. Jawaban yang sudah terverifikasi memicu tanda benar dan bunyi secara terkoordinasi.
3. Pose correct muncul, lalu progres bertambah satu kali.
4. Feedback tetap terbaca. Tombol Lanjut tersedia tanpa harus menunggu dekorasi selesai.
5. Saat lanjut/keluar, hentikan audio, permintaan, dan animasi milik soal sebelumnya.

Jawaban salah menampilkan koreksi yang spesifik dan kesempatan memahaminya. Latihan biasa tidak dihentikan karena jatah hati habis. Status audio mengikuti event pemutaran; timeout hanya menjadi pengaman kegagalan, bukan penentu panjang setiap kalimat.

Materi audio dummy boleh memakai jalur TTS yang ada, dengan penanganan gagal yang terlihat. Kualitas pelafalan untuk materi final harus ditinjau; rekaman yang disetujui dapat disimpan dari admin nanti.

## 8. Permainan dan konten dummy

Usulan awal: tiga program, masing-masing dua bab dengan delapan item inti, sehingga total 48 item. Satu item dapat mendukung lebih dari satu bentuk latihan yang sesuai.

| Program | Dua bab awal | Bentuk latihan utama |
| --- | --- | --- |
| Mufrodat Dasar | Di kelas; di rumah | Pilih arti, pasangkan kata, dengar lalu pilih |
| Ta’birot Harian | Sapaan; meminta izin dan bantuan | Pilih respons situasional, lengkapi dialog, susun ungkapan |
| Uslub Praktis | Menyatakan keinginan; bertanya letak | Lengkapi pola, susun kalimat, terapkan pola pada situasi baru |

Contoh item: كِتَابٌ = buku; أَسْتَأْذِنُ فِي الدُّخُولِ = saya meminta izin untuk masuk; أُرِيدُ كِتَابًا = saya ingin sebuah buku. Kalimat, harakat, terjemahan, dan pengecoh ditinjau sebelum menjadi acuan penilaian.

Urutan implementasi engine: pilihan ganda dan pasangan → susun kata/kalimat → dialog situasional dan lengkapi pola → integrasi audio lintas mode. Susun huruf yang sudah ada tetap khusus kosakata yang cocok; ungkapan panjang disusun per kata.

Untuk Arab, tile yang terpisah harus tetap mempunyai pratinjau jawaban yang tersambung dan terbaca. Urutan RTL, harakat, kata berulang, dan penghapusan tile perlu diuji. Jawaban ekuivalen yang sah didefinisikan pada materi; penerimaan jawaban tidak bergantung hanya pada satu string mentah.

Admin mengelola kategori, program/bab, jenis latihan, konteks atau instruksi, teks Arab, arti, pilihan, jawaban yang diterima, penjelasan, dan audio bila tersedia. Field yang terlihat menyesuaikan jenis latihan. Ada pratinjau soal sebelum disimpan.

Data dummy ditandai jelas di admin, dibuat secara idempoten, dan tidak menimpa materi lama. Perluasan skema bersifat tambahan dengan pengujian migrasi pada salinan database.

## 9. Pendekatan teknis

Pertahankan HTML/CSS/JavaScript, Express, Socket.io, dan SQLite yang ada. CSS menangani tekanan tombol dan transisi sederhana. Web Animations API menangani perpindahan tile dan urutan yang perlu dibatalkan. Canvas dibatasi untuk perayaan pendek bila diperlukan.

Pisahkan tanggung jawab pada kode yang sudah ada secara bertahap:

- Pengendali sesi: memuat → siap → menjawab → memeriksa → feedback → lanjut → selesai.
- Pengendali gerak: menjalankan, menghentikan, dan membersihkan animasi milik tampilan saat ini.
- Pengendali karakter: menerima state dan memilih pose.
- Pengendali audio: prioritas, pemutaran, mute, kegagalan, dan pembatalan.
- Renderer soal: mempertahankan elemen interaktif agar klik, fokus, dan posisi kartu tetap benar.

Setiap sesi/soal memiliki identitas. Respons lama tidak boleh mengubah soal baru. Penilaian yang memengaruhi skor diverifikasi server; animasi tidak menjadi sumber kebenaran skor. Bunyi atau animasi gagal tidak boleh mengunci permainan.

## 10. Urutan pengerjaan dan keluaran

| Tahap | Pekerjaan | Bukti selesai |
| --- | --- | --- |
| 1. Kontrak visual dan aset | Kunci tampilan beranda/arena/hasil, normalisasi lima pose, petakan feedback | Tiga rancangan layar dan matriks state dapat ditinjau |
| 2. Prototipe interaksi | Satu latihan mufrodat dengan pilih jawaban, pasangan, benar/salah, maskot, suara, dan hasil | Sesi pendek dapat dimainkan berulang dan direkam di desktop/HP |
| 3. Penyempurnaan gerak | Tuning penekanan, perpindahan tile, pose, suara, dan pembatalan | Tidak ada gerakan melompat, input ganda, atau suara tertinggal pada prototipe |
| 4. Halaman awal | Katalog permainan dan kategori; hilangkan pemilih peran dari alur utama | Pengguna menemukan dan memulai latihan tanpa NIS/pilihan peran |
| 5. Materi dan admin | Model soal, migrasi tambahan, seed 48 item, form admin yang sesuai jenis | Materi buatan admin dapat dimainkan dan materi lama tetap tersedia |
| 6. Perluasan mini-game | Ta’birot, susun kalimat, lengkapi uslub, dan audio | Semua program memakai sistem feedback/gerak yang sama |
| 7. Pemeriksaan akhir | Responsif, aksesibilitas, performa, kegagalan, dan regresi | Rekaman, hasil uji, dan batas verifikasi dilaporkan |

Tahap 2–3 menjadi tolok ukur untuk tahap selanjutnya. Jika satu permainan belum terasa tepat, perbaiki ritmenya sebelum memperbanyak layar dan mode. Tinjauan prototipe dapat meminta penilaian rasa gerak pengguna; perubahan visual selanjutnya tetap mengikuti arah yang telah disepakati.

## 11. Kriteria penerimaan

Perilaku:

- Ulangi klik cepat pada pilihan, Lanjut, dan keluar: tidak ada skor ganda atau feedback dari soal sebelumnya.
- Tile masuk dan kembali dengan posisi yang benar, termasuk saat teks Arab panjang dan kartu harus berpindah baris.
- Tombol tetap dapat digunakan lewat keyboard; fokus berpindah secara terarah setelah pergantian soal.
- Audio yang ditolak browser, gagal dimuat, atau dimatikan mempunyai pemulihan yang jelas; latihan dengar memiliki alternatif teks/lewati tanpa penalti.
- Data kosong, validasi admin, dan putus koneksi tidak meninggalkan halaman tanpa tindakan pemulihan.
- Animasi selesai tidak menjadi syarat menyelesaikan transaksi atau mencatat progres.

Tampilan dan gerak:

- Periksa lebar 360, 390, 768, dan 1280 px serta teks diperbesar hingga 200%; tidak ada jawaban, harakat, maskot, atau tombol terpotong.
- Target sentuh utama sekurang-kurangnya 44 × 44 CSS px; status benar/salah terbaca tanpa mengandalkan warna.
- Target 60 fps pada HP kelas menengah yang dipakai untuk pengujian. Rekam Performance trace; cari frame yang terlambat dan long task, bukan hanya melihat skor audit.
- Animasi rutin memprioritaskan transform/opacity. Pengukuran layout untuk perpindahan kartu dibatasi pada awal/akhir; hindari baca-tulis layout bergantian setiap frame.
- Saat memilih atau memindahkan jawaban, target respons visual lokal di bawah 100 ms. Ini terpisah dari waktu penilaian melalui jaringan.
- Tidak ada perpindahan tata letak akibat gambar terlambat dimuat atau baris feedback yang muncul.
- Reduced motion mengurangi perpindahan, spring, dan partikel; informasi tetap hadir lewat teks, ikon, dan transisi ringan. Pengaturan berlaku juga untuk canvas/JavaScript.
- Animasi dekoratif berhenti saat halaman tidak terlihat; jumlah partikel, ukuran gambar, dan layer dijaga sesuai hasil profil.
- Jika HP fisik tidak tersedia, laporkan bahwa hasil baru diverifikasi lewat desktop/emulasi. Klaim kelancaran pada perangkat nyata tetap belum terverifikasi.

Pengujian kode mencakup lifecycle soal, pengiriman ganda, pembatalan, normalisasi jawaban Arab, validasi tipe materi, seed idempoten, dan migrasi data. Jalankan simulasi proyek yang ada sebagai uji regresi ketika perubahan menyentuh server/admin.

## 12. Catatan keputusan

| Keputusan | Alternatif yang dipertimbangkan | Alasan |
| --- | --- | --- |
| PNG lima pose lebih dulu | Model 3D sekarang | Aset sudah tersedia dan pengguna meminta GLB menyusul |
| CSS + Web Animations API | Migrasi framework atau menambah engine 3D | Cocok dengan proyek dan interaksi yang dibutuhkan saat ini |
| Satu prototipe dipoles lebih dulu | Mengerjakan semua mini-game sekaligus | Memastikan kualitas interaksi sebelum pola diperbanyak |
| Katalog permainan di halaman awal | Pemilih peran dan konfigurasi kelas | Mengikuti arah pengguna agar langsung dapat bermain |
| Bentuk soal mengikuti kemampuan yang dilatih | Semua materi dimasukkan ke format pasangan kata | Dialog dan uslub membutuhkan konteks serta struktur penilaian berbeda |
| Gerak pendek saat menjawab; perayaan saat selesai | Perayaan besar setiap jawaban | Menjaga ritme latihan dan bobot pencapaian |

Hal yang masih terbuka: rentang usia utama, perangkat HP untuk pengujian, dan kebutuhan login/progres lintas perangkat pada versi berikutnya. Rencana ini memakai asumsi di bagian 2 dan dapat disesuaikan sebelum implementasi.

## 13. Referensi kualitas

- [Duolingo: proses animasi milestone](https://blog.duolingo.com/streak-milestone-design-animation/) — iterasi ritme dan energi; menjadi dasar menguji prototipe sebelum memperluasnya.
- [Duolingo ABC: koordinasi audio dan animasi](https://blog.duolingo.com/a-good-read-building-duolingo-abc-for-android/) — memperlakukan urutan visual dan suara sebagai pekerjaan yang terkoordinasi.
- [Duolingo: gaya ilustrasi](https://blog.duolingo.com/shape-language-duolingos-art-style/) — kejelasan objek, konsistensi, dan keterbacaan pada layar kecil.
- [web.dev: animasi berperforma tinggi](https://web.dev/articles/animations-guide) — memilih properti, memeriksa repaint, dan memakai promosi layer secara terbatas.

Referensi tersebut menjelaskan prinsip. Durasi, susunan layar, jumlah konten, dan batas pengujian dalam dokumen ini adalah usulan khusus Mufrodatuna, bukan angka resmi Duolingo.
