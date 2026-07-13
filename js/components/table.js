/**
 * table.js
 * ----------------------------------------------------------------------
 * Renderer tabel generik untuk Data Staff, Rekap Absensi, dsb.
 * ----------------------------------------------------------------------
 */

import { escapeHtml } from "../utils/helper.js";

/**
 * Merender tabel dari kolom & baris data.
 * @param {Array<{key:string,label:string,render?:(row:object)=>string}>} columns
 * @param {Array<object>} rows
 * @param {{emptyMessage?:string}} options
 * @returns {string} HTML
 */
export function renderTable(columns, rows, options = {}) {
  if (!rows.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-title">${options.emptyMessage || "Belum ada data."}</div>
      </div>
    `;
  }

  const thead = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const tbody = rows
    .map((row) => {
      const tds = columns
        .map((c) => `<td>${c.render ? c.render(row) : escapeHtml(row[c.key] ?? "-")}</td>`)
        .join("");
      return `<tr data-row-id="${row.id || ""}">${tds}</tr>`;
    })
    .join("");

  return `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
  `;
}
