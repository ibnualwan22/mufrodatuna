# Evaluasi pilot pengenal harakat akhir

Pemeriksaan integrasi yang telah dilakukan dicatat di [laporan 2 November 2026](2026-11-02-implementation-check.md).

Belum ada benchmark suara siswa. Jangan menyimpulkan akurasi dari keberhasilan tes unit atau audio TTS. Sebelum digunakan sebagai penilaian siswa, kumpulkan rekaman yang diizinkan dari sedikitnya 10 pembaca dan sekitar 600 peristiwa akhir kata, dengan pembagian fathah, kasrah, dhammah, akhir yang dihilangkan, kata salah, jeda yang sah, serta audio bising. Guru memberi label bunyi **yang terucap**, bukan yang seharusnya dibaca. Pisahkan pembaca untuk kalibrasi ambang dan pengujian akhir; uji akhir tidak boleh dipakai menyetel ambang berulang kali.

Simpan audio berizin di tempat yang dibatasi aksesnya di luar repositori. Catat perangkat, kelompok usia, dan izin penghapusan. Jangan mengambil audio sesi game secara otomatis untuk benchmark.

Laporkan confusion matrix per vokal dan `none`, kasus tak pasti, kesalahan merah pada bacaan benar, kesalahan yang terlewat, waqaf yang salah diblokir/terlewat, latensi p50/p95 setelah akhir kata, serta penggunaan CPU/RAM pada beban 1 dan 5 sesi. Target penerimaan dan cakupan rinci tercatat dalam [rencana implementasi](../../plans/2026-11-01-qiroah-latihan-irob-suara.md). Hasil yang belum jelas dihitung terpisah, bukan disembunyikan dari penyebut.
