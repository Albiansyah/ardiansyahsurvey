# Ardi Survey

PWA React untuk operasional survei beras SPHP. Aplikasi memiliki alur terpisah untuk surveyor dan master dengan backend Supabase.

## Fitur

- Form survei dengan waktu WIB yang tidak dapat diedit, validasi per bagian, simpan draf lokal, dan antrean kirim offline.
- Pilihan outlet dari master data beserta detail pelanggan.
- Sembilan pertanyaan wajib.
- Foto kamera dengan stempel waktu, koordinat, akurasi GPS, dan indikator risiko dasar.
- Pernyataan kehadiran serta anggota tim di lokasi.
- Target per surveyor.
- Pengajuan edit atau hapus dengan persetujuan master dan log perubahan.
- CRUD outlet serta bulk upload CSV atau Excel.
- PWA dan layout responsif.
- Dashboard master dengan indikator operasional, grafik periode, realtime, dan polling cadangan.
- Unduh data CSV, XLSX, atau JSON dengan filter waktu WIB dan pagination 500 baris.
- Cadangan JSON tervalidasi, pemulihan dengan dry run, soft delete 30 hari, dan audit log.
- Supabase Auth, Postgres dengan RLS, Storage privat, RPC approval, dan audit log append-only.

## Backend Supabase

Konfigurasi runtime berada di `.env.local` dan dikecualikan dari Git. Struktur database berada di:

```text
supabase/migrations/202611210001_initial_backend.sql
supabase/migrations/202611210002_service_role_grants.sql
supabase/migrations/202611220001_backup_restore_delete.sql
```

Urutan aktivasi backend:

1. Jalankan migration SQL secara berurutan. Migration `202611220001_backup_restore_delete.sql` wajib dipasang sebelum versi aplikasi yang menampilkan Cadangan dan Pemulihan diterbitkan.
2. Isi `INITIAL_MASTER_FULL_NAME`, `INITIAL_MASTER_EMAIL`, dan `INITIAL_MASTER_PASSWORD` pada `.env.local`, lalu jalankan:

```bash
npm run supabase:create-master
```

3. Deploy fungsi admin untuk pembuatan akun surveyor:

```bash
supabase functions deploy admin-create-surveyor --project-ref ymaqbqkusqijxlwtpepl
```

Surveyor tidak memiliki alur pendaftaran mandiri. Akun surveyor dibuat oleh master melalui halaman **Akun Surveyor** dan diberikan langsung kepada pengguna terkait.

Diagram donat dashboard sengaja belum dibuat sampai dimensi kategori bisnis ditentukan. Jangan mengarang kategori dari jawaban teks bebas.

Pemeriksaan koneksi dan kesiapan schema:

```bash
npm run supabase:verify
```

Pemeriksaan agar secret server tidak masuk bundle browser:

```bash
npm run build
npm run security:check-bundle
npx playwright test
```

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Build PWA

```bash
npm run build
npm run preview
```

## Batas validasi perangkat

Kamera, geolocation, stempel foto, akurasi, waktu file, dan secure context menjadi indikator awal. Deteksi VPN dan GPS spoofing tingkat lanjut tetap memerlukan pemeriksaan server dan kebijakan perangkat terkelola.
