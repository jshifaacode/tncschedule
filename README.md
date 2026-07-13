# TNCschedule

Aplikasi internal staff scheduling, shared calendar, dan absensi untuk **The Nature Conservancy Indonesia**. Dibangun sebagai Multi-Page Application dengan HTML5, CSS3, dan Vanilla JavaScript (ES Modules) — **tanpa framework, tanpa build tool** — didukung oleh Firebase (Authentication, Cloud Firestore, Storage).

---

## 📌 Status Proyek

Ini adalah **fondasi arsitektur production-quality**, bukan implementasi 100% lengkap dari seluruh spesifikasi yang diminta (yang mencakup puluhan fitur — evaluasi harian, tag, drag & drop kalender, kalender libur nasional, pengelolaan aset, PWA, Cloud Functions untuk reminder, dsb.). Yang **sudah terimplementasi penuh dan siap dipakai**:

| Fitur | Status |
|---|---|
| Autentikasi (Login, Register, Google Sign-In, Lupa Sandi, Remember Me) | ✅ Selesai |
| Shared Calendar realtime (Month/List/Card/Table view, filter, live search) | ✅ Selesai |
| CRUD Kegiatan lengkap (deteksi konflik jadwal, duplikat, arsip, favorit) | ✅ Selesai |
| Absensi (absen masuk/keluar, status non-hadir, rekap, statistik, export) | ✅ Selesai |
| Dashboard realtime (statistik, kalender mini, feed aktivitas, status staff) | ✅ Selesai |
| Data Staff (direktori, live search, detail staff & statistik kontribusi) | ✅ Selesai |
| Profil & Pengaturan (edit profil, ganti foto, ganti password/email, tema) | ✅ Selesai |
| Notification Center realtime | ✅ Selesai |
| Komentar (thread reply, edit, hapus) & Evaluasi harian — modul logika | ✅ Selesai (siap dipasang ke halaman detail kegiatan) |
| Activity Log & Audit Trail otomatis pada setiap CRUD | ✅ Selesai |
| Export laporan (Excel, CSV; PDF via helper siap pakai) | ✅ Selesai |
| Firestore & Storage Security Rules | ✅ Selesai |
| Offline persistence (Firestore local cache, multi-tab) | ✅ Selesai |
| Light/Dark mode | ✅ Selesai |
| Responsif: Sidebar (desktop) / Bottom Navigation + FAB (mobile) | ✅ Selesai |
| Drag & drop kalender, kalender libur nasional, pengelolaan aset, PWA, Cloud Functions reminder, mention staff, shortcut keyboard | ⏳ Belum — lihat `ROADMAP.md` |

Struktur kode sudah dirancang agar fitur-fitur yang belum ada dapat ditambahkan tanpa perombakan besar (lihat `ARCHITECTURE.md`).

---

## 🧱 Teknologi

- **Frontend:** HTML5, CSS3 (custom design system, tanpa framework CSS), Vanilla JavaScript ES6+ (ES Modules)
- **Backend:** Firebase — Authentication, Cloud Firestore (realtime + offline persistence), Storage
- **Library ringan (via CDN, tanpa npm):** Chart.js (grafik), SheetJS (export Excel), jsPDF (export PDF)
- **Tidak ada:** React, Vue, Angular, Svelte, Vite, bundler, atau proses build apa pun.

---

## 🚀 Cara Menjalankan (Development)

1. Buka folder `TNCschedule/` di Visual Studio Code.
2. Install ekstensi **Live Server** (oleh Ritwick Dey) bila belum ada.
3. Klik kanan pada `index.html` (atau `login.html`) → **Open with Live Server**.
4. Website langsung berjalan di `http://127.0.0.1:5500` (atau port lain sesuai konfigurasi Live Server Anda).

Tidak perlu `npm install`, `npm run dev`, atau server development lain.

> **Catatan penting:** Karena file JS menggunakan `type="module"`, membuka file HTML langsung dari `file://` (double-click) **tidak akan berfungsi** karena browser memblokir ES Modules dari origin lokal. Anda **wajib** menjalankannya melalui server lokal seperti Live Server.

---

## 🔥 Menghubungkan Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/) → buat project baru bernama `tncschedule` (atau nama lain).
2. Aktifkan layanan berikut di sidebar Firebase Console:
   - **Authentication** → tab *Sign-in method* → aktifkan **Email/Password** dan **Google**.
   - **Firestore Database** → buat database (mode production).
   - **Storage** → aktifkan bucket default.
3. Di *Project Settings* → *General* → *Your apps*, tambahkan **Web App** baru, lalu salin objek konfigurasi yang diberikan.
4. Buka `js/firebase/firebase-config.js` di project ini, dan ganti nilai berikut dengan kredensial Anda:

   ```js
   const firebaseConfig = {
     apiKey: "GANTI_DENGAN_API_KEY_ANDA",
     authDomain: "tncschedule.firebaseapp.com",
     projectId: "tncschedule",
     storageBucket: "tncschedule.appspot.com",
     messagingSenderId: "GANTI_DENGAN_SENDER_ID",
     appId: "GANTI_DENGAN_APP_ID",
   };
   ```

5. Deploy Security Rules (lihat bagian *Deployment* di bawah), atau salin-tempel isi `firestore.rules` dan `storage.rules` secara manual ke tab *Rules* pada Firebase Console.

6. Letakkan file logo resmi TNC (PNG) di `assets/logo/tnc-logo.png`. Seluruh halaman sudah mereferensikan path ini (dengan fallback otomatis tersembunyi bila file belum ada, agar layout tidak rusak).

---

## 📁 Struktur Folder

```
TNCschedule/
├── index.html                 # Entry point, redirect berdasarkan status login
├── login.html
├── register.html
├── forgot-password.html
├── dashboard.html
├── calendar.html               # Shared Calendar (fitur inti)
├── attendance.html
├── staff.html
├── staff-detail.html
├── profile.html
├── settings.html
├── notifications.html
│
├── firebase.json               # Konfigurasi deployment Firebase Hosting/Rules
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
│
├── assets/
│   ├── logo/                   # Taruh tnc-logo.png di sini
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── css/
│   ├── variables.css           # Design tokens (warna, spacing, radius, shadow)
│   ├── reset.css
│   ├── global.css
│   ├── layout.css              # App shell: sidebar, header, bottom nav
│   ├── components.css          # Button, card, badge, modal, toast, dll.
│   ├── auth.css
│   ├── dashboard.css
│   ├── calendar.css
│   ├── attendance.css
│   ├── profile.css
│   ├── animation.css
│   ├── theme.css               # Transisi light/dark
│   └── responsive.css
│
├── js/
│   ├── app.js                  # Bootstrap halaman terautentikasi
│   │
│   ├── firebase/
│   │   ├── firebase-config.js  # Inisialisasi tunggal Firebase
│   │   ├── auth.js             # Login, register, Google, logout, reset password
│   │   ├── firestore.js        # Lapisan akses data generik + realtime listener
│   │   └── storage.js          # Upload/validasi/hapus file
│   │
│   ├── modules/                # Logika bisnis per fitur (tidak menyentuh DOM)
│   │   ├── activities.js       # CRUD kegiatan, deteksi konflik jadwal
│   │   ├── calendar.js         # Kalkulasi grid kalender (pure functions)
│   │   ├── attendance.js       # Absen masuk/keluar, rekap, statistik
│   │   ├── comments.js         # Komentar & thread reply
│   │   ├── evaluations.js      # Evaluasi harian
│   │   ├── notifications.js    # Notification Center
│   │   ├── staff.js            # Direktori staff
│   │   ├── export.js           # Export Excel/CSV/PDF
│   │   ├── charts.js           # Wrapper Chart.js
│   │   ├── search.js           # Global search & live search
│   │   ├── settings.js         # Ganti password/email, preferensi
│   │   │
│   │   └── *-page.js           # Pengontrol tiap halaman (menghubungkan modul
│   │                            # bisnis di atas ke DOM). Dipisah dari modul
│   │                            # bisnis murni agar logika tetap reusable &
│   │                            # mudah diuji terpisah dari manipulasi DOM.
│   │
│   ├── components/              # UI reusable
│   │   ├── sidebar.js
│   │   ├── bottom-navbar.js
│   │   ├── modal.js
│   │   ├── dialog.js
│   │   ├── toast.js
│   │   ├── skeleton.js
│   │   ├── cards.js
│   │   └── table.js
│   │
│   └── utils/
│       ├── helper.js           # DOM helper, debounce, escapeHtml, dll.
│       ├── formatter.js        # Format tanggal/waktu/ukuran file (Bahasa Indonesia)
│       ├── validator.js        # Validasi form reusable
│       ├── router.js           # Highlight nav aktif (BUKAN client-side router)
│       ├── constants.js        # Kategori, status, prioritas, dll.
│       └── storage.js          # Wrapper localStorage untuk preferensi UI
│
└── docs/                       # (opsional) dokumentasi tambahan
```

**Catatan desain arsitektur:** Spesifikasi asli meminta file `js/modules/dashboard.js` dan `js/modules/profile.js` sebagai pengontrol halaman. Pada implementasi ini, nama-nama tersebut diberi akhiran `-page.js` (misal `dashboard-page.js`, `calendar-page.js`) untuk membedakan secara eksplisit antara **modul logika bisnis murni** (`activities.js`, `attendance.js` — dapat dites tanpa DOM) dan **pengontrol halaman** (`*-page.js` — mengikat modul bisnis ke elemen DOM spesifik). Pemisahan ini sejalan dengan prinsip Separation of Concerns yang diminta.

---

## 🗄️ Struktur Firestore

| Koleksi | Deskripsi | Dokumen kunci |
|---|---|---|
| `users` | Profil staff, otomatis terisi saat registrasi | ID = `uid` Firebase Auth |
| `activities` | Kegiatan pada Shared Calendar | Field penting: `date` (YYYY-MM-DD), `startTime`/`endTime` (HH:MM), `isArchived`, `status`, `priority` |
| `activities/{id}/comments` | Subcollection komentar per kegiatan | Field `parentId` untuk reply thread |
| `activities/{id}/evaluations` | Subcollection evaluasi harian per kegiatan | |
| `activities/{id}/attachments` | Metadata lampiran (file fisik di Storage) | |
| `attendance` | Absensi harian | ID = `${uid}_${YYYY-MM-DD}` — satu dokumen per staff per hari |
| `notifications` | Notifikasi per staff | Field `recipientId` |
| `activityLogs` | Audit Trail, append-only dari client | Dicatat otomatis oleh `writeActivityLog()` di setiap create/update/delete |
| `bookmarks` | Kegiatan favorit per staff | |
| `settings` | Preferensi akun (tema, notifikasi) | ID = `uid` |

Lihat `firestore.indexes.json` untuk composite index yang dibutuhkan oleh query gabungan (misal `isArchived` + `date`). Jalankan `firebase deploy --only firestore:indexes` atau biarkan Firebase Console menyarankan index otomatis saat query pertama kali gagal di production.

---

## 🚢 Deployment

### Opsi 1: Firebase Hosting (direkomendasikan, satu ekosistem dengan backend)

```bash
npm install -g firebase-tools   # sekali saja, alat CLI (bukan dependency project)
firebase login
firebase init                  # pilih Hosting, Firestore, Storage; pilih project yang sudah dibuat
firebase deploy
```

### Opsi 2: Netlify / Vercel (drag-and-drop, tanpa CLI)

Karena project ini adalah static site murni (tanpa build step), cukup upload seluruh folder ke Netlify/Vercel sebagai *static site* — tidak perlu mengatur build command apa pun (kosongkan build command, set publish directory ke root folder).

### Deploy Security Rules saja

```bash
firebase deploy --only firestore:rules,storage:rules
```

---

## 🔒 Keamanan

- Semua akses Firestore & Storage mewajibkan autentikasi (`request.auth != null`).
- Dokumen `users/{uid}` dan `attendance` hanya dapat ditulis oleh pemiliknya sendiri (mencegah staff memalsukan data staff lain).
- `activityLogs` bersifat **append-only** dari client — tidak dapat diedit/dihapus, menjaga integritas Audit Trail.
- Validasi tipe & ukuran file dilakukan dua lapis: client (`storage.js`) dan server (`storage.rules`).
- Kata sandi tidak pernah disimpan sendiri — sepenuhnya dikelola Firebase Authentication.

**Sebelum go-live**, jalankan Firebase Emulator Suite (`firebase emulators:start`) untuk menguji Security Rules secara lokal sebelum deploy ke production.

---

## 🧪 Pengujian Manual yang Disarankan

Sebelum digunakan oleh seluruh staff, uji alur berikut:

- [ ] Register akun baru → muncul otomatis di halaman Data Staff
- [ ] Login dengan email/password dan Google
- [ ] Lupa kata sandi → email reset diterima
- [ ] Tambah kegiatan dengan waktu bentrok → muncul peringatan konflik
- [ ] Edit kegiatan dari satu browser → perubahan muncul realtime di browser lain (tanpa refresh)
- [ ] Absen masuk & keluar → muncul di widget Dashboard & halaman Absensi secara realtime
- [ ] Export rekap absensi ke Excel & CSV
- [ ] Ganti tema light/dark → tersimpan setelah reload
- [ ] Buka di ukuran layar mobile → Sidebar hilang, Bottom Navigation + FAB muncul
- [ ] Matikan koneksi internet sebentar → data yang sudah dimuat tetap terlihat (offline persistence)

---

## 🛣️ Pengembangan Selanjutnya

Lihat `ROADMAP.md` untuk daftar fitur dari spesifikasi asli yang belum diimplementasikan beserta catatan teknis untuk menambahkannya.
