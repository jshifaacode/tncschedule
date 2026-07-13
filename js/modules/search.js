/**
 * search.js
 * ----------------------------------------------------------------------
 * Global Search: mencari di seluruh kegiatan & staff yang sudah dimuat
 * di memori (client-side search — cukup cepat untuk skala data internal
 * perusahaan, dan menghindari kebutuhan Algolia/Elasticsearch).
 * ----------------------------------------------------------------------
 */

import { debounce } from "../utils/helper.js";

/**
 * Mencari di seluruh kegiatan berdasarkan kata kunci.
 * @param {Array<object>} activities
 * @param {string} keyword
 */
export function searchActivities(activities, keyword) {
  if (!keyword?.trim()) return [];
  const kw = keyword.toLowerCase();
  return activities.filter((a) =>
    [a.name, a.location, a.picName, a.category, a.status, a.description, ...(a.tags || [])]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(kw))
  );
}

/**
 * Mencari di seluruh staff.
 * @param {Array<object>} staffList
 * @param {string} keyword
 */
export function searchStaffGlobal(staffList, keyword) {
  if (!keyword?.trim()) return [];
  const kw = keyword.toLowerCase();
  return staffList.filter((s) =>
    [s.fullName, s.jobdesk, s.email, s.division].filter(Boolean).some((f) => String(f).toLowerCase().includes(kw))
  );
}

/**
 * Menggabungkan pencarian kegiatan + staff menjadi hasil terkelompok,
 * dipakai oleh modal Global Search (Ctrl+K).
 * @param {{activities: object[], staff: object[]}} datasets
 * @param {string} keyword
 */
export function globalSearch(datasets, keyword) {
  return {
    activities: searchActivities(datasets.activities || [], keyword).slice(0, 8),
    staff: searchStaffGlobal(datasets.staff || [], keyword).slice(0, 8),
  };
}

/**
 * Memasang live search pada sebuah input, memanggil onResults setiap kali
 * pengguna berhenti mengetik selama `delay` ms.
 * @param {HTMLInputElement} inputEl
 * @param {(keyword: string) => void} onSearch
 * @param {number} delay
 */
export function bindLiveSearch(inputEl, onSearch, delay = 250) {
  const handler = debounce((e) => onSearch(e.target.value), delay);
  inputEl.addEventListener("input", handler);
}
