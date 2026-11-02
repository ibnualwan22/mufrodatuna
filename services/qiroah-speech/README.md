# Layanan suara Latihan Membaca Qiroah

Layanan ini menerima PCM mono 16 kHz dari server Node. Model hanya melihat audio dan **kata yang disorot**, tanpa kunci harakat admin. Hasil `a`, `i`, `u`, `none`, atau tidak pasti dikirim kembali ke Node; pembandingan dengan kunci dilakukan di sana. Audio sesi hanya berada di memori sementara dan tidak ditulis ke database. Layanan mendengar **satu kata per giliran** yang diakhiri jeda singkat. Ini adalah pilot, belum mesin penilaian produksi.

## Menjalankan lokal

Dari akar proyek pada Linux/WSL, jalankan `npm run speech:setup` sekali untuk memasang lingkungan Python dan checkpoint. Sesudah itu jalankan `npm run speech` pada satu terminal dan `npm start` pada terminal lain. File model dan lingkungan virtual lokal diabaikan Git. Alternatif langkah manual berikut dijalankan dari `services/qiroah-speech/`.

Gunakan Python 3.12 dan lingkungan virtual. Untuk CPU:

```bash
python3 -m venv .venv
.venv/bin/pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
.venv/bin/pip install -r requirements.txt
```

Unduh checkpoint pada revisi yang dikunci di `app.py` ke direktori lokal `model/`, atau biarkan layanan mengunduhnya ke cache Hugging Face pada startup pertama. Kebutuhan ruang checkpoint sekitar 1,2 GB. Contoh unduh lokal:

```bash
.venv/bin/python -c "from huggingface_hub import snapshot_download; snapshot_download('MostafaMaroof/wav2vec2-arabic-phoneme-asr', revision='0a32c641aaaeec6957e41a794add52e024e46b50', local_dir='model')"
QIROAH_MODEL_PATH=./model .venv/bin/uvicorn app:app --host 127.0.0.1 --port 8891
```

Pada terminal lain jalankan aplikasi utama (`npm start`). Secara bawaan Node menghubungi `http://127.0.0.1:8891`. Jika layanan belum siap, layar membaca menyediakan latihan mandiri dan tidak memalsukan hasil suara. Browser memerlukan `localhost` atau HTTPS untuk mikrofon dan AudioWorklet.
Set `READING_SPEECH_ENABLED=0` pada Node untuk mematikan penilaian otomatis sementara dan mempertahankan latihan mandiri.

Untuk penempatan di dua kontainer, bangun layanan memakai `Dockerfile` ini, tempatkan pada jaringan internal, dan atur `READING_SPEECH_URL=http://<nama-layanan>:8891` pada Node. Atur **nilai `READING_SPEECH_TOKEN` yang sama** di kedua layanan; jangan buka port layanan suara ke internet. Endpoint `/health` memberi 503 sampai model dan VAD siap. Simpan cache model di volume agar startup berikutnya tidak mengunduh ulang.

Checkpoint yang diuji: `MostafaMaroof/wav2vec2-arabic-phoneme-asr` revisi `0a32c641aaaeec6957e41a794add52e024e46b50`; SHA-256 `model.safetensors`: `582149e3e913a0fc7f29c116530e0b1b6ae7a7ab23eef4efc3fc2acc760e2b75`. Ketentuan penggunaan model dan model dasarnya perlu diperiksa sebelum rilis publik. [Kartu model](https://huggingface.co/MostafaMaroof/wav2vec2-arabic-phoneme-asr) menjelaskan data dan batasan yang dilaporkan pembuatnya.

## Batas pilot

- Hanya fathah, kasrah, dan dhammah akhir kata yang ditulis eksplisit. Tanwin, sukun sebagai jawaban, akhir muqaddar, dan kata bersufiks kompleks belum dinilai.
- `confidence` adalah proksi dari kecocokan konsonan dan posterior token, **bukan probabilitas benar yang sudah terkalibrasi**. Ambang awal di Node 0,60 perlu diatur dengan rekaman siswa sasaran, bukan dari sampel sintetis.
- Uji sintetis lokal memastikan koneksi audio→model→hasil berjalan. Ia belum mengukur akurasi siswa, terutama suara anak dan penutur Indonesia. Ikuti protokol di `docs/evaluations/qiroah-irob/README.md` sebelum menyebut fitur ini akurat.
- Browser yang tidak mendukung mikrofon atau layanan yang tidak siap menampilkan bacaan tanpa harakat dan tombol acuan, tanpa penilaian otomatis.
