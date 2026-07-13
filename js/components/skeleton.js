/**
 * skeleton.js
 * ----------------------------------------------------------------------
 * Generator markup skeleton loading untuk berbagai bentuk konten,
 * dipakai saat menunggu data pertama kali datang dari Firestore.
 * ----------------------------------------------------------------------
 */

/** Skeleton untuk baris list/card sederhana (avatar + 2 baris teks). */
export function skeletonListRow() {
  return `
    <div class="flex items-center gap-3" style="padding: 12px 0;">
      <div class="skeleton skeleton-avatar" style="width:40px;height:40px;"></div>
      <div style="flex:1;">
        <div class="skeleton skeleton-text" style="width:60%;"></div>
        <div class="skeleton skeleton-text" style="width:35%;"></div>
      </div>
    </div>
  `;
}

/** Mengulang skeletonListRow sebanyak n kali. */
export function skeletonList(n = 4) {
  return Array.from({ length: n }, skeletonListRow).join("");
}

/** Skeleton untuk stat card dashboard. */
export function skeletonStatCard() {
  return `
    <div class="stat-card">
      <div class="skeleton skeleton-text" style="width:50%;"></div>
      <div class="skeleton" style="height:28px;width:70%;margin-top:8px;"></div>
    </div>
  `;
}

/** Skeleton untuk grid kalender bulan (sel kosong berkedip). */
export function skeletonCalendarGrid(cells = 35) {
  return Array.from(
    { length: cells },
    () => `<div class="skeleton" style="height:110px;border-radius:0;"></div>`
  ).join("");
}

/** Skeleton untuk baris tabel. */
export function skeletonTableRows(columns = 5, rows = 5) {
  const cells = Array.from({ length: columns }, () => `<td><div class="skeleton skeleton-text" style="width:80%;"></div></td>`).join("");
  return Array.from({ length: rows }, () => `<tr>${cells}</tr>`).join("");
}

/** Menyisipkan skeleton ke dalam container, mengembalikan fungsi untuk membersihkannya nanti. */
export function renderSkeleton(container, html) {
  container.innerHTML = html;
}
