# Arsitektur TNCschedule

Dokumen ini menjelaskan keputusan arsitektur utama dan alasannya, untuk membantu developer lain (atau Anda sendiri di masa depan) memahami dan mengembangkan proyek ini dengan aman.

## 1. Multi-Page Application, bukan SPA

Setiap fitur utama adalah file `.html` terpisah (`dashboard.html`, `calendar.html`, dst.), bukan satu halaman dengan client-side router. Ini adalah **requirement eksplisit** dari spesifikasi (dijalankan via Live Server tanpa build tool), dan juga menyederhanakan mental model: setiap halaman = satu titik masuk, satu skrip pengontrol (`*-page.js`).

Konsekuensi: navigasi antar halaman memicu full page reload. Ini secara sengaja diterima sebagai trade-off untuk kesederhanaan dan kepatuhan pada requirement "tanpa build tool". `js/utils/router.js` sengaja diberi komentar tegas bahwa ia BUKAN client-side router — hanya membantu highlight menu aktif.

## 2. Pemisahan "Modul Bisnis" vs "Pengontrol Halaman"

- **Modul bisnis** (`js/modules/activities.js`, `attendance.js`, `calendar.js`, dll.) — fungsi murni atau fungsi yang hanya berinteraksi dengan Firebase, TIDAK menyentuh `document` atau elemen DOM. Modul-modul ini dapat dipakai ulang dari halaman mana pun dan (secara prinsip) dapat diuji tanpa browser.
- **Pengontrol halaman** (`js/modules/*-page.js`) — satu-satunya lapisan yang boleh memanggil `document.querySelector`, memasang event listener, dan merender HTML. Setiap file `*-page.js` hanya dimuat oleh satu halaman HTML yang sesuai.

Aturan ini menegakkan Separation of Concerns: jika suatu saat UI perlu dirombak total, seluruh logika Firestore/bisnis di `js/modules/*.js` (non-page) tidak perlu disentuh.

## 3. Firestore sebagai Single Source of Truth, Realtime by Default

Hampir seluruh pembacaan data pada halaman yang butuh sinkronisasi (Dashboard, Kalender, Absensi, Notifikasi) menggunakan `onSnapshot` melalui `listenCollection()`/`listenDoc()` di `firestore.js`, bukan `getDocs()` sekali jalan. Ini memenuhi requirement realtime collaboration di spesifikasi: perubahan oleh satu staff langsung terlihat oleh staff lain tanpa refresh.

Pengecualian yang sengaja menggunakan `getCollectionOnce()` (bukan realtime): rekap absensi dengan rentang tanggal custom, statistik profil/staff, dan export laporan — karena data ini bersifat snapshot-in-time, dan realtime listener untuk rentang tanggal yang sering berubah-ubah justru boros koneksi.

**Wajib**: setiap pemanggilan `listenCollection`/`listenDoc` mengembalikan fungsi `unsubscribe`. Setiap file `*-page.js` mengumpulkan seluruh unsubscribe ke array `unsubscribers` dan memanggilnya saat `beforeunload`. Jangan lupa pola ini saat menambah listener baru — melupakannya menyebabkan memory leak dan biaya baca Firestore yang tidak perlu.

## 4. Struktur Dokumen Firestore: Kompromi antara Fleksibilitas dan Kesederhanaan

- `activities` adalah koleksi datar (bukan dikelompokkan per bulan/tahun) dengan field `date` string `"YYYY-MM-DD"`. Ini memudahkan query rentang tanggal (`where("date", ">=", ...)`) tanpa perlu mem-parsing Timestamp Firestore yang lebih rumit untuk perbandingan string sederhana. Trade-off: field `date` harus selalu konsisten formatnya — divalidasi lewat `<input type="date">` di form.
- `comments` dan `evaluations` adalah **subcollection** di bawah `activities/{id}`, bukan koleksi terpisah dengan field `activityId`. Alasan: akses selalu dalam konteks satu kegiatan (tidak pernah butuh query "semua komentar lintas kegiatan"), sehingga subcollection lebih bersih dan otomatis ter-scope oleh Security Rules per-kegiatan.
- `attendance` menggunakan ID dokumen custom `${uid}_${date}` (bukan auto-ID) secara sengaja, agar `setDoc(..., {merge:true})` bisa dipanggil berkali-kali sepanjang hari (absen masuk pagi, absen keluar sore) tanpa menciptakan dua dokumen terpisah atau butuh query untuk menemukan dokumen yang sudah ada.

## 5. Keamanan Berlapis

1. **UI/UX layer** (`validator.js`) — mencegah submit form yang jelas salah, demi pengalaman pengguna yang baik.
2. **Client business logic layer** (`storage.js` — `validateFile()`) — validasi tipe/ukuran file sebelum upload dimulai, menghemat bandwidth.
3. **Server layer** (`firestore.rules`, `storage.rules`) — lapisan yang SESUNGGUHNYA menegakkan keamanan. Dua lapis sebelumnya adalah kenyamanan, bukan keamanan — siapa pun bisa memanggil Firestore API langsung tanpa lewat UI ini.

**Jangan pernah** menganggap validasi di `validator.js` atau `storage.js` cukup untuk keamanan produksi. Selalu perbarui `firestore.rules`/`storage.rules` setiap kali menambah field atau collection baru yang sensitif.

## 6. CSS: Design Tokens + Utility Kecil, Bukan Framework Utility Penuh

`variables.css` mendefinisikan seluruh token (warna, spasi, radius, shadow) sebagai CSS Custom Properties. File CSS lain (`components.css`, `layout.css`, dst.) mengonsumsi token ini. Pendekatan ini dipilih alih-alih framework seperti Bootstrap (dilarang eksplisit oleh spesifikasi) atau utility-class penuh seperti Tailwind (butuh build step), agar:

- Tema light/dark tinggal mengganti nilai variable di `[data-theme="dark"]`, tanpa duplikasi class.
- Konsistensi visual (radius, shadow, warna) terjamin karena satu sumber kebenaran.
- Tetap murni CSS3, sesuai requirement "tanpa framework CSS".

## 7. Mengapa Detail Kegiatan Berupa Modal, Bukan Halaman Terpisah

Spesifikasi menyebut "detail kegiatan" tanpa secara eksplisit mewajibkan halaman `.html` terpisah. Modal dipilih karena:

- Kegiatan paling sering dibuka dari dalam konteks kalender (klik chip event) — modal mempertahankan konteks bulan/minggu yang sedang dilihat pengguna, sesuai prinsip UX "jangan hilangkan konteks pengguna".
- Menghindari perlu meneruskan state kalender (bulan aktif, filter aktif) melalui query string ke halaman detail terpisah lalu kembali lagi.

Jika kebutuhan berkembang (misal ingin detail kegiatan bisa di-*share* via URL langsung), pertimbangkan membuat `activity-detail.html?id=xxx` yang memanggil ulang `openActivityDetail()` dari `calendar-page.js` — logika modal & fetch data sudah reusable, tinggal dipindah ke `js/components/activity-detail-modal.js` agar dapat diimpor dari halaman baru tersebut.

## 8. Keterbatasan yang Diketahui (Known Limitations)

- **Live Search saat ini bersifat client-side** (mencari di data yang sudah dimuat di memori), bukan full-text search server-side. Ini cukup untuk skala data internal perusahaan (ratusan–ribuan dokumen), tapi tidak akan scale ke jutaan dokumen. Jika suatu saat dibutuhkan, pertimbangkan integrasi Algolia atau Typesense.
- **Reminder & notifikasi otomatis berbasis waktu** (misal "1 jam sebelum kegiatan dimulai") membutuhkan proses backend terjadwal (Cloud Functions + Cloud Scheduler, atau Cloud Tasks) yang BELUM diimplementasikan di fondasi ini — field `reminderMinutes` sudah tersimpan di setiap kegiatan, tinggal menyambungkan Cloud Function yang membaca field ini dan memanggil `pushNotification()`.
- **Drag & drop kalender** belum diimplementasikan; `updateActivity()` di `activities.js` sudah siap dipanggil dari handler drag-drop kapan pun ditambahkan.
