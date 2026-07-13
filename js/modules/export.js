/**
 * export.js
 * ----------------------------------------------------------------------
 * Ekspor data (kegiatan / absensi) ke Excel, CSV, dan PDF.
 * Menggunakan SheetJS (xlsx) dan jsPDF, dimuat via CDN di halaman terkait
 * (lihat komentar di bagian bawah file untuk tag <script> yang diperlukan).
 * ----------------------------------------------------------------------
 */

/**
 * Ekspor array data ke file Excel (.xlsx).
 * Membutuhkan SheetJS global `XLSX` (dimuat dari CDN di halaman).
 * @param {Array<object>} rows
 * @param {string} filename
 * @param {string} [sheetName]
 */
export function exportToExcel(rows, filename = "laporan.xlsx", sheetName = "Data") {
  if (typeof XLSX === "undefined") {
    console.error("SheetJS (XLSX) belum dimuat. Tambahkan script CDN di halaman ini.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/**
 * Ekspor array data ke CSV (tanpa dependency eksternal).
 * @param {Array<object>} rows
 * @param {string} filename
 */
export function exportToCSV(rows, filename = "laporan.csv") {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/**
 * Ekspor tabel data ke PDF sederhana menggunakan jsPDF + jspdf-autotable.
 * Membutuhkan global `window.jspdf.jsPDF` (dimuat dari CDN di halaman).
 * @param {string} title
 * @param {string[]} columns
 * @param {Array<Array<string>>} rows
 * @param {string} filename
 */
export function exportToPDF(title, columns, rows, filename = "laporan.pdf") {
  if (typeof window.jspdf === "undefined") {
    console.error("jsPDF belum dimuat. Tambahkan script CDN di halaman ini.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();
  docPdf.setFontSize(14);
  docPdf.text(title, 14, 16);
  docPdf.setFontSize(9);
  docPdf.text(`Diekspor: ${new Date().toLocaleString("id-ID")}`, 14, 22);

  if (typeof docPdf.autoTable === "function") {
    docPdf.autoTable({ head: [columns], body: rows, startY: 28, styles: { fontSize: 8 } });
  } else {
    console.warn("Plugin jspdf-autotable tidak ditemukan; tabel tidak akan dirender rapi.");
  }
  docPdf.save(filename);
}

/** Memicu print dialog browser untuk elemen tertentu (Cara Print sederhana tanpa library tambahan). */
export function printElement(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html><head><title>Cetak Laporan</title></head>
    <body>${el.innerHTML}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * CDN yang dibutuhkan (tambahkan hanya di halaman yang memakai export):
 *
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js"></script>
 */
