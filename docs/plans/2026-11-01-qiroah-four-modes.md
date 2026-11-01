# Rencana Qiroah: empat mode, catatan dinamis, dan hubungan antarkata

Tanggal: 1 November 2026, Asia/Jakarta.
Status: rencana untuk ditinjau. Dokumen ini tidak mengizinkan perubahan kode atau penggunaan layanan berbayar.

## 1. Tujuan dan keputusan pengguna

Qiroah menjadi ruang membaca dan menganalisis kalimat Arab berdasarkan bab. Admin menyusun materi, menentukan bagian yang dianalisis, menulis catatan, dan menetapkan hubungan. Siswa memakai materi yang sama melalui empat mode yang berbeda.

Keputusan yang sudah diberikan pengguna:

- Fokus pada Qiroah; pekerjaan model 3D disisihkan.
- Empat mode: permainan Qiroah yang sudah ada, Bedah Kalimat, Detektif Analisis, dan Latihan Membaca.
- Catatan bebas ditambah, diubah, diurutkan, atau dihapus, masing-masing memiliki judul dan isi.
- Hubungan dapat mengaitkan kata, huruf, atau frasa, termasuk unsur taqdir yang tidak tertulis.
- Harakat dapat disembunyikan dan ditampilkan kembali. Catatan juga mempunyai kontrol tampilan.
- Dalam Bedah Kalimat, teks awal berwarna abu-abu; bagian aktif menjadi seperti kartu berwarna dan dianalisis mengikuti urutan admin.
- Latihan suara diharapkan menandai kemungkinan kesalahan tanpa menghentikan bacaan; koreksi lengkap diberikan setelah selesai.
- UI/UX ramah keluarga dan pelajar, menarik, mudah dipahami, dengan gerakan yang punya tujuan.

Asumsi kerja yang dapat dikoreksi saat meninjau:

- “Yang sudah ada di web” berarti mode Qiroah saat ini: memilih bagian teks lalu menjawab pertanyaan anotasi. Nama usulan: **Eksplorasi Kata**. Permainan mufrodat, ta’birot, dan uslub yang sudah ada tetap tersedia di luar lingkup perubahan ini.
- Pengguna telah mulai mengenal huruf Arab. Ukuran huruf dan bantuan tetap cocok untuk pemula; usia spesifik belum ditetapkan.
- Materi dan kunci jawaban ditentukan admin. Aplikasi tidak memutuskan sendiri analisis nahwu yang benar.
- Pengelompokan awal cukup Bab → Bacaan/kalimat; jenjang program tambahan mengikuti kebutuhan nyata berikutnya.
- Siswa tetap dapat berlatih tanpa login. Kemajuan disimpan di perangkat dengan keterangan yang jelas; sinkronisasi akun bukan bagian versi ini.
- Peluncuran pertama untuk uji internal. Jumlah siswa serentak dan anggaran suara belum ditentukan; tidak ada klaim kapasitas produksi sebelum pengukuran.

## 2. Temuan pada implementasi sekarang

Pemeriksaan berdasarkan kode proyek, bukan audit tampilan browser pada sesi perencanaan ini.

| Bagian | Kondisi sekarang | Tindakan yang direncanakan |
| --- | --- | --- |
| Penempatan | `qiroah-app.js` menyisipkan seluruh latihan ke `home-view` | Beranda hanya memuat pintu masuk; katalog bab dan arena dipisahkan |
| Pemilihan bacaan | Tombol “Muat teks” dan daftar judul datar | Muat otomatis, kelompokkan menurut bab, sediakan status kosong/gagal |
| Anotasi | Empat jenis tetap, satu nilai dan catatan | Catatan dinamis dengan identitas tetap dan konfigurasi latihan terpisah |
| Seleksi | Mendukung rentang UTF-16, beberapa kata, dan harakat | Pertahankan kemampuan; perbaiki seleksi sentuh dan pemetaan saat harakat disembunyikan |
| Penyuntingan | Perubahan teks memerlukan penghapusan seluruh anotasi | Revisi teks dengan pemeriksaan bagian terdampak, tanpa menghapus semuanya |
| Penyimpanan | Anotasi dihapus dan dibuat ulang pada setiap simpan | Identitas stabil agar hubungan, pertanyaan, dan kemajuan tidak kehilangan acuan |
| Jawaban | Pilihan dibentuk dari anotasi lain dan contoh bawaan | Admin memeriksa kunci, alternatif jawaban, dan pengecoh |
| Pembahasan | Catatan terutama muncul saat salah | Alasan tersedia untuk jawaban benar maupun salah |
| Gaya | Qiroah memiliki font dan warna emas tersendiri | Satukan dengan bahasa visual Mufrodatuna; Arab menggunakan font yang jelas harakatnya |
| Validasi | Ada tes data, akses admin, seleksi, dan alur browser | Perluas untuk relasi, revisi, tiga mode baru, dan kondisi audio |

## 3. Batas lingkup

Termasuk: navigasi Qiroah, bab dan urutan bacaan, editor catatan/relasi, empat mode, pembahasan, progres lokal, aksesibilitas, animasi, serta percobaan teknologi suara.

Tidak termasuk: permainan Pasang Harakat atau Jalin Hubungan sebagai mode tersendiri, liga, nyawa berbayar, timer wajib, avatar 3D, login siswa baru, penilaian esai nahwu otomatis, atau generasi materi oleh AI tanpa tinjauan admin.

Hubungan antarkata tetap menjadi fitur materi dan pembahasan pada empat mode terpilih. Itu tidak menambah jumlah mode.

Penilaian harakat melalui suara tetap merupakan sasaran. Rilis mode membaca mandiri tidak boleh dianggap menyelesaikan sasaran tersebut jika uji suara belum berhasil.

## 4. Alur dan susunan halaman

Alur utama:

**Beranda → Qiroah → pilih bab → pilih mode dan bacaan → latihan → pembahasan → ulangi bagian yang perlu dilatih.**

- Beranda: satu kartu Qiroah dengan deskripsi “Baca dan bedah kalimat Arab”, serta lanjutkan latihan bila memang ada sesi tersimpan.
- Halaman Qiroah: daftar bab yang jelas urutannya; progres nyata per bab; empat mode diperkenalkan dengan contoh interaksi kecil.
- Halaman bab: tujuan singkat, daftar bacaan, ketersediaan mode, tombol mulai. Bab terakhir dapat dipilih kembali secara otomatis.
- Arena: judul bab, progres sesi, bacaan utama, panel tugas, feedback, kontrol bantuan, dan tombol lanjut.
- Hasil: bagian selesai, bagian perlu diulang, bantuan yang digunakan, pembahasan. Progres penyelesaian dibedakan dari ketepatan jawaban.
- Admin Qiroah: ruang khusus materi dan penyuntingan, tidak menumpuk di bawah bank mufrodat.

Usulan alamat: `/qiroah.html` dan `/admin-qiroah.html`, dengan parameter bab/mode/bacaan yang dapat dibuka ulang. Ini mengikuti proyek Express dan HTML yang ada. Dukungan pemasangan di `/game/` wajib dipertahankan; tidak memerlukan migrasi framework.

Katalog dapat ditelusuri tanpa mikrofon. Hanya materi terbit dan mode dengan konfigurasi yang lengkap yang dapat dimainkan. Mode yang belum siap menjelaskan alasannya tanpa tombol palsu.

## 5. Kontrak desain UI/UX

### Hierarki dan identitas

Urutan perhatian di arena: **kalimat → tugas saat ini → jawaban/tindakan → feedback → maskot pendamping**.

- Putih hangat sebagai kanvas, teks arang, kuning maskot untuk tindakan utama dan bagian aktif. Warna keberhasilan dan koreksi memiliki makna yang konsisten.
- Nunito untuk antarmuka Indonesia dan Amiri untuk teks Arab sebagai titik awal, mengikuti proyek. Font Arab dinilai lewat keterbacaan harakat pada layar nyata.
- Teks Indonesia dasar sekitar 16 px; kalimat Arab sekitar 30–36 px di ponsel dan 36–44 px di desktop, dengan tinggi baris cukup untuk harakat dan sorotan. Ukuran fleksibel dan dapat diperbesar.
- Kartu hanya untuk pilihan bab/mode, tugas, dan kelompok catatan yang memang perlu dibedakan. Bacaan bukan kumpulan kotak terpisah untuk setiap huruf.
- Maskot PNG milik pengguna menjadi pendamping. Reaksi singkat dipakai saat ada hasil; tidak terus bergoyang ketika siswa membaca.
- Ilustrasi kartu mode memakai bahan produk: kata Arab terpilih, label analisis, pembetulan catatan, dan indikator mikrofon. Hindari ikon acak yang tidak menjelaskan permainan.

### Ramah keluarga dan pelajar

- Bahasa singkat, hangat, dan tidak menghakimi: “Perhatikan kedudukan kata ini”, “Coba lihat petunjuk”, “Bagian ini perlu dibaca ulang”.
- Tidak ada hukuman kehilangan kemajuan, hitung mundur wajib, bunyi alarm saat salah, atau perbandingan publik antarsiswa.
- Tampilkan bantuan sebagai bagian belajar. Catat penggunaan bantuan, tanpa mengurangi skor yang sudah diperoleh.
- Satu tindakan utama pada setiap langkah. Tidak memajukan soal sebelum siswa selesai membaca feedback.
- Gunakan contoh kelas dan kehidupan sehari-hari yang diperiksa admin; nama tingkat menjelaskan keterampilan yang dilatih.

### Tata letak responsif

- Desktop: bacaan dan tugas di kolom utama; ringkasan catatan terpilih di samping bila ruang cukup. Ukuran bacaan tetap menjadi prioritas.
- Ponsel: bacaan lalu panel tugas/catatan dalam satu kolom. Catatan ditempatkan di bawah kalimat, tidak menjadi tooltip kecil yang membutuhkan hover.
- Kontrol lanjut boleh melekat di bawah jika tidak menutupi isi, keyboard, atau area aman perangkat. Bacaan panjang tetap dapat digulir normal.
- Target sentuh minimal 44 × 44 px untuk kontrol utama. Pemilihan huruf memakai tampilan bantu yang diperbesar, tanpa membesarkan tiap huruf dalam kalimat asli.
- Teks Arab mengikuti RTL; navigasi dan penjelasan Indonesia tetap LTR. Angka progres dan nama hubungan tidak boleh terbalik.
- Pada pembesaran 200%, tidak ada teks terpotong atau kontrol utama hilang. Fokus keyboard dan pembaca layar tetap mempunyai urutan yang bermakna.

### Hal yang harus dihindari

Tidak memakai gradien neon, kaca buram, glow di setiap kartu, banyak badge tanpa fungsi, metrik dummy, atau animasi masuk seluruh halaman. Tidak mengurangi opacity seluruh bacaan agar bagian aktif menonjol. Abu-abu tetap harus terbaca; status juga memiliki ikon/label.

Ukuran keberhasilan visual: siswa langsung memahami apa yang harus dibaca, apa yang dipilih, pertanyaan yang sedang dijawab, dan tindakan berikutnya.

## 6. Materi: catatan dinamis dan hubungan

Struktur konseptual:

| Entitas | Isi utama |
| --- | --- |
| Bab | Judul, tujuan, urutan, status draf/terbit |
| Bacaan | Bab, judul, teks Arab sumber, urutan, versi, terjemahan opsional |
| Bagian terpilih | ID stabil, rentang dalam teks sumber, jenis sasaran, urutan analisis admin |
| Catatan | ID, sasaran, judul bebas, isi bebas, urutan, fungsi pembahasan/petunjuk |
| Unsur taqdir | ID, teks perkiraan, penjelasan, acuan letak logis pada bacaan |
| Hubungan | ID, asal, tujuan, nama bebas, peran tiap ujung, catatan hubungan |
| Pertanyaan | ID, mode, acuan catatan/hubungan, pertanyaan, kunci, alternatif, pengecoh, alasan |
| Sesi | Versi materi, posisi, jawaban, bantuan dipakai, status selesai/ditinjau |

Judul catatan tidak menjadi enum wajib. Templat seperti “Jenis kalimah”, “Shigot”, “Kedudukan”, “I‘rob”, “Tanda”, dan “Alasan” hanyalah pintasan. Penghapusan catatan yang dipakai pertanyaan harus menunjukkan dampaknya; pertanyaan terkait menjadi perlu diperiksa sebelum materi diterbitkan kembali.

Hubungan dapat menuju bagian tertulis atau unsur taqdir. Satu bagian dapat mempunyai beberapa hubungan. Arah relasi ditetapkan admin, tidak disimpulkan dari posisi kata atau arah baca. Versi pertama mendukung hubungan di dalam satu bacaan, termasuk antarfrasa atau antarkalimat dalam bacaan tersebut; tautan antarbacaan terpisah ditunda.

Unsur taqdir tampil sebagai kartu garis putus-putus berlabel “Taqdir”. Ia tidak disisipkan sebagai kata asli, tidak mengubah offset teks, dan tidak otomatis masuk teks yang wajib dibaca pada mode suara.

Saat satu kata dipilih, hanya relasi yang relevan ditampilkan. Pada layar sempit atau bacaan beberapa baris, gunakan label pasangan dan daftar hubungan jika garis justru mengganggu. Pembaca layar memperoleh keterangan seperti “Kata A berhubungan dengan kata B sebagai …”.

## 7. Editor admin

Alur: **pilih bab → tulis bacaan → pilih bagian → isi catatan → buat hubungan → siapkan pertanyaan → pratinjau → terbitkan**.

- Desktop: daftar bab/bacaan di kiri, bacaan dan seleksi di tengah, editor catatan atau hubungan di kanan.
- Ponsel: tahap yang sama dalam satu kolom/panel yang dapat ditutup, dengan pilihan aktif tetap terlihat.
- Ketuk kata untuk memilih; sediakan seleksi rentang beberapa kata dan pilihan huruf/harakat dengan pembesaran. Shortcut keyboard hanya pelengkap.
- Setiap pilihan menampilkan kutipan yang benar-benar terpilih. Angka offset internal tidak menjadi informasi utama bagi admin.
- Tambah catatan lewat “Tambah catatan”, isi judul dan isi, lalu urutkan dengan tombol naik/turun yang juga bekerja tanpa drag.
- Templat catatan per bab dapat disalin dan disesuaikan. Perubahan templat tidak diam-diam mengganti catatan pada materi terbit.
- Hubungkan dengan memilih asal, memilih tujuan atau membuat unsur taqdir, memberi nama/peran, lalu menulis penjelasan.
- Pilih catatan yang menjadi soal. Aplikasi boleh menyusun draf pertanyaan dari templat; admin memeriksa kunci dan pengecohnya.
- Detektif Analisis mempunyai editor pernyataan keliru dan pembetulannya sendiri. Tidak mengubah sumber analisis benar.
- Pratinjau sebagai siswa tersedia untuk empat mode, termasuk tampilan tanpa harakat dan bacaan panjang.
- Simpan draf dan terbitkan merupakan tindakan berbeda. Status tersimpan/gagal jelas; draf lokal terikat pada materi dan dihapus dari perangkat saat logout atau dibuang.

Saat isi teks diedit, simpan versi sumber. Cocokkan ulang hanya bagian yang dapat dipetakan dengan pasti; pengulangan kata dan perubahan harakat dapat menimbulkan ambiguitas. Tandai bagian/relasi/soal terdampak dan minta admin memperbaikinya. Jangan menghapus seluruh analisis atau menerka posisi secara diam-diam.

## 8. Empat mode

### A. Eksplorasi Kata — mempertahankan permainan sekarang

Tujuan: siswa bebas memilih bagian yang ingin dianalisis.

1. Pilih bacaan dari bab; bagian yang mempunyai latihan diberi penanda halus.
2. Ketuk kata, huruf, atau frasa; bila ada rentang bertumpuk, tampilkan pilihan sasaran yang jelas.
3. Tampilkan pertanyaan yang disiapkan untuk bagian itu, satu per satu.
4. Pilih jawaban, periksa, baca alasan, lalu lanjutkan atau pilih bagian lain.
5. Setelah selesai, catatan dan hubungan bagian tersebut dapat ditinjau kembali.

Mode ini mempertahankan kebebasan memilih pada versi lama. Daftar tidak perlu dimuat manual; selesai dan perlu diulang dapat dibedakan. Skor lama tidak dicampur dengan metrik baru tanpa aturan migrasi yang eksplisit.

### B. Bedah Kalimat — mode utama yang diusulkan pengguna

Tujuan: menyelesaikan analisis dengan urutan yang ditetapkan admin.

1. Bacaan tampil abu-abu gelap, utuh, dan tetap terbaca.
2. Sasaran pertama mendapat latar kuning lembut seperti kartu kecil, garis tepi, serta label aktif.
3. Panel di bawah bacaan menampilkan pertanyaan dari catatan sasaran aktif. Pertanyaan dapat tentang kata, huruf, frasa, hubungan, atau taqdir yang sudah disiapkan admin.
4. Jawaban diperiksa; alasan muncul untuk hasil benar maupun keliru. Tidak ada pindah otomatis.
5. Selesai satu sasaran, tampilkan centang dan ringkasan analisis. Tombol lanjut memindahkan fokus ke sasaran berikutnya.
6. Di akhir, siswa dapat membuka peta analisis dan mengulang bagian yang sulit.

Urutan bawaan mengikuti teks Arab, tetapi admin bebas mengubahnya. Tidak semua kata atau semua catatan harus ditanyakan. Sasaran yang hanya mempunyai pembahasan tidak dihitung sebagai soal.

Progres menampilkan dua tingkat yang jelas, misalnya “Bagian 2 dari 5” dan “Pertanyaan 1 dari 3”. Bagian selesai tetapi sempat salah tetap dihitung selesai, dengan penanda untuk latihan ulang.

Kartu aktif tidak mencabut kata dari kalimat atau mengubah lebar huruf. Gunakan latar/overlay di belakang bagian teks, dan panel pertanyaan yang terhubung secara visual. Bentuk huruf Arab dan posisi bacaan tetap stabil.

### C. Detektif Analisis

Tujuan: mengenali dan memperbaiki analisis yang kurang tepat.

1. Tampilkan kalimat dan beberapa pernyataan analisis dengan penanda “Tantangan: ada satu analisis yang perlu diperbaiki”.
2. Siswa memilih pernyataan yang keliru, lalu memilih pembetulan.
3. Setelah diperiksa, tunjukkan perbandingan awal dan pembetulan serta alasan admin.
4. Bila materi melibatkan hubungan, sorot dua sasaran yang relevan; untuk taqdir tampilkan unsur perkiraannya dengan label yang jelas.

Versi awal memakai tepat satu pernyataan keliru per ronde untuk menghindari instruksi yang ambigu. Admin menyiapkan pernyataan benar, salah, pembetulan, dan penjelasannya. Jangan membuat kekeliruan acak dari sembarang catatan atau memutuskan sendiri tafsir nahwu.

Pernyataan keliru hanya hidup dalam ronde tantangan dan selalu berlabel; halaman pembahasan menampilkan analisis yang telah dibetulkan. Sumber materi benar tidak ditimpa.

### D. Latihan Membaca

Tujuan: membaca bacaan dengan bantuan yang dapat diatur, kemudian meninjau pelafalan jika teknologi penilaian sudah teruji.

**Latihan mandiri yang dapat dibuat tanpa layanan suara:**

- Membaca dengan harakat lengkap, harakat akhir tersembunyi, atau seluruh harakat tersembunyi.
- Kontrol catatan dan hubungan terpisah. Teks sumber tetap utuh.
- Rekam dan putar ulang di perangkat sebagai pilihan, setelah izin mikrofon.
- Audio contoh dari admin dapat ditambahkan; bukan syarat untuk membaca mandiri dan tidak otomatis menjadi alat penilai.
- Tandai bagian yang ingin diulang. Penyelesaian mandiri tidak menghasilkan klaim ketepatan pelafalan.

**Target penilaian suara setelah percobaan berhasil:**

1. Periksa izin mikrofon dan kualitas input; siswa menekan mulai.
2. Sistem mengikuti perkiraan posisi bacaan; penanda posisi berbeda dari penanda benar/salah.
3. Dugaan kesalahan dengan keyakinan memadai diberi garis merah kecil, tanpa suara, dialog, atau kewajiban berhenti.
4. Audio tidak jelas menjadi “Perlu diperiksa”, tanpa penalti. Hasil sementara tidak diperlakukan sebagai keputusan akhir.
5. Siswa menekan selesai; sistem menuntaskan pemrosesan dan menyajikan pembahasan per bagian.
6. Pembahasan menghubungkan bacaan acuan, potongan rekaman bila tersedia, dan catatan admin. Nyatakan bunyi yang terdeteksi hanya jika sistem benar-benar menyediakannya dengan bukti yang memadai.
7. Siswa dapat mengulang bagian tertentu. Tangani kata terlewat, pengulangan, dan pembetulan diri.

Aturan waqaf/wasal dan alternatif bacaan ditentukan pada materi yang relevan. Unsur taqdir tidak dinilai sebagai kata yang harus diucapkan kecuali latihan secara eksplisit memintanya.

Kandidat percobaan: Azure Speech SDK dan Pronunciation Assessment untuk Arab. Dukungan bahasa dan skor pelafalan belum membuktikan ketepatan mendeteksi harakat i‘rob. Pengolahan berbayar dan pengiriman audio ke layanan luar baru dilakukan setelah penyedia, biaya, serta persetujuan penggunaan datanya jelas.

Uji awal: 20–30 kalimat pendek dengan bacaan benar dan pasangan yang sengaja berbeda harakat, ditinjau pengajar. Ukur kesalahan yang terlewat, bacaan benar yang ditandai salah, latensi, perilaku waqaf, kebisingan, dan variasi suara pelajar. Fokus semua harakat atau harakat akhir masih perlu dipilih; usulan percobaan pertama adalah harakat akhir. Jangan menerbitkan nilai ketepatan harakat sebelum hasilnya diterima pengajar.

Jika percobaan belum memadai, mode mandiri tetap dapat dirilis dengan label yang jujur; fitur koreksi otomatis tetap belum selesai dan disimpan sebagai pekerjaan tersendiri, tanpa menampilkan penilaian palsu.

## 9. Harakat, bantuan, dan integritas bahasa

- Menyembunyikan harakat hanya mengubah tampilan; tidak mengubah teks sumber, rentang analisis, kunci, atau teks acuan suara.
- Pemetaan dari tampilan ke teks sumber harus menangani harakat gabungan, kata berulang, beberapa baris, ligatur, dan seleksi yang bertumpuk.
- Jangan memakai penghapusan seluruh Unicode combining marks secara membabi buta; hamzah dan unsur ortografi yang bermakna harus tetap benar. Kasus khusus ditinjau dengan contoh nyata.
- “Harakat akhir” mengacu pada sasaran akhir kata yang divalidasi admin, dengan aturan shaddah/tanwin yang eksplisit; jangan sekadar menghapus karakter terakhir dari setiap token.
- Tiga bantuan tersedia: Harakat, Catatan, dan Hubungan. Kontrol menjelaskan keadaan saat ini.
- Pada permainan, membuka catatan atau hubungan yang membocorkan kunci menandai langkah tersebut “Dengan bantuan”. Siswa tetap dapat melanjutkan.
- Pengungkapan bantuan selama satu percobaan dicatat; menyembunyikannya kembali tidak menghapus status bantuan.

## 10. Animasi dan suara: spesifikasi yang dapat diperiksa

Angka berikut merupakan titik awal tuning, bukan klaim spesifikasi Duolingo.

| Pemicu | Gerakan | Durasi awal | Batas perilaku |
| --- | --- | --- | --- |
| Tekan tombol | Muka tombol turun sekitar 2 px | 100–140 ms | Respons langsung, tidak menunggu server |
| Pilih bagian | Latar/garis tepi menguat, penanda aktif masuk | 140–200 ms | Huruf dan baris tidak berubah posisi |
| Tugas berganti | Panel masuk 4–8 px dengan opacity | 180–240 ms | Fokus keyboard mengikuti tugas, tidak memindahkan scroll tanpa alasan |
| Hubungan dibuka | Garis terbentuk menuju pasangan, label menyusul | 180–260 ms | Hanya relasi yang sedang ditinjau |
| Jawaban diterima | Centang muncul, ringkasan terisi | 160–240 ms | Keadaan akhir terlihat meski animasi dibatalkan |
| Kata selesai | Sorotan selesai lalu pindah setelah Lanjut | 200–280 ms | Tidak memaksa jeda untuk membaca |
| Bacaan aktif | Penanda posisi bergeser saat hasil audio datang | 100–160 ms | Tidak mengejar setiap fragmen hasil yang belum stabil |
| Sesi selesai | Reaksi maskot dan perayaan kecil | 600–900 ms | Dapat ditinggalkan segera; tidak muncul setiap jawaban |

Gunakan CSS dan Web Animations API yang sudah tersedia. Utamakan transform/opacity; penggambaran garis SVG yang singkat harus diprofilkan. Tidak memerlukan Three.js atau library animasi baru.

Satu pusat perhatian pada satu waktu. Batalkan animasi dan audio lama ketika berpindah mode, keluar sesi, atau tab disembunyikan. Klik cepat tidak membuat antrean efek atau menggandakan jawaban. Hormati pengaturan reduced motion untuk CSS maupun JavaScript; hasil akhir tetap langsung terlihat.

Efek suara pendek untuk pilihan, keberhasilan, dan selesai. Koreksi memakai bunyi lembut atau cukup visual. Saat mikrofon aktif, hentikan efek dan pelafalan agar tidak ikut terekam. Putar audio hanya setelah tindakan pengguna; pengaturan mute disimpan.

## 11. Keadaan penting dan pemulihan

| Keadaan | Respons yang direncanakan |
| --- | --- |
| Memuat bab | Kerangka ringkas dan teks status; kontrol yang belum tersedia tidak tampak aktif |
| Bab/mode kosong | Penjelasan spesifik dan kembali ke pilihan yang tersedia |
| Koneksi terputus saat menjawab | Pertahankan pilihan; coba lagi tanpa menggandakan skor |
| Draf gagal disimpan | Draf tetap terlihat; status belum tersimpan jelas |
| Materi berubah ketika latihan berlangsung | Sesi memakai versi yang dimulai; sesi baru mengambil versi terbaru |
| Referensi catatan/relasi hilang | Tandai materi perlu diperiksa; jangan menerbitkan pertanyaan rusak |
| Sesi kedaluwarsa | Tombol mulai ulang yang bekerja, dengan informasi kemajuan yang masih tersedia |
| Izin mikrofon ditolak/perangkat tak tersedia | Penjelasan dan pilihan membaca mandiri |
| Tidak ada suara/hasil meragukan | Minta coba rekam ulang; tidak memberi nilai salah |
| Layanan suara terputus | Status penilaian belum selesai; tawarkan ulang atau lanjut mandiri |
| Keluar sesi | Simpan posisi bila memungkinkan; matikan mikrofon dan hentikan semua efek |

## 12. Data, keamanan, dan pemeliharaan

- Pertahankan Express, SQLite, modul JavaScript, dan kontrak Socket.IO yang sudah ada selama memadai. Hindari pergantian stack untuk perubahan tampilan.
- Pisahkan tanggung jawab: penyimpanan materi, pemetaan teks, aturan sesi, tampilan mode, dan adapter suara. Satu renderer bacaan dipakai semua mode.
- Operasi admin tetap memerlukan autentikasi di server; input judul/catatan diperlakukan sebagai teks aman, tidak sebagai HTML bebas.
- Kunci jawaban dan skor yang dipakai sebagai hasil penilaian diperiksa server. Jawaban berulang bersifat idempoten; jangan mengklaim keamanan ujian untuk progres lokal tanpa akun.
- Simpan versi pada materi dan sesi. Perubahan judul tidak mengganti ID catatan; perubahan teks tidak menggeser hubungan tanpa pemeriksaan.
- API key suara hanya di server. Browser memakai mekanisme otorisasi sesi yang sesuai penyedia; jangan menaruh kredensial tetap dalam JavaScript publik.
- Rekaman lokal dibuang setelah latihan secara default. Penyimpanan permanen atau pengiriman ke layanan cloud harus dijelaskan sebelum merekam; tidak otomatis dipakai untuk melatih model.
- Pembacaan tanpa mikrofon tetap tersedia. Keandalan pembelajaran dasar tidak bergantung pada layanan suara.
- Admin memiliki kendali materi dan penilaian. Templat dan contoh dapat diperbaiki tanpa mengubah kode.

## 13. Migrasi materi yang sudah ada

1. Catat skema dan buat cadangan database sebelum migrasi saat implementasi diizinkan.
2. Tambahkan struktur bab, bagian, catatan, relasi, dan pertanyaan secara aditif.
3. Tempatkan teks lama dalam bab “Materi sebelumnya” yang dapat diganti nama dan dipindahkan admin.
4. Kelompokkan rentang lama yang sama menjadi satu sasaran; pertahankan teks, harakat, nilai, dan catatan tanpa menulis ulang bahasa.
5. Ubah jenis anotasi lama menjadi judul catatan awal yang dapat diedit. Catatan lama tetap ikut terbawa sebagai penjelasan.
6. Buat draf pertanyaan dari anotasi lama untuk menjaga alur Eksplorasi Kata, tetapi tandai pengecoh serta kategori yang ambigu agar diperiksa sebelum pemakaian pada mode baru.
7. Jangan menebak apakah nilai lama di kolom I‘rob seharusnya dipindahkan ke Kedudukan; beri saran yang bisa dikonfirmasi admin.
8. Verifikasi jumlah teks, rentang, isi catatan, dan hasil migrasi. Migrasi ulang tidak menggandakan materi atau menimpa perubahan admin.
9. Pertahankan jalur pemulihan dan data asli sampai pemeriksaan selesai. Materi baru terpisah dari fixture pengujian.

## 14. Tahap implementasi setelah rencana disetujui

| Tahap | Hasil konkret | Syarat selesai |
| --- | --- | --- |
| 1. Fondasi | Bab, catatan dinamis, ID stabil, revisi, migrasi aman | Materi lama terbaca utuh; catatan bebas dapat disimpan dan diperiksa |
| 2. Editor dan hubungan | Seleksi teks, relasi tertulis/taqdir, templat, draf/terbit, pratinjau | Admin dapat menyelesaikan satu bacaan tanpa bantuan kode |
| 3. Satu alur utuh | Halaman Qiroah, bab, Eksplorasi Kata, dan satu bacaan Bedah Kalimat | Alur dari beranda sampai hasil rapi di ponsel dan desktop |
| 4. Detektif Analisis | Editor tantangan dan ronde identifikasi/pembetulan | Kunci tidak ambigu; sumber analisis benar tidak berubah |
| 5. Latihan Membaca | Kontrol bantuan, rekam/putar lokal, hasil mandiri | Bekerja tanpa layanan cloud dan tidak mengarang skor |
| 6. Penilaian suara | Adapter penyedia, pemetaan hasil, koreksi akhir | Melewati percobaan akurasi dan keputusan biaya; jika gagal, laporkan batasnya |
| 7. Pemolesan dan regresi | Motion, audio, aksesibilitas, pemulihan, pemeriksaan lintas mode | Semua kriteria penerimaan di bawah terpenuhi |

Percobaan suara dijalankan sejak fondasi materi memungkinkan, setelah persetujuan penggunaan layanan; tidak perlu menunggu semua layar selesai. Namun hasil percobaan tidak boleh dijadikan janji fitur sebelum lolos evaluasi.

Tidak menetapkan tenggat berbasis perkiraan tanpa mengetahui jumlah materi, keputusan suara, dan cakupan revisi. Setiap tahap menghasilkan alur yang dapat ditinjau.

## 15. Materi uji dan kriteria penerimaan

Siapkan fixture terpisah: bacaan pendek, bacaan beberapa baris, kata berulang, harakat bertumpuk, satu huruf/harakat terpilih, frasa bertumpuk, hubungan na‘at–man‘ut, hubungan ‘athaf/badal, unsur taqdir, catatan panjang, serta materi yang belum lengkap. Contoh nahwu ditinjau admin sebelum diterbitkan.

**Fungsi dan data:**

- Empat mode saja tampil dalam Qiroah; mode yang belum memenuhi syarat tidak berpura-pura siap.
- Admin dapat membuat judul catatan baru, mengurutkan/menghapusnya, dan memakai lebih dari empat catatan tanpa perubahan kode.
- Relasi ke kata, frasa, dan unsur taqdir dapat disimpan, diedit, dan ditinjau.
- Menyembunyikan/menampilkan harakat tidak mengubah sasaran catatan, kunci jawaban, atau teks sumber.
- Bedah Kalimat mengikuti urutan admin; bagian selesai bisa ditinjau kembali tanpa kehilangan posisi.
- Detektif memisahkan kesalahan yang disengaja dari materi acuan dan memberikan koreksi yang disiapkan admin.
- Pengiriman jawaban berulang tidak menambah skor dua kali; hasil lama tidak menimpa soal baru.
- Migrasi, revisi, koneksi putus, dan penghapusan tidak merusak referensi secara diam-diam.

**Tampilan dan interaksi:**

- Periksa hasil render pada lebar 360, 390, 768, dan 1280 px, pembesaran 200%, keyboard, dan reduced motion.
- Huruf Arab tetap tersambung, harakat tidak terpotong, dan aktifnya kartu tidak menggeser kata di sekitarnya.
- Semua soal dapat dimainkan tanpa hover dan tanpa drag wajib; catatan panjang tetap terbaca.
- Warna status disertai teks/ikon. Sasaran kontras teks normal 4.5:1, kontrol penting 3:1, diukur pada warna aktual.
- Loading, kosong, gagal, salah, benar, bantuan, dan selesai mempunyai tampilan yang sengaja dirancang.
- Rekam alur Bedah Kalimat dan Detektif untuk memeriksa awal gerakan, perpindahan fokus, dan keadaan akhirnya. Jangan menilai kehalusan hanya dari screenshot.
- Target animasi 60 fps pada perangkat uji yang disepakati. Laporkan hasil perangkat nyata dan emulasi secara terpisah; jangan mengklaim performa HP dari tes desktop.

**Suara:**

- Mikrofon berhenti ketika keluar; efek suara tidak ikut direkam; izin yang ditolak mempunyai jalan lanjut.
- Posisi bacaan, dugaan kesalahan, dan hasil akhir tidak disamakan.
- Hasil uji terhadap penilaian pengajar terdokumentasi; kasus waqaf dan suara tidak jelas tidak dihukum otomatis.
- Mode mandiri tidak memberikan nilai ketepatan pelafalan. Mode otomatis yang belum teruji diberi status yang sesuai.

Jalankan tes unit/integrasi yang relevan, tes browser Qiroah, dan regresi pada permainan lama. Gunakan database sementara agar pemeriksaan tidak menyentuh materi admin.

## 16. Catatan keputusan dan hal yang belum dikunci

| Keputusan | Dasar/alternatif | Status |
| --- | --- | --- |
| Empat mode Qiroah | Pengguna memilih fokus, tidak menambah semua ide permainan | Ditetapkan pengguna |
| Catatan dinamis | Empat kategori tetap membatasi materi | Ditetapkan pengguna |
| Relasi dan taqdir | Analisis perlu menjelaskan keterikatan, termasuk unsur tak tertulis | Ditetapkan pengguna |
| Kartu aktif berurutan | Memberi arah dan progres pada analisis setiap sasaran | Ditetapkan pengguna |
| PNG sebagai pendamping | Pengguna menunda model 3D | Mengikuti arah pengguna |
| Eksplorasi Kata sebagai nama mode lama | Menjelaskan kebebasan memilih bagian teks | Usulan nama |
| Draf soal terpisah dari catatan | Catatan bebas belum tentu merupakan kunci yang dapat dinilai | Usulan desain |
| Satu kekeliruan per ronde detektif | Lebih mudah dipahami daripada jumlah salah yang tidak jelas | Usulan versi pertama |
| Azure sebagai kandidat suara | Memiliki penilaian Arab dan streaming; harakat tetap perlu validasi | Kandidat, belum dipilih permanen |
| Progres lokal tanpa login | Mengikuti alur pelajar yang sudah ada | Asumsi versi pertama |

Hal yang perlu diputuskan sebelum tahap terkait: sasaran awal penilaian suara (harakat akhir atau seluruh harakat), aturan bacaan dan waqaf, penyedia/biaya audio, kelompok usia uji, perangkat utama, jumlah pengguna bersamaan, serta daftar bab pertama. Hal tersebut tidak menghalangi peninjauan desain atau perencanaan fondasi.

## 17. Referensi teknis suara

Dokumentasi yang ditinjau dalam percakapan pada 1 November 2026:

- [Dukungan bahasa dan pronunciation assessment Azure](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment).
- [Teks acuan, streaming, dan batas dukungan fonem](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment). Skor fonem tidak otomatis memberi identitas bunyi Arab yang benar-benar diucapkan.
- [Izin dan akses mikrofon browser](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- [Batas ketersediaan SpeechRecognition browser](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

Referensi merupakan dasar memilih percobaan, bukan bukti akurasi pada siswa atau materi Qiroah ini.
