# TODO
- [x] Identifikasi query Firestore yang memicu error index pada `listenActivitiesByMonth()`.
- [x] Tambahkan perbaikan UI minor (tampilkan PIC + link meeting di card/list) di `js/modules/calendar-page.js`.
- [ ] Perbaiki deployment index agar composite index `activities` benar-benar ter-enable (CLI deploy sebelumnya gagal dengan error 400 terkait index attendance).
- [ ] Pastikan tombol modal (Tambah/Batal) kembali responsif setelah index query bulan berhasil.

## Catatan
- Jika CLI deploy masih gagal karena index non-perlu, lakukan pembuatan index secara manual lewat Firebase Console atau koreksi `firestore.indexes.json` (hanya composite index yang memang diperlukan).
