# AGENTS.md: Ardi Survey (Operasional SPHP)

Dokumen ini adalah satu-satunya sumber arah untuk agent yang mengerjakan UI/UX dan fitur aplikasi ini.
Baca berurutan dari Bagian 1 sampai 10. Bagian 8 (Anti AI Slop) dan Bagian 9 (Delivery Gate) adalah filter akhir: pekerjaan belum selesai sebelum lolos keduanya.

---

## 1. Garis Benang Merah

**Produk:** aplikasi web survei lapangan untuk outlet. Dua peran:
- **Surveyor**: mengisi survei (9 pertanyaan) di HP saat di lapangan, melihat laporan dan riwayat sendiri.
- **Master**: memantau semua surveyor, mengelola outlet, target, akun surveyor, laporan, dan data.

**Keputusan yang sudah final (jangan ditanyakan ulang):**

| Hal | Keputusan |
|---|---|
| Prioritas perangkat | Mobile-first. Desktop adalah perluasan, bukan sumber desain. |
| Koneksi | Online-first. Offline ditangani sebagai cadangan (draf lokal + antrean kirim). |
| Karakter visual | Clean, minimal, ala SaaS. Belum ada logo. |
| Tema | Light saja. Tidak ada dark mode, tidak ada theme toggle. |
| Form survei | 9 pertanyaan. Boleh dipecah bila jenis field membenarkan (lihat 4.4). |
| Dashboard | Master dan surveyor masing-masing punya dashboard sendiri. |
| Bahasa | Indonesia formal (baku, sopan, tanpa slang). Gunakan "survei", bukan "survey". |
| Komponen | shadcn/ui. Ikon dari lucide-react. **Dilarang emoji** di UI, copy, toast, maupun kode. |

**Arah kerja satu kalimat:** setiap layar harus bisa dipakai satu tangan di HP dengan sinyal buruk, terasa tenang dan rapi, dan tidak pernah menampilkan data atau klaim yang tidak nyata.

**Konteks teknis yang sudah diketahui:** React + Vite, React Router, Zustand (`lib/store`), Tailwind, `lib/toast` kustom, `Icons.jsx` kustom, ada konsep `storageError` / `hydrated` / RLS (kemungkinan Supabase). **Langkah pertama agent:** baca `package.json`, `tailwind.config.*`, `lib/store`, dan lapisan data untuk memastikan versi Tailwind (v3 atau v4), backend, dan skema tabel. Jangan berasumsi.

---

## 2. Pembacaan Desain dan Dial (wajib dinyatakan sebelum generate)

> Membaca ini sebagai: aplikasi operasional survei lapangan untuk surveyor (mobile, satu tangan) dan master (monitoring), dengan gaya clean minimal SaaS bernada tenang, dial **ENERGI 1 / RITME 1 / GERAK 1**.

- **ENERGI 1**: tenang, informatif, tidak berteriak.
- **RITME 1**: keseragaman adalah pilihan yang disengaja. Aplikasi kerja harus bisa diprediksi. Variasi hanya untuk hierarchy (kartu ringkasan utama vs daftar).
- **GERAK 1**: hanya hover/press state, transisi dialog/sheet bawaan shadcn, dan skeleton. Tidak ada parallax, floating, atau koreografi. Hormati `prefers-reduced-motion` (sudah ada di `index.css`, pertahankan).

Karena ENERGI 1 rawan jatuh ke "steril", kehidupan dihasilkan lewat tuas di Bagian 3, bukan lewat dekorasi.

---

## 3. Arah Desain (DESIGN) dan Alasan Satu Baris (R-31)

| Keputusan | Pilihan | Alasan satu baris |
|---|---|---|
| Warna primer | Emerald **700** (`#047857`, HSL `162 94% 24%`) | Rasio kontras dengan putih 5.5:1 (lulus AA); emerald-600 gagal untuk teks kecil. |
| Netral | Slate (bg `slate-50`, teks `slate-900`, teks sekunder minimal `slate-600`) | Netral dingin membuat emerald terbaca sebagai satu-satunya aksen. |
| Aksen kedua | Amber hanya untuk status peringatan/offline | Status semantik, bukan dekorasi. Merah hanya untuk destruktif dan error. |
| Palet total | 1 warna inti (emerald) + netral slate + 1 aksen (amber) + merah semantik | Memenuhi R-29. |
| Typeface | **Plus Jakarta Sans** (fallback `Inter`, `system-ui`) | Dirancang untuk konteks Indonesia, terbaca jelas di Android kelas menengah; `Segoe UI` tidak tersedia di HP. |
| Angka | `font-variant-numeric: tabular-nums` pada semua angka tabel/KPI | Angka sejajar memudahkan perbandingan di laporan. |
| Radius | `--radius: 0.5rem` untuk kontrol, kartu `rounded-xl`, avatar/chip penuh hanya untuk avatar | Variasi radius sebagai hierarchy, bukan semua pil (R-11). |
| Shadow | Hampir tidak ada; elevation lewat border `slate-200`. Shadow hanya untuk dropdown, sheet, dialog | Shadow menandai lapisan yang melayang secara fungsional (R-12). |
| Kartu | Kartu KPI utama lebih besar dari kartu sekunder; daftar memakai baris, bukan kartu | Hierarchy konten menentukan bentuk (R-14). |

**Motif identitas (satu, diulang):** *penanda aksen hijau 3px di sisi kiri* untuk item aktif di navigasi, kartu yang sedang difokus, dan baris yang butuh tindakan. Ia konsisten dengan fungsi aplikasi (menandai posisi/lokasi dan status) dan tidak butuh dekorasi tambahan.

**Titik fokus per layar:** Dashboard surveyor = tombol "Mulai Survei Baru"; Dashboard master = ringkasan capaian vs target; Form = pertanyaan aktif + tombol kirim; Laporan = daftar dengan filter.

**Logo:** belum ada. Pakai placeholder jujur: ikon `ClipboardCheck` di kotak emerald + teks "Ardi Survey", dikomponenkan sebagai satu `<Brand />`. Beri komentar `// TODO: ganti dengan logo final`. Jangan membuat logo karangan (R-23). Nama brand "Ardi Survey" dianggap sementara sampai dikonfirmasi.

---

## 4. Aturan UI/UX

### 4.1 Stack dan komponen
- Inisialisasi shadcn (`npx shadcn@latest init`), set CSS variables (`--primary`, `--ring`, `--radius`, `--background`, dst.) agar `Button` default sudah emerald. Jangan menulis `bg-emerald-*` manual di tiap tombol.
- Hapus hardcode hex di `index.css` (`#f1f5f9`, `#0f172a`, `#1e40af`), blok `select {...!important}`, dan `*:focus-visible` custom setelah komponen shadcn menggantikannya.
- Hapus `color-scheme` dark apa pun; tetap `light`. Tidak ada kelas `dark:`.
- Pemetaan komponen:

| Lama | Baru |
|---|---|
| `Toast` / `lib/toast` | `sonner` (satu API `toast`) |
| `ConfirmDialog` | `AlertDialog` |
| `PageLoading` | `Skeleton` yang meniru bentuk halaman |
| `PageError` | `Alert` (destructive) + tombol "Coba Lagi" |
| `<select>` | `Select` |
| Input form | `Form` + `Input` + `Label` (react-hook-form + zod) |
| Tabel | `Table` di desktop, **daftar kartu ringkas di mobile** |
| Badge status | `Badge` (hanya untuk status nyata) |
| Navigasi mobile "Lainnya" | `Sheet` sisi bawah |
| Menu akun | `DropdownMenu` + `Avatar` |
| Chart | komponen `chart` shadcn (berbasis recharts) |

- Ikon: semua dari `lucide-react`. `Icons.jsx` dihapus setelah semua pemakaian dimigrasi. Ikon harus relevan dengan isinya (R-04): Dashboard `LayoutDashboard`, Survei Baru `Plus`/`ClipboardPlus`, Laporan `FileText`, Riwayat/Log `History`, Outlet `Store`, Target `Target`, Akun Surveyor `UserPlus`, Profil `User`, Keluar `LogOut`, Offline `WifiOff`, Lokasi `MapPin`, Unduh `Download`, Unggah `Upload`, Hapus `Trash2`.

### 4.2 Mobile-first
- Tulis kelas tanpa prefix untuk mobile, tambah `md:`/`lg:` untuk layar lebih besar.
- Target sentuh minimal 44px (`h-11`). Jarak antar target minimal 8px.
- Input `text-base` di mobile (cegah auto-zoom iOS), `md:text-sm` boleh.
- Pakai `min-h-dvh`, bukan `min-h-screen`. Bottom nav dan sticky bar wajib `pb-[env(safe-area-inset-bottom)]`.
- Tidak boleh ada scroll horizontal. Tabel lebar dibungkus `overflow-x-auto` atau diganti daftar kartu.
- Aksi utama berada di zona jempol (bawah layar): tombol Kirim sticky di bawah, bukan di atas.
- Uji pada lebar 360px dan 390px sebelum desktop.

### 4.3 Navigasi dan akses
- **Surveyor (4 item):** Beranda, Survei Baru (disorot), Laporan, Riwayat.
- **Master (4 + Lainnya):** Dashboard, Laporan, Outlet, Target, lalu "Lainnya" (Sheet) berisi Akun Surveyor, Unduh Data, Cadangan dan Pemulihan, Log Aktivitas, Profil. Maksimal 5 slot di bottom nav.
- Desktop: sidebar putih, item aktif memakai motif aksen kiri + latar `emerald-50`.
- Header mobile berisi `<Brand />`, indikator koneksi (hanya muncul saat offline atau menyinkronkan), dan avatar yang membuka `DropdownMenu` (Profil, Keluar). Tombol **Keluar** harus tercapai dalam dua ketuk.
- Link aktif memakai `aria-current="page"`.
- Rute terlarang (surveyor membuka `/outlets`, `/targets`, dll.) jangan redirect diam-diam: tampilkan halaman "Akses Ditolak" singkat dengan tombol kembali ke Beranda, atau toast jelas.
- Setiap item nav harus punya rute dan halaman nyata (R-24).

### 4.4 Form survei (9 pertanyaan)
- Baca `SurveyForm.jsx` dulu, lalu pilih:
  - **Default:** satu halaman, field dikelompokkan dalam 3 section bertajuk (mis. Identitas Outlet, Kondisi Lapangan, Bukti dan Catatan), bar progres tipis di atas, **tombol "Kirim Survei" sticky di bawah**.
  - **Stepper 3 langkah** hanya jika ada field berat (foto, GPS, unggahan) yang membuat satu halaman terlalu panjang. Tulis alasannya.
- Satu kolom, label di atas input, bantuan di bawah input, error inline di bawah field (bukan hanya toast).
- Draf tersimpan otomatis ke penyimpanan lokal setiap perubahan (debounce), dengan keterangan "Draf tersimpan pukul HH:mm". Konfirmasi sebelum meninggalkan form yang belum terkirim.
- Field GPS: tampilkan status (mencari lokasi, akurasi dalam meter, gagal) dengan tombol "Coba Lagi". Jangan pernah mengisi koordinat karangan.
- Field foto: kompres di klien sebelum unggah, tampilkan pratinjau dan tombol ganti/hapus.
- Setelah kirim: layar sukses ringkas dengan aksi "Lihat Laporan" dan "Buat Survei Lagi".

### 4.5 Empty, Loading, Error (R-27, wajib di setiap tampilan data)
- **Loading:** skeleton berbentuk kartu/baris/chart sesungguhnya. Hindari teks "Memuat..." saja.
- **Empty:** ikon relevan, satu kalimat penjelasan, satu aksi nyata (mis. "Belum ada laporan. Mulai survei pertama Anda.").
- **Error:** `Alert` destructive, pesan manusiawi tanpa istilah teknis, tombol "Coba Lagi".
- Hapus istilah teknis dari UI (mis. "kebijakan RLS" di halaman Login).

### 4.6 Online-first dan offline sebagai cadangan
- Deteksi koneksi lewat `navigator.onLine` + peristiwa `online`/`offline`. Tampilkan lencana "Offline" di header (amber) dan banner di desktop.
- Saat offline: form tetap bisa diisi, hasil disimpan sebagai **draf antrean** di IndexedDB; tombol berubah menjadi "Simpan di Perangkat". Saat online kembali: kirim otomatis berurutan, tampilkan progres dan hasil per item. Item gagal tetap di antrean dengan tombol "Kirim Ulang".
- Halaman yang membutuhkan server (Laporan, Dashboard) saat offline menampilkan data terakhir yang di-cache bila ada, dengan label "Data terakhir diperbarui HH:mm", atau error state yang jelas.
- Jangan menjanjikan sinkronisasi yang tidak diimplementasikan. Bila belum dibuat, label "Segera hadir" dan komentar `// TODO` (R-26).

### 4.7 Copy: Indonesia formal
- Gunakan "Anda", kalimat lengkap, nada sopan dan lugas. Tanpa slang, tanpa seruan berlebihan.
- CTA spesifik: "Kirim Survei", "Simpan Perubahan", "Unduh Data", "Pulihkan Data", "Hapus Data Terpilih". Dilarang "Get Started", "Mulai Sekarang", "Selengkapnya" generik.
- Pesan error: apa yang terjadi + apa yang bisa dilakukan. Contoh: "Survei belum terkirim karena koneksi terputus. Data Anda tersimpan di perangkat dan akan dikirim saat koneksi kembali."
- Dilarang em dash (lihat R-02). Dilarang buzzword (R-16).
- Istilah baku: Survei, Surveyor, Outlet, Laporan, Riwayat, Kata sandi, Keluar, Masuk, Unduh, Unggah, Cadangan, Pulihkan.

### 4.8 Aksesibilitas
- Kontras WCAG AA (4.5:1 teks normal). Teks sekunder minimal `slate-600` di atas `slate-50`/putih.
- Seluruh UI bisa dioperasikan dengan keyboard; fokus terlihat memakai `--ring` shadcn. Dialog, sheet, dropdown menutup dengan `Escape`.
- Tombol ikon-saja wajib `aria-label`. Pesan error memakai `role="alert"`. Input punya `Label` terhubung (`htmlFor`).

### 4.9 Perbaikan yang sudah teridentifikasi (kerjakan)
- `Layout.jsx`: bottom nav master 6 item jadi 4 + Lainnya; tambah menu akun + Keluar; indikator offline; `<Brand />` tunggal; `min-h-dvh`; safe-area; `aria-current`; hapus `style` inline `gridTemplateColumns`; avatar inisial `toUpperCase()`.
- `Login.jsx`: hapus `autoFocus`; tombol tampilkan/sembunyikan kata sandi; spinner `Loader2` pada tombol loading; ganti teks "RLS" dengan copy bermakna; petunjuk "Hubungi master untuk mengatur ulang kata sandi"; placeholder email netral (`nama@email.com`); `Alert` untuk error.
- `App.jsx`: skeleton pada loading; `Alert`/`Card` pada `PageError`; halaman "Akses Ditolak" untuk rute master-only.
- `index.css`: token shadcn, font Plus Jakarta Sans, hapus hack `select` dan hardcode hex.
- Draf Layout dan Login versi shadcn sudah dibahas di percakapan; gunakan sebagai titik awal, tetapi **ganti `emerald-600` dengan `emerald-700` pada elemen berteks putih** demi kontras.

---

## 5. Perintah Fitur Baru

Semua fitur di bagian ini: master-only kecuali disebut lain, aman di sisi server (RLS/RPC, bukan hanya disembunyikan di UI), lengkap dengan empty/loading/error state, dan tercatat di Log Aktivitas.

### 5.1 Dashboard Master: chart real-time
Buat dashboard master dengan komponen chart shadcn (recharts):
1. **Kartu KPI** (hanya angka nyata dari database): total survei, survei hari ini, capaian vs target (persen + bar progres), jumlah surveyor aktif.
2. **Diagram batang**: jumlah survei per surveyor pada periode terpilih.
3. **Diagram garis**: tren survei harian (7 hari, 30 hari, bulan ini).
4. **Diagram donat/pie**: komposisi survei berdasarkan satu dimensi kategorikal nyata dari form (status, kondisi, atau kategori outlet; **tanyakan ke user dimensi mana yang bermakna**, jangan mengarang).
5. **Target vs realisasi** per surveyor/outlet sebagai bar progres.
6. Filter periode di atas dashboard (Segmented control atau `Select`).

**Real-time:** langganan perubahan tabel survei (bila backend Supabase: Realtime `postgres_changes`, bila bukan: polling 15-30 detik sebagai fallback). Debounce refetch ±1 detik agar tidak berkedip. Tampilkan "Diperbarui HH:mm" dan indikator koneksi live yang benar-benar mencerminkan status langganan. Bersihkan langganan saat unmount.

Aturan chart: maksimal 1 warna inti + tint-nya + slate; jangan pelangi. Tooltip jelas, sumbu berlabel, angka `tabular-nums`. Data kosong menampilkan empty state, bukan chart kosong atau angka contoh. Di mobile, chart responsif tanpa overflow; donat boleh jadi daftar berpersentase bila terlalu sempit.

**Dashboard surveyor** (terpisah): sapaan singkat, capaian pribadi vs target, tombol utama "Mulai Survei Baru", jumlah draf/antrean yang belum terkirim, 5 survei terakhir.

### 5.2 Halaman Unduh Data (`/export`)
- Cakupan: **Semua surveyor** atau **per surveyor** (pilih dari daftar).
- Waktu: **tanggal tunggal**, **rentang tanggal**, atau **periode** (minggu ini, bulan ini, bulan lalu, kuartal, tahun).
- Pratinjau jumlah baris sebelum unduh ("1.248 survei akan diunduh"), nol baris menonaktifkan tombol.
- Format: CSV, XLSX, JSON.
- Zona waktu **Asia/Jakarta (WIB)** untuk semua filter tanggal.
- Nama file: `ardi-survey_{cakupan}_{dari}_{sampai}.{ext}`.
- Data besar diambil bertahap (paginasi), dengan indikator progres.
- Surveyor biasa boleh membuka versi terbatas yang hanya memuat data miliknya sendiri (dijaga RLS).

### 5.3 Cadangan dan Pemulihan (`/backup`)
- **Unduh cadangan JSON manual**: satu tombol, berisi survei, outlet, target, dan metadata. Sertakan `schemaVersion`, `exportedAt`, `exportedBy`, jumlah record per tabel, dan checksum.
- **Unggah cadangan**: pilih berkas JSON, validasi skema (zod) dan ukuran, lalu tampilkan **pratinjau uji coba (dry run)**: jumlah data baru, duplikat, dan ditolak beserta alasan. Pilihan mode: "Lewati duplikat" (default) atau "Timpa data yang sama". Wajib konfirmasi lewat `AlertDialog` sebelum menulis. Proses bertahap dengan progres; laporan galat dapat diunduh.
- Kata sandi dan kredensial akun **tidak pernah** masuk berkas cadangan. Foto yang disimpan di storage hanya dicadangkan sebagai referensi; nyatakan batasan ini di UI.
- Tampilkan waktu cadangan terakhir dan peringatan lembut bila sudah lebih dari 30 hari.

### 5.4 Hapus Data Terkontrol (`/data/hapus` atau bagian di Cadangan)
- Cakupan: **berdasarkan periode**, **tanggal/rentang tanggal**, atau **per surveyor** (boleh dikombinasikan).
- Alur wajib: pilih cakupan, lihat **jumlah yang akan terhapus**, opsi "Unduh cadangan JSON dulu" (aktif secara default), lalu konfirmasi dengan **mengetik kata "HAPUS"**, lalu eksekusi.
- Default **soft delete** (kolom `deleted_at`, dapat dipulihkan 30 hari), dengan opsi terpisah "Hapus permanen" yang butuh konfirmasi tambahan. Eksekusi di server (RPC), bukan loop dari klien.
- Catat di Log Aktivitas: siapa, kapan, cakupan, jumlah.
- Tombol hapus memakai gaya destructive dan tidak berada berdampingan dengan tombol aman.

### 5.5 Rekomendasi tambahan (kerjakan berurutan, berhenti bila user menolak)
Prioritas 1 (sangat sesuai untuk survei lapangan):
1. **Alur verifikasi laporan**: status `Menunggu`, `Disetujui`, `Perlu Perbaikan` dengan catatan master; surveyor mendapat notifikasi di app dan bisa memperbaiki.
2. **Pencarian, filter, dan paginasi** di Laporan dan Riwayat (surveyor, tanggal, outlet, status).
3. **Deteksi duplikat**: peringatan bila outlet yang sama disurvei dua kali dalam jendela waktu tertentu.
4. **Validasi bukti lokasi**: tampilkan akurasi GPS dan jarak surveyor ke koordinat outlet; tandai bila di luar ambang.
5. **Reset kata sandi oleh master** dan penonaktifan akun surveyor (bukan hanya hapus).

Prioritas 2:
6. **Peta outlet** (sebaran survei) bila ada koordinat nyata.
7. **Impor outlet massal** dari CSV dengan pratinjau dan validasi.
8. **PWA** agar bisa dipasang di layar utama dan membuka offline.
9. **Ekspor PDF** per laporan untuk dibagikan.
10. **Batas waktu sesi** dan keluar otomatis saat tidak aktif, serta pembatasan percobaan masuk.

Prioritas 3:
11. Pengingat target mingguan untuk surveyor.
12. Kebijakan retensi data (arsip otomatis data lama, atas persetujuan master).

---

## 6. Keamanan dan Integritas Data
- Semua otorisasi dijaga di server (RLS/RPC). Penyembunyian di UI bukan keamanan.
- Operasi massal (ekspor semua, impor, hapus) hanya master, selalu tercatat di log.
- Berkas impor divalidasi ketat (skema, ukuran, tipe); jangan pernah mengeksekusi atau mempercayai isi mentah.
- Jangan menaruh rahasia, kunci service, atau data sensitif di klien atau di berkas cadangan.
- Klaim keamanan di UI harus nyata. Dilarang menulis "SOC 2", "ISO 27001", "enkripsi tingkat militer", dsb. tanpa bukti.

---

## 7. Urutan Kerja untuk Agent
1. Baca `package.json`, konfigurasi Tailwind, `lib/store`, lapisan data. Catat versi dan skema.
2. Nyatakan **Pembacaan Desain** (Bagian 2) dan tulis alasan satu baris (Bagian 3).
3. Fondasi: shadcn init, token, font, `Brand`, sonner, AlertDialog, skeleton, hapus hack CSS.
4. `Layout`, `Login`, `App` (state, akses ditolak).
5. `SurveyForm` + draf otomatis + antrean offline.
6. Dashboard surveyor dan dashboard master (chart real-time).
7. Laporan, Riwayat, Outlet, Target, Surveyor, Profil: migrasi komponen + empty/loading/error + mobile.
8. Fitur 5.2, 5.3, 5.4.
9. Rekomendasi 5.5 sesuai persetujuan.
10. Jalankan **Delivery Gate** (Bagian 9) dan sertakan laporan PASS/FAIL.

Aturan kerja: ubah langsung di source (R-33), jangan tinggalkan skrip patch di repo. Kerjakan per langkah kecil yang bisa diuji. Tanyakan hanya bila terblokir; bila perlu bertanya, ajukan satu pertanyaan penentu per kali.

---

## 8. Anti AI Slop: Design dan Copy Rules

`ANTISLOP.md` adalah **filter**, bukan style guide. Ia menolak teknik visual tanpa tujuan dan menuntut hasil yang hidup dan spesifik, bukan steril. Ia tidak menetapkan warna, font, atau gaya (itu tugas Bagian 3), dan tidak melarang teknik (gradient, badge, kartu) selama punya tujuan yang bisa ditulis.

**Prinsip utama:** sebelum memakai teknik visual apa pun, jawab: *ini melayani apa?* Jika satu-satunya jawaban adalah "terlihat seperti AI" atau "terlihat aman", buang atau rombak.
**Uji akhir:** jika logo dan nama produk diganti, apakah desain masih terasa unik dan berkarakter? Jika tidak, ulangi.
Desain selesai hanya jika: (1) setiap teknik lolos uji tujuan, (2) punya identitas dan karakter sendiri, (3) benar-benar berfungsi.

### Craftsmanship (C-1 sampai C-5)
- **C-1 Intentionalitas:** setiap keputusan punya alasan yang bisa dijelaskan.
- **C-2 Kelengkapan fungsional:** elemen interaktif berfungsi, atau tidak ada.
- **C-3 Komposisi berbasis konten:** setiap section ada karena konten membutuhkannya.
- **C-4 Ketahanan:** kokoh di state kosong/memuat/error, setiap breakpoint, dan hanya dengan keyboard.
- **C-5 Bukti di atas klaim:** fakta harus nyata dan dapat diverifikasi, atau tidak ditampilkan.

### Tanda peringatan slop (untuk audit, bukan daftar larangan)
Gradient biru-ungu generik; glassmorphism di semua tempat; semua elemen berbentuk pil; shadow besar di semua komponen; glow di mana-mana; background grid; tumpukan tren dekoratif; dark mode tanpa alasan; 5+ warna tanpa sistem; aksen di semua elemen; hasil steril tanpa identitas; skeleton dipakai sebagai "screenshot produk"; layout monoton; kartu fitur identik; spacing seragam; animasi template; "How It Works" 3 langkah; logo bar "Trusted By"; kartu harga "Most Popular"; footer 4 kolom template; em dash; CTA generik; buzzword; statistik, testimonial, dan klaim kepercayaan palsu; ikon AI generik (sparkle, star, magic, lightning, diamond, robot, orb); arrow di semua tombol; badge kapsul AI; heading monospace dan label uppercase tracking lebar; font tanpa alasan; ilustrasi generik; elemen interaktif mati; hanya happy path; FAQ generik; logo/avatar dibuat sembarang; navbar tanpa tujuan; patching file via skrip; tanpa identitas; meniru produk populer; kontras buruk; tidak bisa dinavigasi keyboard. Kemunculan berkelompok tanpa tujuan adalah slop.

### Group 1: Hard Gate (mutlak)
- **R-02 Copywriting:** dilarang karakter em dash dalam teks apa pun. Pakai koma, titik, titik dua, atau tanda kurung. Teks natural dan manusiawi.
- **R-03 Mobile:** sempurna sejak awal. Tidak ada overflow horizontal, teks keluar container, kartu bertabrakan. Tap target minimal 44px. Spacing konsisten antar breakpoint.
- **R-17 Data dan angka:** dilarang angka tanpa sumber nyata. Lebih baik kosong daripada menipu.
- **R-18 Testimonial:** dilarang avatar AI, nama/jabatan acak, review fiktif. Tanpa testimonial asli, jangan buat section-nya.
- **R-23 Klarifikasi dan aset:** sebelum membuat aset tanpa instruksi (logo, avatar, statistik, identitas, struktur navigasi), tanya atau pakai placeholder yang jelas (`[LOGO]`, avatar inisial, `[REAL DATA]`). Jangan menyajikan aset buatan sebagai final tanpa konfirmasi.
- **R-24 Navigasi:** dilarang link navbar ke halaman/section yang tidak ada. Fitur belum jadi: jangan masukkan, atau beri label "Segera hadir".
- **R-25 Kontras:** WCAG AA (4.5:1 normal, 3:1 teks besar 18px+). Uji di seluruh area yang dilewati teks.
- **R-26 Elemen interaktif:** setiap tombol/link/form punya perilaku nyata, atau dihapus. Placeholder hanya dengan komentar `// TODO` DAN label terlihat ("Segera hadir"). Modal bisa ditutup dengan Escape.
- **R-27 UI states:** setiap UI data punya empty, loading, dan error state.
- **R-28 FAQ:** dilarang FAQ generik. Tanpa pertanyaan nyata, jangan buat FAQ.
- **R-32 Keyboard:** semua interaktif bisa dijangkau (Tab/Shift+Tab, Enter/Space, Escape), fokus terlihat. Dilarang `outline: none` tanpa pengganti yang lebih baik.
- **R-33 Tanpa patching via skrip:** fitur dibangun langsung di source, bukan lewat skrip `str.replace` pada file.
- **R-34 Tema:** (aplikasi ini light saja) bila suatu saat ada toggle, kedua mode harus berfungsi penuh.
- **R-35 Verifikasi:** jalankan atau build app, cek console, uji tiap elemen interaktif dan breakpoint mobile sebelum menyatakan selesai.
- **R-36 Klaim karangan:** dilarang klaim keamanan/kepatuhan/performa tanpa bukti.
- **R-37 Arah desain wajib ada:** muat arah (Bagian 3). Tanpa arah dan tanpa bisa bertanya: label "draf tanpa arah" dan dial ENERGI 1 / RITME 1 / GERAK 1.
- **R-38 Konten nyata atau placeholder jujur:** tidak ada testimoni, fitur, statistik, link, atau tim karangan. Section kosong lebih baik daripada karangan.

### Group 2: Purpose-Gate (teknik boleh, tujuan wajib ditulis)
- **R-01 Warna/gradien:** dilarang gradient biru-ungu/cyan/pink, glow berwarna, tombol biru neon sebagai default. Boleh bila bagian identitas atau hierarchy dengan alasan tertulis.
- **R-04 Ikon:** dilarang ikon AI generik sebagai ikon fitur. Ikon harus relevan; bila tidak ada yang tepat, tanpa ikon.
- **R-06 Typography:** dilarang monospace besar demi estetika terminal dan label uppercase tracking ekstrem tanpa tujuan. Pilih typeface berdasarkan karakter brand dan tulis alasannya.
- **R-07 Background:** dilarang grid/blueprint/graph paper tanpa tujuan identitas.
- **R-08 Arrow pada tombol:** bukan identitas default; bila dipakai, tulis fungsinya.
- **R-09 Badge:** hanya untuk status/label nyata. Hindari kombinasi kapsul + border tipis + glow + titik + uppercase.
- **R-10 Glassmorphism:** hanya aksen; blur pada maksimal 1-2 elemen; dilarang di navbar, kartu, modal, dan sidebar sekaligus. (Header mobile `backdrop-blur` dihitung; pilih satu penggunaan.)
- **R-12 Shadow:** untuk elevation selektif, alasan ditulis.
- **R-13 Glow:** aksen fokus maksimal 1-2 elemen. Pada aplikasi ini: tidak dipakai.
- **R-14 Kartu fitur:** dilarang semua kartu identik tanpa alasan hierarchy.
- **R-19 Animasi:** harus punya tujuan UX tertulis dan cocok dengan dial GERAK (di sini 1).
- **R-22 Ilustrasi:** dilarang Undraw/Storyset/blob 3D generik. Pakai ikon relevan atau tanpa ilustrasi.

### Group 3: Quality Locks
- **R-05 Layout:** dilarang layout template AI; struktur mengikuti kebutuhan konten dan dial RITME (di sini 1: keseragaman disengaja).
- **R-11 Radius:** konsisten sesuai design system; dilarang semua elemen pil.
- **R-15 CTA:** dilarang CTA generik; spesifik pada aksi.
- **R-16 Buzzword:** dilarang "AI Powered", "Seamless", "Revolutionary", "Cutting Edge", "Intelligent", "Ultimate", "Powerful", "Effortless". Tunjukkan bukti, bukan klaim.
- **R-20 Identitas visual:** palet spesifik, typeface beralasan, hierarchy jelas, identitas dari pilihan sengaja, bukan dekorasi.
- **R-21 Dark mode:** aplikasi ini light saja berdasarkan keputusan produk (pengguna di lapangan, siang hari, kontras tinggi). Tidak perlu toggle.
- **R-29 Palet:** maksimal 2-3 warna inti + 1 aksen; netral tidak dihitung.
- **R-30 Jangan meniru produk populer** tanpa diminta. Referensi hanya inspirasi.
- **R-31 Alasan satu baris** untuk setiap keputusan utama (warna, layout, typography, spacing, kartu, ikon/ilustrasi). Bila tak bisa ditulis satu baris, tinjau ulang.

### Liveliness Toolkit
Menghapus slop menyisakan kekosongan; liveliness harus ditambahkan.
- **Tiga dial** (ENERGI, RITME, GERAK, nilai 1 sampai 3) wajib dinyatakan dan dipertahankan dari awal hingga akhir. Aplikasi ini: 1 / 1 / 1.
- **Tuas:** satu titik fokus per layar; kontras hierarkis (ukuran, ketebalan, warna); whitespace sebagai struktur; **satu aksen sengaja** (emerald); **motif identitas** (penanda aksen kiri 3px, Bagian 3).
- **Pembacaan Desain** dinyatakan sebelum generate (Bagian 2).

---

## 9. Delivery Gate (wajib sebelum menyerahkan)

Sertakan **laporan PASS/FAIL**, satu baris per item, setiap `PASS` didukung bukti konkret (contoh: "R-26 PASS: semua tombol punya `onClick`/`href` nyata; tidak ada kontrol mati"). Satu `FAIL` berarti perbaiki dulu, jalankan ulang, baru kirim.

**Blok 1: Hard Gate (semua harus TIDAK)**
- [ ] Ada em dash di teks mana pun? (R-02)
- [ ] Ada overflow horizontal / layout rusak di 360px? (R-03)
- [ ] Ada statistik tanpa sumber nyata? (R-17)
- [ ] Ada testimonial fiktif? (R-18)
- [ ] Ada aset (logo, avatar, angka, navigasi) dibuat tanpa konfirmasi atau placeholder jujur? (R-23)
- [ ] Ada link nav ke halaman yang tidak ada? (R-24)
- [ ] Ada teks di bawah kontras AA? (R-25)
- [ ] Ada tombol/dropdown/form tanpa perilaku nyata? (R-26)
- [ ] Ada UI data tanpa empty/loading/error state? (R-27)
- [ ] Ada FAQ generik? (R-28)
- [ ] Ada UI yang tidak bisa dinavigasi keyboard atau tanpa fokus terlihat? (R-32)
- [ ] Ada fitur dari patching via skrip? (R-33)
- [ ] Ada mode tema yang merusak tampilan? (R-34)
- [ ] App belum dijalankan/di-build dan diuji? (R-35)
- [ ] Ada klaim keamanan/kepatuhan/performa karangan? (R-36)
- [ ] Dibangun tanpa arah, atau tanpa label "draf tanpa arah"? (R-37)
- [ ] Ada konten realistis yang dikarang? (R-38)
- [ ] Ada emoji di UI, copy, atau kode? (aturan proyek)
- [ ] Ada otorisasi yang hanya dijaga di UI, bukan di server? (aturan proyek)

**Blok 2: Purpose-Gate (FAIL bila default tanpa tujuan tertulis)**
- [ ] Gradient/glow tanpa tujuan? (R-01)
- [ ] Ikon generik atau tidak relevan? (R-04)
- [ ] Typeface/uppercase tracking tanpa alasan? (R-06)
- [ ] Background grid tanpa tujuan? (R-07)
- [ ] Arrow dekoratif? (R-08)
- [ ] Badge tanpa fungsi nyata? (R-09)
- [ ] Glassmorphism di lebih dari 1-2 elemen? (R-10)
- [ ] Shadow di semua komponen? (R-12)
- [ ] Glow berlapis? (R-13)
- [ ] Semua kartu identik tanpa alasan hierarchy? (R-14)
- [ ] Animasi template atau bertentangan dengan GERAK 1? (R-19)
- [ ] Ilustrasi generik? (R-22)

**Blok 3: Liveliness (semua harus YA)**
- [ ] Dial ditetapkan dan eksplisit?
- [ ] Output konsisten dengan dial?
- [ ] Ada satu titik fokus jelas per layar?
- [ ] Whitespace bersifat struktural?
- [ ] Ada satu aksen sengaja (bukan nol, bukan di mana-mana)?
- [ ] Ada motif identitas yang diulang?
- [ ] Pembacaan Desain dinyatakan sebelum generate?

**Blok 4: Craftsmanship dan Quality Locks (semua harus TIDAK)**
- [ ] C-1: keputusan yang satu-satunya alasannya "default AI"?
- [ ] C-2: elemen interaktif tak berfungsi tanpa label?
- [ ] C-3: section pengisi template?
- [ ] C-4: UI rusak di state/breakpoint/tanpa mouse?
- [ ] C-5: klaim, angka, atau testimoni karangan?
- [ ] Layout mengikuti template AI? (R-05)
- [ ] Semua elemen berbentuk pil? (R-11)
- [ ] CTA generik? (R-15)
- [ ] Buzzword? (R-16)
- [ ] Desain tetap generik bila logo dan nama diganti? (R-20)
- [ ] Palet melebihi 2-3 inti + 1 aksen? (R-29)
- [ ] Terlihat seperti clone produk populer? (R-30)
- [ ] Ada keputusan utama yang alasannya tak bisa ditulis satu baris? (R-31)

**Verifikasi tambahan untuk fitur Bagian 5**
- [ ] Chart dashboard menampilkan data nyata, memperbarui real-time, dan punya empty/loading/error state?
- [ ] Ekspor menghasilkan berkas benar untuk setiap kombinasi cakupan dan waktu, dengan pratinjau jumlah?
- [ ] Cadangan JSON dapat diunduh, diunggah kembali (dry run + konfirmasi), dan hasil impor diverifikasi?
- [ ] Hapus data menampilkan jumlah, menawarkan cadangan, meminta ketik "HAPUS", dan tercatat di log?

---

## 10. Pertanyaan Terbuka (tanyakan ke user sebelum bagian terkait)
1. Versi Tailwind (v3 atau v4) dan backend yang dipakai (Supabase atau lainnya)? Dicek otomatis dari kode bila memungkinkan.
2. Dimensi kategorikal apa dari form yang layak dijadikan diagram donat (status, kondisi, kategori outlet)?
3. Apa saja 9 field survei (jenis: teks, pilihan, foto, GPS)? Menentukan satu halaman atau stepper.
4. Foto survei disimpan di mana, dan apakah perlu ikut dicadangkan atau cukup referensi?
5. Apakah "Ardi Survey" nama final, dan kapan logo tersedia?
6. Apakah fitur offline cukup draf lokal + kirim ulang manual, atau perlu antrean otomatis?
7. Berapa lama masa pemulihan soft delete yang diinginkan (default 30 hari)?
