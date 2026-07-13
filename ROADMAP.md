# Roadmap Pengembangan Selanjutnya

Fitur dari spesifikasi asli yang **belum** diimplementasikan pada fondasi ini, diurutkan berdasarkan kompleksitas. Setiap item menyertakan catatan teknis singkat untuk memudahkan implementasi.

## Prioritas Tinggi (memperkaya fitur inti yang sudah ada)

- [ ] **Halaman detail kegiatan dengan Timeline Aktivitas** — gabungkan `comments.js`, `evaluations.js`, dan `activityLogs` menjadi satu tampilan kronologis di dalam modal detail kegiatan (`calendar-page.js` → `openActivityDetail()`).
- [ ] **Upload dokumentasi & lampiran** di dalam modal detail kegiatan — modul `storage.js` sudah siap (`uploadFile()`, `validateFile()`); tinggal menambahkan elemen `<input type="file">` dan progress bar di form modal.
- [ ] **Week View & Day View** pada Kalender — struktur data (`generateWeekGrid()` di `calendar.js`) sudah tersedia; tinggal membuat renderer HTML mengikuti pola `renderMonthView()` di `calendar-page.js`, memakai class CSS yang sudah disiapkan di `calendar.css` (`.cal-time-grid`, `.cal-week-columns`, dst.).
- [ ] **Global Search modal (Ctrl+K)** — `search.js` sudah punya fungsi `globalSearch()`; tinggal membuat komponen modal pencarian yang dipanggil dari tombol lup di header setiap halaman.
- [ ] **Arsip Kegiatan (halaman terpisah)** — `activities.js` sudah punya `getArchivedActivities()`, `setActivityArchived()`; tinggal membuat `archive.html` + `archive-page.js` mengikuti pola halaman lain.
- [ ] **Bookmark & Favorit (halaman daftar)** — koleksi `bookmarks` sudah ada di Security Rules; tambahkan fungsi CRUD di modul baru `js/modules/bookmarks.js`.

## Prioritas Menengah

- [ ] **Drag & drop kegiatan di kalender** — gunakan HTML5 Drag and Drop API pada `.cal-day-cell`, panggil `updateActivity(id, {date: newDateKey}, actor, previousData)` saat drop.
- [ ] **Kalender Hari Libur Nasional** — tambahkan koleksi Firestore baru `holidays` (atau data statis JSON lokal untuk hari libur Indonesia), tandai sel kalender dengan class `.is-holiday` (sudah ada di `calendar.css`).
- [ ] **Mention staff di komentar (@nama)** — tambahkan parser sederhana di `comments.js` yang mendeteksi pola `@Nama`, mencocokkan dengan `staffList`, dan memanggil `pushNotification()` ke staff yang di-mention.
- [ ] **Shortcut keyboard** (Ctrl+K, N, Esc) — tambahkan listener global di `app.js` yang memicu Global Search / modal tambah kegiatan / menutup modal aktif.
- [ ] **Pengelolaan Aset** (ruang rapat, kendaraan, dst.) — koleksi Firestore baru `assets`, field `bookedActivityId` + `bookedDate` untuk deteksi konflik pemakaian, mirip pola `findScheduleConflicts()` di `activities.js`.
- [ ] **Personalisasi Dashboard** (drag widget, sembunyikan widget) — simpan urutan/visibility widget di `settings/{uid}.dashboardLayout`, baca saat `dashboard-page.js` bootstrap.

## Prioritas Rendah / Jangka Panjang

- [ ] **Progressive Web App (PWA)** — tambahkan `manifest.json` + Service Worker (`sw.js`) untuk caching aset statis dan kemampuan "Add to Home Screen".
- [ ] **Reminder otomatis via Cloud Functions** — buat Cloud Function terjadwal (Cloud Scheduler, tiap 5–15 menit) yang query kegiatan dengan `reminderMinutes` yang jatuh tempo, lalu memanggil `pushNotification()`.
- [ ] **Push Notification via Firebase Cloud Messaging** — untuk notifikasi meski aplikasi tidak sedang dibuka (berbeda dari Notification API browser yang hanya bekerja saat tab terbuka).
- [ ] **Integrasi Google Calendar / Outlook Calendar** — sinkronisasi dua arah, kemungkinan besar butuh Cloud Functions + OAuth terpisah dari Firebase Auth.
- [ ] **QR Code untuk absensi** — gunakan library ringan seperti `qrcode.js` (dapat dimuat via CDN) untuk generate & scan QR di halaman Absensi.
- [ ] **Dashboard analitik lanjutan** — grafik trend multi-bulan, perbandingan antar divisi (jika field `division` mulai dipakai secara konsisten).
- [ ] **Multi-bahasa (i18n)** — ekstrak seluruh string Bahasa Indonesia yang saat ini hardcoded di file `*-page.js` dan HTML ke file kamus JSON (`lang/id.json`, `lang/en.json`), buat helper `t(key)` sederhana di `utils/i18n.js`.

## Catatan Migrasi Data

Jika fitur baru menambah field pada dokumen yang sudah ada (misal menambahkan `assets: string[]` pada `activities`), pastikan:
1. Field baru diberi nilai default yang aman (`|| []`, `|| ""`) di seluruh tempat yang membaca dokumen lama, karena dokumen lama tidak akan otomatis memiliki field baru tersebut.
2. Perbarui `firestore.rules` bila field baru perlu divalidasi.
3. Perbarui bagian "Struktur Firestore" di `README.md`.
