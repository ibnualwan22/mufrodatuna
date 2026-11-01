# Analisa Al-Qur’an — penyesuaian kebutuhan Mufrodatuna

Status: audit dan spesifikasi usulan; belum ada perubahan kode aplikasi.
Tanggal pemeriksaan sumber: 1 November 2026.

## Keputusan pengguna

- Analisa Al-Qur’an menjadi game kelima di kategori Qiroah.
- Alur wajib: pilih surah, pilih ayat, lalu jawab pertanyaan dari dataset.
- Admin tidak menyusun materi Al-Qur’an atau soal dari awal. Admin meninjau, memverifikasi, mengoreksi analisis, atau menonaktifkan soal bermasalah.
- **Dikonfirmasi pengguna:** data sumber boleh langsung dimainkan; tidak wajib menunggu verifikasi admin. Statusnya harus jelas sebagai data sumber yang belum ditinjau admin.
- Pertahankan gaya kartu berilustrasi, tipografi Arab, maskot PNG, dan interaksi permainan Mufrodatuna.
- Cantumkan sumber dan lisensi di footer, serta rujukan kata/ayat dalam pembahasan.

## Audit repositori

| Area | Kondisi saat ini | Implikasi integrasi |
| --- | --- | --- |
| Frontend | HTML, CSS, JavaScript ES modules; tanpa React atau Next.js | Pakai komponen dan gaya yang sudah ada |
| Backend | Node.js, Express 4, Socket.IO 4 | Tambah layanan Al-Qur’an dengan pola autentikasi yang sama |
| Penyimpanan | SQLite melalui `node:sqlite`; `lib/db.js` dan `lib/learn-db.js` membuka lokasi DB yang sama | Migrasi tambahan, transaksi, dan indeks; tidak mengganti tabel lama |
| Data belajar | `learning_programs`, `learning_chapters`, `learning_items`; tabel program/bab/kata lama juga masih ada | Katalog Al-Qur’an memiliki identitas surah/ayat sendiri |
| Qiroah | `qiroah_texts`, `qiroah_spans`, `qiroah_notes`, `qiroah_relations` | Bacaan manual tetap memakai alur sekarang |
| Kartu permainan | `public/qiroah-catalog.js` | Tambah kartu Analisa Al-Qur’an pada daftar yang sama |
| Halaman permainan | `public/qiroah.html` dan `public/qiroah-hub.js` | Mode baru memuat pemilih surah/ayat dan modul permainan tersendiri |
| Admin | `public/learn-admin.js` memuat `public/qiroah-admin.js` | Tambah bagian “Verifikasi Analisa Al-Qur’an” pada Ruang Admin |
| Autentikasi | Kata sandi admin bersama; pengecekan pada setiap aksi admin. Siswa dapat bermain tanpa akun | Identitas audit saat ini hanya “admin lokal”, bukan akun individu yang terverifikasi |
| Penilaian Qiroah | Jawaban dan penilaian latihan tersedia di klien | Mode baru perlu konsisten sebagai latihan; jangan mengklaim sebagai sistem ujian terlindungi |

Saat audit terdapat perubahan Qiroah yang belum di-commit serta folder artefak lain. Implementasi harus mempertahankannya.

## Sumber data dan batas cakupan

### Quranic Arabic Corpus

Sumber utama yang diusulkan: paket morfologi resmi versi 0.4, dari https://corpus.quran.com/download/.

Dokumentasi menyediakan tag jenis kata, segmentasi, akar, lemma, bentuk/aspek fi‘il, gender, jumlah, kasus isim, dan mood fi‘il. Satu kata tertulis dapat memiliki beberapa segmen dengan analisis berbeda. Pertanyaan harus menunjuk segmen yang tepat; jangan mengklasifikasikan satu kata gabungan sebagai satu jenis secara sembarang.

Dokumentasi fitur: https://corpus.quran.com/documentation/morphologicalfeatures.jsp
Dokumentasi jenis kata: https://corpus.quran.com/documentation/tagset.jsp

Catatan rilis versi 0.4 menyebut cakupan treebank sintaksis 40% kata, untuk surah 1–8 dan 59–114. Keberadaan fitur di website belum membuktikan bahwa seluruh data itu tersedia dalam paket unduhan morfologi. Importir harus memeriksa isi paket dan cakupan setiap bidang.

Rilis: https://corpus.quran.com/releasenotes.jsp

Konsekuensi:

- Mulai dengan pertanyaan jenis kata, akar, bentuk fi‘il, serta kasus/mood yang memang didukung data.
- Pertanyaan kedudukan nahwu dan hubungan antarkata hanya aktif pada bagian yang memiliki sumber sintaksis yang tersedia dan boleh digunakan.
- Jangan menyamakan `GEN` dengan “kasrah”, atau `ADJ` dengan seluruh rincian analisis nahwu. Status i‘rab, tanda i‘rab, dan kedudukan harus tetap berbeda.
- Nomor bentuk fi‘il seperti IV tidak otomatis merupakan wazan lengkap semua kata. Soal wazan rinci memerlukan pemetaan linguistik yang diperiksa atau dataset tambahan.
- Data yang tidak ada tidak diisi dengan tebakan AI.
- Halaman unduhan resmi meminta alamat surel. Jangan mengirim alamat pengguna tanpa izin atau melewati mekanisme unduhan resmi.

### Teks dan metadata surah

Tanzil menjadi kandidat sumber teks Arab yang terverifikasi. Simpan teks sumber utuh; kecocokan nomor ayat, basmalah, rasm, tanda waqaf, dan posisi kata harus diperiksa sebelum penggabungan dengan Corpus.

Lisensi teks: https://tanzil.net/docs/text_license
Metadata: https://tanzil.net/docs/quran_metadata

Izin metadata dan terjemahan perlu diperiksa pada paket masing-masing. Lisensi teks Arab tidak otomatis mencakup terjemahan Indonesia. Terjemahan tidak menjadi ketergantungan untuk permainan analisis versi pertama.

### Penggunaan dan atribusi

Halaman unduhan Corpus mencantumkan GNU GPL, mengizinkan penggunaan pada aplikasi dengan atribusi dan tautan sumber, meminta pemberitahuan hak cipta dipertahankan, dan menyatakan berkas unduhan tidak diubah. Halaman lisensinya menampilkan GPL versi 3:
https://corpus.quran.com/license.jsp

Tanzil menyebut CC BY 3.0 disertai ketentuan pelestarian teks, pemberitahuan hak cipta, dan tautan sumber. Footer saja tidak menggantikan kewajiban penyertaan pemberitahuan pada berkas yang didistribusikan.

Sebelum impor untuk publikasi, catat versi, URL, tanggal pengambilan, checksum, dan teks lisensi dari paket yang benar-benar dipakai. Arsip sumber tetap utuh. Penyimpanan koreksi terpisah membantu keterlacakan, tetapi tidak dengan sendirinya menyelesaikan pertanyaan hak adaptasi atau distribusi. Jika ketentuan untuk transformasi data, terjemahan label, atau koreksi tidak jelas, klarifikasi dengan pemilik sumber atau pilih sumber dengan izin yang sesuai sebelum publikasi bagian tersebut.

## Spesifikasi game yang disesuaikan

1. Siswa membuka kategori **Qiroah**, lalu kartu **Analisa Al-Qur’an**.
2. Pemilih menampilkan daftar 114 surah dengan pencarian nomor/nama, lalu pilihan ayat sesuai surah.
3. Setelah ayat dipilih, tampilkan teks lengkap dan pilihan “Mulai analisis”. Informasikan jika ayat atau jenis analisis belum tersedia.
4. Sesi mengikuti urutan kata dalam ayat. Bagian aktif diberi latar lembut atau garis penanda, sementara konteks ayat tetap mudah dibaca.
5. Kartu pertanyaan menampilkan satu tugas: jenis kata, akar, bentuk fi‘il, atau status i‘rab. Variasi mengikuti data ayat yang dipilih.
6. Setelah siswa menjawab, tampilkan jawaban acuan, penjelasan singkat, status peninjauan, dan tautan sumber untuk lokasi kata/ayat tersebut.
7. Akhir sesi menampilkan hasil dan bagian yang dapat diulang. Ayat yang hanya mendukung sedikit soal tetap selesai secara wajar.

Aturan penyusunan soal:

- Soal dihasilkan dari data sumber dan templat pertanyaan yang ditulis dalam aplikasi, bukan dibuat manual satu per satu oleh admin.
- Semua opsi berada dalam kategori yang sama; pilihan tidak ganda dan tidak memiliki dua jawaban benar menurut acuan yang dipakai.
- Kata tanpa akar yang tersedia tidak diberi soal akar. Huruf muqatta‘ah tidak dipaksakan masuk klasifikasi biasa.
- Pertanyaan menyebut bagian yang ditargetkan, termasuk awalan/akhiran bila relevan. Teks mushaf asli tidak ditimpa hasil normalisasi untuk pencarian atau pemetaan.
- Pisahkan bidang kedudukan nahwu, status i‘rab, dan tanda i‘rab pada model maupun UI.
- Satu sesi mengunci versi sumber dan revisi yang dipakai, sehingga koreksi admin di tengah permainan tidak mengubah kunci yang sedang dijawab.
- Bila soal dilaporkan keliru, siswa dapat melaporkan dengan referensi soal yang otomatis disertakan.

## Verifikasi admin

Alur ringkas: cari surah/ayat → pilih kata atau segmen → lihat analisis sumber → verifikasi, koreksi, atau nonaktifkan.

Status yang ditampilkan:

- **Dari sumber:** dapat dimainkan, belum ditinjau admin Mufrodatuna.
- **Terverifikasi:** telah ditinjau admin.
- **Perlu koreksi:** pertanyaan yang terpengaruh tidak digunakan untuk sesi baru.
- **Dinonaktifkan:** tidak digunakan dalam permainan.

Status dipasang per bidang analisis; verifikasi akar kata tidak otomatis memverifikasi seluruh analisis ayat. Koreksi wajib memiliki alasan dan referensi. Simpan nilai lama, nilai baru, waktu, dan aktor yang benar-benar diketahui. Pembatalan koreksi menciptakan revisi baru agar riwayat tetap utuh.

Teks Al-Qur’an tidak diedit melalui formulir koreksi analisis. Perbaikan teks sumber dilakukan melalui pembaruan dataset resmi yang diperiksa.

## Struktur data yang diusulkan

Tabel tambahan berprefiks `quran_`:

- `quran_sources`: asal, versi, lisensi, checksum, waktu impor, arsip sumber.
- `quran_surahs`: nomor, nama, jumlah ayat, metadata yang tersedia.
- `quran_verses`: surah, ayat, teks sumber, sumber/versi.
- `quran_words`: posisi kata dalam ayat serta pemetaan terhadap teks sumber.
- `quran_segments`: posisi segmen di dalam kata, bentuk sumber, data morfologi asli.
- `quran_annotations`: bidang analisis, nilai dari sumber, provenance, versi sumber.
- `quran_reviews`: status peninjauan dan koreksi aktif terhadap anotasi tertentu.
- `quran_revision_history`: riwayat verifikasi, koreksi, alasan, referensi, dan pemulihan.

Identitas mencakup surah, ayat, posisi kata, posisi segmen, serta versi sumber. Tambahkan indeks pada surah/ayat dan target anotasi. Root, bentuk, dan fitur morfologi tidak memerlukan masing-masing tabel terpisah pada tahap awal.

Versi baru dataset tidak menimpa koreksi diam-diam. Tandai koreksi yang perlu ditinjau ulang bila data dasarnya berubah.

## Asumsi operasional yang diusulkan

- Beban awal setara situs belajar saat ini; belum ada target pengguna serentak yang ditetapkan. Ukur sebelum menetapkan kebutuhan server lebih besar.
- Daftar surah ringan; detail ayat dan analisis dimuat per pilihan. Jangan mengirim seluruh korpus ke browser.
- Impor terjadwal atau manual oleh pengelola teknis, kemudian permainan membaca salinan lokal. Permainan tidak bergantung pada scraping website saat siswa bermain.
- Sasaran respons awal API lokal di bawah satu detik pada lingkungan pengujian; ukur dengan data lengkap.
- Hak tulis hanya melalui admin yang lolos validasi server. Jangan menerima SQL mentah dari halaman impor.
- Kebutuhan awal tidak memerlukan rekaman suara atau identitas siswa. Laporan soal menyertakan konteks soal, bukan data pribadi yang tidak diperlukan.
- Pengelola teknis menangani pembaruan dataset/lisensi; pengajar menangani kebenaran analisis yang dilaporkan atau ditinjau.

## Kontrak UI dan footer

Gunakan bentuk, ukuran, dan ilustrasi kartu Qiroah yang ada. Pemilih surah/ayat ringkas dan dapat digunakan di ponsel. Pertanyaan tampil satu per satu. Animasi singkat mengarahkan perhatian ke soal aktif; maskot merespons hasil tanpa menutupi teks Arab. Hormati preferensi pengurangan gerak dan suara.

Wajib ada keadaan memuat, gagal dengan tombol coba lagi, data belum tersedia, tidak cukup data soal, soal dinonaktifkan, dan sesi selesai.

Contoh footer, disesuaikan dengan versi yang benar-benar diimpor:

> Analisis bahasa: Quranic Arabic Corpus — © Kais Dukes, 2011, v0.4. Teks Al-Qur’an: Tanzil Project — © 2007–2021. Sumber & lisensi · Tentang verifikasi.

Nama sumber menjadi tautan resmi. “Sumber & lisensi” memuat pemberitahuan lengkap, versi, URL unduhan, dan penjelasan bahwa koreksi lokal merupakan peninjauan Mufrodatuna. Footer harus tersedia juga saat pertanyaan dan hasil ditampilkan.

## Tahap implementasi

1. **Paket data dan izin:** pastikan paket yang dipakai, arsip dan lisensinya; uji pemetaan beberapa ayat termasuk kata majemuk bersegmen.
2. **Penyimpanan dan importir:** migrasi tambahan, validasi identitas dan cakupan, impor idempoten, transaksi/rollback, sumber tetap utuh.
3. **Alur siswa:** kartu baru, pilih surah/ayat, soal dari data, pembahasan, hasil, dan footer sumber.
4. **Verifikasi admin:** peninjauan per bidang, koreksi beralasan, nonaktifkan, audit, serta pemulihan revisi.
5. **Pemeriksaan integrasi:** teks dan pemetaan kata, soal tanpa jawaban ganda, perubahan sumber, akses admin, mobile/desktop, dan regresi empat game Qiroah sebelumnya.

Tahap pertama dimulai dengan sampel data nyata berizin untuk validasi pemetaan; ini bukan pengganti cakupan akhir. Daftar surah tidak boleh memberi kesan semua ayat sudah bisa dimainkan bila data belum diimpor.

## Catatan keputusan

| Keputusan | Alternatif | Alasan |
| --- | --- | --- |
| Game di dalam Qiroah | Aplikasi analyzer terpisah | Sesuai navigasi dan permintaan pengguna |
| Data langsung tersedia, status jelas | Semua jawaban menunggu persetujuan admin | Pilihan eksplisit pengguna pada percakapan ini |
| Soal berbasis templat dan bidang yang tersedia | AI mengisi analisis yang hilang | Kunci dapat ditelusuri ke sumber |
| Salinan dataset lokal | Scraping setiap sesi | Keandalan dan versi data lebih terkendali |
| Koreksi sebagai revisi terpisah | Menimpa berkas sumber | Menjaga provenance dan memudahkan pemulihan; tetap memerlukan pemeriksaan izin adaptasi |
| Fokus awal morfologi | Semua wazan/nahwu langsung lengkap | Cakupan dataset tidak seragam |

Dokumen ini menggantikan perluasan scope pada prompt awal. Langkah berikutnya adalah implementasi setelah persetujuan atas tahap audit, sebagaimana diminta dalam lampiran.
