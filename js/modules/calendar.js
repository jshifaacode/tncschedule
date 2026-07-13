/**
 * calendar.js
 * ----------------------------------------------------------------------
 * Logika murni untuk menghasilkan struktur grid kalender (Month/Week/Day)
 * dan navigasi tanggal. Tidak menyentuh Firestore — hanya kalkulasi
 * tanggal. Rendering DOM dilakukan oleh halaman calendar.html melalui
 * import fungsi-fungsi ini.
 * ----------------------------------------------------------------------
 */

import { toDateKey, DAY_NAMES, MONTH_NAMES } from "../utils/formatter.js";

/**
 * Menghasilkan array 42 sel (6 minggu) untuk tampilan Month View,
 * termasuk sel bulan sebelumnya/berikutnya untuk mengisi grid.
 * @param {number} year
 * @param {number} month - 0-indexed (0 = Januari)
 * @returns {Array<{date: Date, dateKey: string, isCurrentMonth: boolean}>}
 */
export function generateMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0 = Minggu
  const gridStart = new Date(year, month, 1 - startOffset);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    cells.push({
      date,
      dateKey: toDateKey(date),
      isCurrentMonth: date.getMonth() === month,
    });
  }
  return cells;
}

/** Menghasilkan 7 tanggal untuk Week View, dimulai dari hari Minggu pada minggu yang mengandung `date`. */
export function generateWeekGrid(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, dateKey: toDateKey(d) };
  });
}

/** Label judul kalender, misal "Juli 2026". */
export function getMonthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

/** Mengelompokkan array kegiatan berdasarkan tanggal (untuk List/Agenda View). */
export function groupActivitiesByDate(activities) {
  const groups = {};
  for (const activity of activities) {
    const key = activity.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(activity);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, items]) => ({ dateKey, items }));
}

/** Mengelompokkan kegiatan per tanggal untuk cepat dicocokkan dengan sel Month Grid (Map dateKey -> array). */
export function indexActivitiesByDate(activities) {
  const map = new Map();
  for (const activity of activities) {
    const key = activity.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(activity);
  }
  return map;
}

export { DAY_NAMES, MONTH_NAMES };

/** Menambah/mengurangi bulan dari sebuah Date, mengembalikan Date baru. */
export function addMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

/** Menambah/mengurangi hari dari sebuah Date, mengembalikan Date baru. */
export function addDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

/** Mengecek apakah dua tanggal adalah hari yang sama. */
export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}
