/**
 * constants.js
 * ----------------------------------------------------------------------
 * Nilai konstan yang dipakai di berbagai modul, agar konsisten
 * dan mudah diubah dari satu tempat.
 * ----------------------------------------------------------------------
 */

export const ACTIVITY_CATEGORIES = [
  "Meeting",
  "Webinar",
  "Workshop",
  "Monitoring",
  "Survey",
  "Pelatihan",
  "Sosialisasi",
  "Administrasi",
  "Kunjungan",
  "Lainnya",
];

export const ACTIVITY_STATUSES = [
  { value: "belum_dimulai", label: "Belum Dimulai", badge: "gray" },
  { value: "sedang_berjalan", label: "Sedang Berjalan", badge: "blue" },
  { value: "selesai", label: "Selesai", badge: "green" },
  { value: "ditunda", label: "Ditunda", badge: "amber" },
  { value: "dibatalkan", label: "Dibatalkan", badge: "red" },
];

export const ACTIVITY_PRIORITIES = [
  { value: "rendah", label: "Rendah", badge: "gray" },
  { value: "sedang", label: "Sedang", badge: "blue" },
  { value: "tinggi", label: "Tinggi", badge: "amber" },
  { value: "sangat_penting", label: "Sangat Penting", badge: "red" },
];

export const ACTIVITY_COLORS = [
  { value: "blue", label: "Biru" },
  { value: "green", label: "Hijau" },
  { value: "amber", label: "Kuning" },
  { value: "red", label: "Merah" },
  { value: "purple", label: "Ungu" },
  { value: "gray", label: "Abu-abu" },
];

export const REPEAT_OPTIONS = [
  { value: "none", label: "Tidak Berulang" },
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
  { value: "yearly", label: "Tahunan" },
];

export const REMINDER_OPTIONS = [
  { value: 15, label: "15 menit sebelum" },
  { value: 30, label: "30 menit sebelum" },
  { value: 60, label: "1 jam sebelum" },
  { value: 120, label: "2 jam sebelum" },
  { value: 1440, label: "1 hari sebelum" },
  { value: 2880, label: "2 hari sebelum" },
  { value: 10080, label: "1 minggu sebelum" },
];

export const ATTENDANCE_STATUSES = [
  { value: "hadir", label: "Hadir", badge: "green" },
  { value: "izin", label: "Izin", badge: "blue" },
  { value: "sakit", label: "Sakit", badge: "amber" },
  { value: "dinas_luar", label: "Dinas Luar", badge: "purple" },
  { value: "wfh", label: "WFH", badge: "teal" },
  { value: "cuti", label: "Cuti", badge: "gray" },
  { value: "tanpa_keterangan", label: "Tanpa Keterangan", badge: "red" },
];

export const MAX_ACTIVITIES_PER_DAY = 100;

export const APP_NAME = "TNCschedule";
export const ORG_NAME = "The Nature Conservancy Indonesia";
