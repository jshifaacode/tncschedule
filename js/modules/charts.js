/**
 * charts.js
 * ----------------------------------------------------------------------
 * Wrapper tipis di atas Chart.js untuk grafik Dashboard & Statistik Absensi.
 * Membutuhkan global `Chart` (dimuat via CDN di halaman terkait):
 *
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.3/chart.umd.min.js"></script>
 * ----------------------------------------------------------------------
 */

const PALETTE = {
  ink: "#111111",
  green: "#1F7A4D",
  blue: "#1D5FBF",
  amber: "#B4790B",
  red: "#C0392B",
  purple: "#6B4FA0",
  gray: "#5B5B58",
  teal: "#2E8E9E",
};

/** Menghancurkan instance chart lama pada canvas tertentu bila ada (mencegah duplikasi saat re-render). */
const chartInstances = new Map();

function destroyExisting(canvasId) {
  const existing = chartInstances.get(canvasId);
  if (existing) {
    existing.destroy();
    chartInstances.delete(canvasId);
  }
}

/**
 * Bar chart sederhana (misal: jumlah kegiatan per bulan).
 * @param {string} canvasId
 * @param {string[]} labels
 * @param {number[]} data
 * @param {string} label
 */
export function renderBarChart(canvasId, labels, data, label = "Jumlah") {
  if (typeof Chart === "undefined") return console.error("Chart.js belum dimuat.");
  destroyExisting(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label, data, backgroundColor: PALETTE.ink, borderRadius: 4, maxBarThickness: 36 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
  chartInstances.set(canvasId, chart);
  return chart;
}

/** Line chart (misal: trend kegiatan mingguan). */
export function renderLineChart(canvasId, labels, data, label = "Trend") {
  if (typeof Chart === "undefined") return console.error("Chart.js belum dimuat.");
  destroyExisting(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label, data,
        borderColor: PALETTE.blue,
        backgroundColor: "rgba(29,95,191,0.1)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
  chartInstances.set(canvasId, chart);
  return chart;
}

/**
 * Donut chart (misal: statistik absensi per status).
 * @param {string} canvasId
 * @param {Record<string,number>} statusCounts - contoh: {hadir: 20, izin: 3}
 * @param {Record<string,string>} colorMap - contoh: {hadir: "green", izin: "blue"}
 */
export function renderDonutChart(canvasId, statusCounts, colorMap = {}) {
  if (typeof Chart === "undefined") return console.error("Chart.js belum dimuat.");
  destroyExisting(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = Object.keys(statusCounts);
  const data = Object.values(statusCounts);
  const colors = labels.map((l) => PALETTE[colorMap[l]] || PALETTE.gray);

  const chart = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#FFFFFF" }] },
    options: {
      responsive: true,
      cutout: "68%",
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
    },
  });
  chartInstances.set(canvasId, chart);
  return chart;
}

export { PALETTE };
