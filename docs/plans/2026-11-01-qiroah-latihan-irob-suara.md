# Rencana Latihan Membaca Qiroah — deteksi harakat akhir i‘rab

Tanggal: 1 November 2026, Asia/Jakarta.
Status 2 November 2026: prototipe diimplementasikan pada editor admin, sesi server, layanan fonem Python, dan halaman membaca. Versi ini meminta satu kata sasaran per giliran dengan jeda singkat; belum mendukung bacaan kalimat terus-menerus. Tersedia 10 bacaan contoh. Benchmark suara siswa, kalibrasi akurasi, serta pengujian perangkat fisik Android/iOS belum dilakukan. Kriteria penerimaan di dokumen ini tetap merupakan target, bukan klaim hasil.

## 1. Tujuan dan keputusan pengguna

1. Fitur berada di **Qiroah → Latihan Membaca**, memakai bacaan per bab yang disiapkan admin.
2. Teks awal tampil hitam tanpa harakat latihan. Versi pertama menilai **harakat akhir kata sasaran** untuk latihan i‘rab.
3. Harakat akhir muncul mengikuti bunyi yang terdeteksi. Benar tetap hitam; harakat yang keliru ditampilkan merah sesuai bacaan siswa.
4. Kesalahan harakat yang terdengar jelas tidak menghentikan bacaan. Pembahasan lengkap muncul setelah sesi selesai.
5. Jika siswa mewaqafkan kata sehingga harakat akhir yang diwajibkan tidak terucap, progres tertahan pada kata tersebut sampai siswa membacanya ulang dengan akhir yang terdengar.
6. Hasil suara yang belum jelas tidak otomatis menjadi kesalahan. Siswa dapat mengulang, menjeda, atau keluar tanpa dipaksa menyelesaikan sesi.
7. Gunakan gaya Mufrodatuna yang sudah ada: teks Arab jelas, maskot PNG, gerakan singkat, dan antarmuka ramah pelajar.

Interpretasi aturan waqaf: yang menghalangi progres adalah **akhir kata target yang tidak diucapkan**, bukan setiap keheningan. Jeda setelah akhir kata sudah diucapkan tetap diperbolehkan. Ini aturan latihan i‘rab dalam aplikasi, bukan penilaian waqaf untuk semua konteks bacaan.

Versi awal hanya menampilkan hasil deteksi harakat akhir. Harakat tengah kata tidak diklaim telah dikenali. Ketika bantuan harakat lengkap dibuka, tampilannya berlabel acuan admin dan dibedakan dari hasil yang didengar.

## 2. Cakupan awal dan asumsi

Materi awal: **10–20 kalimat pendek**, sekitar 3–8 kata per kalimat, dengan 1–3 sasaran yang ditetapkan admin. Mulai dari dhammah, fathah, dan kasrah. Tanwin masuk setelah lulus pengujian tersendiri. Pengajar memeriksa teks, sasaran, dan kuncinya; catatan admin tetap menjadi bahan pembahasan.

Pilih akhir kata yang terbaca jelas dan berada di ujung kata tertulis. I‘rab dengan huruf, akhir muqaddar, kata bersufiks dhamir, perubahan bunyi ta marbuthah saat waqaf, serta kasus yang memerlukan aturan lanjutan ditunda. Sukun yang memang jawaban benar tidak boleh dianggap waqaf keliru; materi semacam itu belum diaktifkan pada tahap pertama.

| Kebutuhan | Asumsi/rancangan awal, belum merupakan hasil pengukuran |
| --- | --- |
| Performa | Sasaran p95 umpan balik stabil ≤2 detik setelah akhir kata selesai terdengar, pada perangkat dan server uji yang dicatat |
| Skala | Pilot 1 pembaca aktif, kemudian uji 5 sesi serentak; kapasitas publik ditentukan setelah pengukuran |
| Keandalan | Gangguan koneksi/model menjeda penilaian dengan status jelas; tidak menghasilkan jawaban tiruan |
| Perangkat | Mikrofon browser melalui HTTPS; localhost untuk pengembangan. Uji Chrome Android, Safari iOS, serta Chrome/Edge desktop pada perangkat yang tersedia |
| Privasi | Audio operasional diproses sementara; tidak disimpan ke database, log, atau analytics secara bawaan |
| Pemeliharaan | Admin mengelola materi dan kunci. Pengelola teknis mengelola model, ambang deteksi, versi, dan kapasitas layanan |
| Biaya | Benchmark lokal dahulu. Kebutuhan GPU dan hosting ditentukan dari hasilnya; tahap perencanaan tidak memesan layanan |

Jumlah pengguna publik, anggaran server, dan perangkat GPU belum ditetapkan. Itu tidak menghalangi persiapan prototipe lokal, tetapi harus diselesaikan sebelum peluncuran publik.

Fase ini tidak mencakup seluruh harakat dalam kalimat, tajwid/makhraj menyeluruh, login siswa baru, liga/XP baru, atau deteksi suara pada game Analisa Al-Qur’an. Materi bacaan manual Qiroah menjadi cakupan pertama.

## 3. Temuan proyek dan titik integrasi

| Area saat ini | Temuan | Rencana perubahan |
| --- | --- | --- |
| `public/qiroah-hub.js` | Mode membaca menggunakan `getUserMedia`, `MediaRecorder`, pemutaran lokal, dan sakelar harakat | Pisahkan pengelolaan latihan suara dari hub; hub tetap menangani pemilihan bacaan |
| `public/qiroah.css` | Harakat dapat disembunyikan melalui CSS | Tambahkan hasil akhir kata, status mendengar/memproses/mengulang, dan koreksi |
| `public/qiroah-admin.js` | Anotasi, catatan bebas, dan hubungan sudah tersedia | Tambahkan konfigurasi sasaran membaca dan acuan bunyi yang terstruktur |
| `public/qiroah-core.mjs` | Posisi memakai UTF-16 teks asli | Pertahankan pemetaan ke sumber, jangan memakai indeks teks tanpa harakat |
| `lib/qiroah.js`, `lib/db.js` | Validasi, ID anotasi stabil, transaksi, dan versi teks | Tambahkan konfigurasi membaca serta revisinya tanpa mengganti anotasi lama |
| `server.js` | Express dan Socket.IO sudah dipakai | Tambahkan pengendali sesi membaca dan hubungan ke layanan suara Python |
| `public/learn-shared.js` | Maskot, suara, dan reduced motion tersedia | Gunakan kembali; hentikan efek suara/TTS selama mikrofon melakukan penilaian |

`qiroah_texts.versi` saat ini naik ketika teks berubah. Konfigurasi suara memerlukan revisi tersendiri agar perubahan kunci tanpa perubahan teks tetap tercatat.

Berkas baru yang direncanakan:

- `public/qiroah-reading.js`: keadaan sesi, kontrol, rendering hasil, bantuan, dan rangkuman.
- `public/qiroah-audio-worklet.js`: pengambilan audio tanpa mengganggu render UI.
- `lib/qiroah-reading.js`: validasi event, urutan sasaran, snapshot, dan hasil sesi yang ditetapkan server.
- `services/qiroah-speech/`: FastAPI, model, pengolahan audio, VAD, dan penilaian akhir kata.
- `test/qiroah-reading.test.js` serta pengujian Python: aturan sesi, data, API, dan evaluasi suara.
- `docs/evaluations/qiroah-irob/`: spesifikasi benchmark dan laporan agregat; rekaman siswa tidak dimasukkan ke repositori publik.

Nama berkas dapat dirapikan saat implementasi tanpa mengubah pembagian tanggung jawab ini.

## 4. Teknologi yang dipilih untuk prototipe

| Pendekatan | Kelebihan | Keputusan dan keterbatasan |
| --- | --- | --- |
| **Model fonem Arab + penilaian akhir kata khusus** | Membandingkan kandidat bunyi aktual dengan acuan; versi dan ambang dapat dikendalikan | Pilihan utama untuk prototipe; perlu benchmark dan mungkin penyesuaian model |
| API penilaian pengucapan siap pakai | Integrasi dan operasi awal lebih sederhana | Kandidat pembanding jika terbukti dapat mengidentifikasi vokal salah yang dibutuhkan; dukungan bahasa Arab saja belum cukup |
| Transkripsi umum + harakat dari teks | Mudah menghasilkan teks berharakat | Tidak digunakan untuk menilai bunyi: hasil harakat berdasarkan tata bahasa bisa berbeda dari ucapan siswa |

Alur teknis:

**Mikrofon → AudioWorklet → Socket.IO → backend Node → layanan Python → hasil bunyi dan penilaian → tampilan game.**

- **Web Audio API + AudioWorklet:** menangkap audio secara bertahap.
- **Socket.IO:** menghubungkan browser dengan server proyek yang sudah ada.
- **Python + FastAPI:** layanan suara terpisah; komunikasi internal melalui WebSocket atau antarmuka internal setara. WebSocket biasa tidak dianggap kompatibel langsung dengan protokol Socket.IO browser.
- **Silero VAD:** mendeteksi aktivitas suara dan jeda. VAD tidak menetapkan harakat atau menyimpulkan waqaf sendiri.
- **PyTorch + Transformers:** menjalankan kandidat Wav2Vec2/XLS-R yang dilatih untuk fonem Arab.
- **Mesin penilaian khusus:** melacak kata sasaran, membandingkan akhir yang terdengar dengan kunci, dan memutuskan benar/salah/akhir hilang/tidak pasti.

Model akhir belum ditetapkan. Kandidat komunitas merupakan titik awal penelitian, bukan jaminan akurasi pada suara pelajar Indonesia. Catat revisi model, checksum, lisensi, data pelatihan, dan dependensi yang benar-benar digunakan. Hasil model card tidak boleh disebut sebagai akurasi aplikasi kita.

## 5. Cara memeriksa bunyi akhir

1. Ambil audio mono, lalu resample secara benar ke 16 kHz jika dibutuhkan model. Audio perangkat 44,1/48 kHz tidak boleh sekadar diberi label 16 kHz.
2. Pertahankan konteks pendek sebelum dan sesudah target. Gunakan potongan bertumpang tindih agar batas paket tidak memotong vokal akhir.
3. Gunakan teks yang diketahui untuk melacak posisi bacaan. Tangani kata berulang, kata terlewat, dan pengulangan tanpa memindahkan hasil ke kata yang salah.
4. Estimasikan kandidat akhir `a`, `i`, `u`; kemudian `an`, `in`, `un` setelah tanwin didukung. Sertakan akhir yang hilang dan hasil tidak pasti sebagai keadaan berbeda.
5. Bandingkan bukti akustik antar-kandidat. Penyelarasan ke jawaban benar saja tidak membuktikan bahwa bunyi itu diucapkan; mesin tidak boleh memaksa hasil mengikuti kunci.
6. Setelah hasil stabil, bandingkan kandidat terdengar dengan acuan admin. Ambang dikalibrasi memakai rekaman nyata; probabilitas mentah model bukan otomatis persentase keyakinan yang valid.
7. Bila bukti belum cukup, gunakan hasil tidak pasti. Keheningan atau kata yang tidak muncul pada transkripsi saja belum membuktikan waqaf.

Model kandidat tidak diasumsikan mendukung streaming kata demi kata secara bawaan. Prototipe memakai buffer konteks dan penguncian hasil setelah informasi cukup. Waktu menunggu konteks masuk dalam pengukuran latensi.

## 6. Aturan permainan dan keadaan sesi

| Kondisi | Tampilan | Progres |
| --- | --- | --- |
| Akhir sesuai acuan dan yakin | Harakat akhir hitam | Lanjut |
| Akhir berbeda dan yakin | Harakat yang terdengar merah, penanda “Perlu ditinjau” | Lanjut; koreksi di akhir |
| Akhir wajib tidak terdengar dengan bukti cukup | Kata tetap aktif; “Baca kembali dengan harakat akhirnya” | Tertahan, minta ulang |
| Audio/model belum yakin | Penanda netral; “Belum terdengar jelas, coba ulangi” | Belum dinilai |
| Sasaran terlewat atau kata lain dibaca | Minta kembali ke kata sasaran | Tertahan untuk menjaga posisi |
| Diam setelah akhir sudah lengkap | Tetap mendengar bagian berikutnya | Tidak dihukum sebagai waqaf |
| Mikrofon/koneksi/model gagal | Status gangguan dan pilihan coba lagi/latihan mandiri | Penilaian dijeda |

Jika siswa mengulang kata yang tadinya tanpa akhir, lalu mengucapkan akhir yang jelas tetapi salah, tampilkan merah dan boleh lanjut. Kelengkapan bunyi akhir dan ketepatan i‘rab adalah dua pemeriksaan berbeda.

Selama target tertahan, bacaan kata berikutnya tidak boleh melompati progres. Pengulangan membuat ID percobaan baru sehingga hasil terlambat dari percobaan lama tidak diterapkan.

Keadaan sesi: siap → meminta mikrofon → mendengar → memproses → diterima/keliru/perlu ulang → sasaran berikutnya → selesai. Jeda, keluar, dan gangguan dapat terjadi dari keadaan aktif mana pun.

- Hasil sementara belum menampilkan merah dan belum memberi nilai.
- Hasil final satu percobaan hanya diterapkan sekali.
- “Selesai” tidak menandai sasaran yang belum terucap sebagai tuntas. Keluar selalu tersedia; sesi demikian berstatus belum selesai.
- Ulang latihan tidak menghapus hasil sebelumnya; rangkuman membedakan bacaan awal dan perbaikan.
- Hasil belum jelas tidak dihitung sebagai kesalahan siswa. Rangkuman memisahkan tepat, perlu ditinjau, belum dapat dinilai, dan penggunaan bantuan.
- Penilaian ini merupakan latihan. Catatan yang dapat dibuka siswa tidak membuatnya menjadi sistem ujian tertutup.

## 7. Kontrak UI/UX dan animasi

Alur siswa: **Qiroah → Latihan Membaca → pilih bacaan → cek mikrofon → baca tanpa harakat → tinjau hasil**.

Kalimat menjadi fokus utama. Kata sasaran mendapat sorotan lembut; kontrol mikrofon, status singkat, progres, dan maskot berada di luar teks. Kalimat tidak dipecah menjadi kartu per huruf.

- Awal: tulisan hitam tanpa harakat latihan, catatan/bantuan tertutup, petunjuk “Bunyikan akhir kata yang ditandai”.
- Hanya harakat akhir target yang muncul sebagai hasil deteksi. Kata non-target tidak dianggap sudah diperiksa karena dilewati.
- Harakat merah disertai label/penanda yang bisa dibaca pembaca layar. Hindari alarm dan animasi mengguncang kalimat.
- Meminta ulang tidak membocorkan harakat acuan. Statusnya netral jika audio ragu atau akhir belum terdengar.
- Bantuan lengkap tetap tersedia. Membukanya menjeda penilaian dan memberi label “Dengan bantuan”; acuan tidak boleh menyamar sebagai hasil pengenalan suara.
- Rangkuman menampilkan “Bacaanmu”, “Acuan”, serta catatan i‘rab untuk target yang perlu ditinjau, dengan pilihan mengulang target atau kalimat.
- Pemutaran contoh/rekaman menjeda mikrofon penilaian agar audio aplikasi tidak dinilai sebagai suara siswa.

Gerakan awal yang diusulkan: perpindahan sorotan 150–200 ms dan kemunculan hasil 120–180 ms, memakai opacity/transform pada lapisan yang tidak menggeser teks. Nilai ini disempurnakan setelah inspeksi tampilan, dengan helper reduced motion yang sudah ada.

Maskot tenang saat mendengar, berpikir saat meminta ulang, dan merayakan singkat saat kalimat selesai. Tidak ada efek suara selama mikrofon menilai bacaan.

Kriteria visual: RTL benar; sambungan huruf utuh; harakat tidak menabrak baris; pembesaran 200% dapat dipakai; target sentuh ≥44 px; kontrol tidak menutupi teks di ponsel. Uji pewarnaan combining mark pada font Amiri di browser nyata; jangan memakai inline-block per huruf yang merusak pembentukan tulisan.

## 8. Admin, data, dan perubahan materi

Tambahkan bagian **Target Latihan Membaca** pada editor Qiroah yang sama. Admin memilih kata, memilih posisi akhir yang dinilai, menentukan acuan bunyi, dan menghubungkan catatan yang sudah tersedia. UI memakai contoh kata/harakat, bukan kode fonem atau angka offset.

Konfigurasi terstruktur diperlukan karena catatan bebas tidak aman dijadikan kunci suara secara otomatis. Akhir dari teks berharakat boleh menjadi saran, lalu diperiksa admin sebelum target aktif. Varian hanya diterima bila memang disetujui pengajar.

| Data tambahan | Isi utama |
| --- | --- |
| Konfigurasi membaca per teks | ID teks, revisi konfigurasi, versi sumber, status draf/aktif/perlu diperiksa, cakupan bunyi |
| Target membaca | ID stabil, rentang kata UTF-16, anchor huruf/cluster akhir, kutipan sumber, urutan, acuan, varian, referensi catatan opsional |
| Snapshot sesi | Teks, target, kunci, catatan, versi materi, revisi konfigurasi, versi model, ambang penilaian |
| Hasil percobaan | Target, ID percobaan, status, bunyi terdeteksi/tidak pasti, waktu, bantuan; tanpa audio mentah secara bawaan |

Gunakan tabel tambahan berprefiks `qiroah_reading_` dan migrasi idempoten. Konfigurasi tersimpan di SQLite; sesi aktif serta audio sementara berada dalam penyimpanan sementara yang berbatas. Penyimpanan hasil jangka panjang tidak menjadi ketergantungan fase awal.

Koreksi admin berlaku pada sesi baru; sesi aktif memakai snapshot. Konfigurasi memiliki revisi sendiri, termasuk ketika kunci berubah tanpa perubahan teks. Simpan dengan pemeriksaan revisi agar penyuntingan tidak saling menimpa.

Perubahan teks, penghapusan target, atau anchor ambigu menandai konfigurasi perlu diperiksa. Jangan menebak posisi kata berulang. Teks asli tidak dinormalisasi; pencocokan memakai salinan. Saat menyembunyikan harakat latihan, pertahankan huruf, hamzah, alif, dan offset sumber—jangan menghapus semua combining mark tanpa memilah fungsinya.

## 9. Koneksi, keamanan sesi, dan kegagalan

Usulan event: `reading:start`, `reading:audio`, `reading:pause`, `reading:resume`, `reading:finish`, `reading:cancel`; keluaran `reading:status`, `reading:result`, `reading:error`. Nama final mengikuti konvensi proyek.

- Server memuat acuan admin. Klien tidak mengirim klaim benar/salah atau mengganti kunci.
- Paket membawa ID sesi, ID/generasi percobaan, nomor urut, format/rate audio, dan durasi. Hasil menyebut target/percobaan serta status sementara/final.
- Sesi terikat pada koneksi/token server. Audio tidak disiarkan ke room game lain.
- Validasi ukuran, durasi, format, dan urutan. Batasi antrean dan sesi serentak; penolakan kapasitas dijelaskan sebelum menerima rekaman panjang.
- Buffer bergulir awal maksimal sekitar 10–15 detik per sesi, disesuaikan benchmark. Jika layanan tertinggal, minta jeda/ulang target; jangan membuang audio diam-diam lalu memberi nilai.
- Inferensi berjalan pada worker layanan Python, sehingga tidak memblokir server Node untuk game lain.
- Setelah putus koneksi, pertahankan hasil final yang sudah diakui server dan ulang target belum final dengan ID percobaan baru. Hasil usang diabaikan.
- Lepaskan mikrofon, AudioContext, worker, dan buffer saat keluar atau sesi kedaluwarsa. Usulan awal kedaluwarsa: 5 menit tanpa aktivitas.
- Layanan Python menerima permintaan internal yang diautentikasi; kredensial tidak masuk browser.
- Log hanya informasi operasional. Rekaman benchmark memerlukan pengambilan tersendiri dengan izin peserta, kontrol akses, dan jadwal penghapusan; tidak mengambil audio sesi siswa secara otomatis.

Sediakan feature flag dan pemeriksaan kesiapan model. Jika model tidak tersedia, latihan mandiri lama tetap dapat dipakai dengan label penilaian otomatis tidak tersedia. Fallback tersebut tidak dianggap menyelesaikan kebutuhan deteksi suara.

## 10. Tahapan pengerjaan

### Tahap 1 — materi acuan dan benchmark

- Siapkan 10–20 kalimat serta target dan kunci yang diperiksa pengajar.
- Siapkan contoh benar, penggantian harakat, akhir hilang, jeda setelah akhir lengkap, pengulangan, dan suara kurang jelas.
- Sasaran awal pengumpulan: sedikitnya 10 pembaca dan 600 kejadian akhir kata, dengan pembagian kelas memadai. Pisahkan pembaca untuk pengembangan/kalibrasi dan uji akhir.
- Contoh sintetis boleh membantu pengembangan; penerimaan akhir menggunakan suara manusia yang mewakili pengguna dan perangkat sasaran. Uji orang dewasa saja tidak membuktikan ketepatan pada anak/pelajar.
- Catat acuan pengajar dan cara menyelesaikan perbedaan penilaian.

Keluaran: materi pilot, protokol rekaman, label, serta pemisahan set uji. Ketersediaan rekaman dan pengajar menjadi ketergantungan nyata; tanpa itu kualitas deteksi belum dapat dinyatakan terbukti.

### Tahap 2 — pembuktian mesin suara

- Bandingkan kandidat model, pelacakan target, dan penilaian kandidat akhir kata.
- Ukur kebingungan antar-vokal, akhir hilang, hasil tidak pasti, latensi, dan sumber daya.
- Tetapkan ambang pada set kalibrasi, bukan dengan menyetel berulang kali pada set uji akhir.
- Jika belum cukup, sesuaikan model atau perkecil cakupan materi. Jangan mengisi hasil deteksi dengan harakat dari kunci.

Sasaran pilot berikut adalah **target penerimaan, bukan hasil yang sudah diperoleh**:

| Ukuran | Sasaran awal |
| --- | --- |
| Bacaan benar yang keliru ditandai merah | ≤5% dari semua contoh benar |
| Deteksi penggantian akhir yang salah | ≥90% dari semua contoh salah; hasil tidak pasti dihitung belum berhasil dideteksi |
| Deteksi akhir wajib yang hilang | ≥90% dari contoh akhir hilang |
| Jeda setelah akhir lengkap yang keliru memblokir | ≤5% dari contoh jeda yang sah dalam latihan |
| Hasil tidak pasti pada audio jelas | ≤20% dari contoh audio jelas |
| Latensi p95 | ≤2 detik setelah akhir target tersedia pada hardware/load yang dicatat |

Laporkan jumlah contoh, confusion matrix, hasil per kelas/perangkat/kelompok pembaca, dan interval ketidakpastian. Rata-rata tidak boleh menyembunyikan harakat tertentu yang sering gagal. Pilot kecil belum membuktikan kapasitas dan akurasi produksi.

### Tahap 3 — konfigurasi admin dan sesi server

- Tambahkan migrasi, validator target, editor, revisi, serta snapshot sesi.
- Implementasikan aturan benar/salah/akhir hilang/tidak pasti dan penghentian sesi.
- Tambahkan kontrak audio, pembatasan antrean, pengikatan sesi, dan pemulihan koneksi.
- Uji logika menggunakan keluaran model terkontrol khusus pengujian, terpisah dari deteksi asli.

### Tahap 4 — antarmuka membaca

- Pisahkan modul membaca dari hub dan tambahkan cek mikrofon/status layanan.
- Terapkan bacaan tanpa harakat, target aktif, hasil akhir kata, bantuan, meminta ulang, dan rangkuman.
- Gunakan gaya/maskot yang ada; periksa render Arab, ponsel/desktop, keyboard, pembesaran, dan reduced motion.

### Tahap 5 — integrasi dan regresi

- Hubungkan AudioWorklet → Socket.IO → layanan model → hasil game.
- Uji mikrofon langsung dari browser selain file benchmark.
- Periksa kata berulang/terlewat, bicara terlalu cepat, suara aplikasi sendiri, audio terpotong, paket ganda/usang, putus koneksi, dan model mati.
- Jalankan tes proyek serta pengujian baru. Pastikan mode Qiroah lain dan Analisa Al-Qur’an tetap berfungsi.

### Tahap 6 — pilot dan kesiapan rilis

- Uji 1 pembaca lalu 5 sesi serentak; hasil antarsiswa tidak boleh tercampur dan antrean harus stabil.
- Tinjau kesalahan bersama pengajar, terutama siswa yang tertahan padahal akhir katanya benar.
- Aktifkan hanya jenis harakat/materi yang lolos. Tanwin mendapat evaluasi tersendiri sebelum diaktifkan.
- Tentukan kebutuhan server dan biaya dari pengukuran. Dokumentasikan menjalankan dua layanan, pembaruan model, dan rollback feature flag.

## 11. Kriteria selesai

- Mikrofon menghasilkan penilaian dari audio nyata, bukan timer, data contoh, atau pencocokan teks saja.
- Harakat akhir benar hitam; akhir salah yang terdeteksi merah sesuai bunyi; koreksi setelah sesi.
- Akhir wajib yang hilang menahan progres, sementara jeda setelah akhir lengkap tidak memblokir.
- Audio tidak pasti tidak dihukum dan tidak digunakan untuk melewati target begitu saja.
- Rendering hasil tidak merusak tulisan Arab; bantuan selalu dibedakan dari hasil deteksi.
- Koreksi admin, versi materi, dan pengulangan tetap konsisten.
- Benchmark, integrasi perangkat, aksesibilitas, dan regresi memenuhi pemeriksaan yang disepakati. Batas yang belum terpenuhi dilaporkan, bukan ditutupi dengan simulasi UI.

## 12. Catatan keputusan dan sumber

| Keputusan | Alternatif | Alasan |
| --- | --- | --- |
| Fokus harakat akhir | Seluruh harakat sekaligus | Keputusan pengguna dan lingkup pembuktian lebih terukur |
| Salah boleh lanjut; akhir hilang tertahan | Semua kesalahan memblokir | Menggabungkan alur awal pengguna dengan aturan waqaf terbaru |
| Kategori tidak pasti | Memaksa seluruh hasil benar/salah | Mencegah hukuman akibat mikrofon atau keraguan model |
| Benchmark suara lebih dulu | Menganggap deteksi siap setelah UI selesai | Risiko utama adalah pengenalan vokal akhir |
| Model fonem sebagai kandidat | Transkripsi umum lalu harakat dari teks | Memerlukan bukti ucapan aktual |
| Layanan Python terpisah | Inferensi berat di proses Node | Ekosistem model dan isolasi beban dari game lain |
| Kunci suara terstruktur | Menebak acuan dari catatan bebas | Penilaian eksplisit tanpa membatasi catatan dinamis |
| Snapshot dan revisi konfigurasi | Mengubah kunci sesi yang sedang berjalan | Konsistensi saat admin mengoreksi |

Sumber yang telah diperiksa pada percakapan perencanaan:

- [MDN — AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet): pemrosesan audio pada thread terpisah dan kebutuhan secure context.
- [Silero VAD — repositori resmi](https://github.com/snakers4/silero-vad): deteksi aktivitas suara; bukan pengenal harakat.
- [FastAPI — WebSockets](https://fastapi.tiangolo.com/advanced/websockets/): komunikasi dua arah layanan internal.
- [Kandidat Arabic Phoneme ASR](https://huggingface.co/MostafaMaroof/wav2vec2-arabic-phoneme-asr): keluaran fonem serta keterbatasan vokal pendek/batas kata yang dilaporkan pembuat model.
- [Microsoft — fitur pronunciation assessment per locale](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment#supported-features-per-locale): kemampuan rinci pengenalan bunyi berbeda menurut bahasa.
- [ACL — Arabic-Adapted One-Step Speech-to-Diacritized ASR](https://aclanthology.org/2026.abjadnlp-1.43/): penelitian pengenalan diakritik dari suara dan tantangan vokal pendek.

Rencana ini memperinci bagian suara dari rencana empat mode Qiroah sebelumnya. Aturan waqaf mengikuti instruksi terbaru pengguna. Langkah implementasi pertama adalah menyiapkan benchmark dan materi acuan; indikator mikrofon atau animasi saja belum menyelesaikan fitur deteksi.
