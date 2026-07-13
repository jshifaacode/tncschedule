/**
 * dashboard.js (page-level module, loaded only by dashboard.html)
 * ----------------------------------------------------------------------
 * Merakit seluruh widget Dashboard: jam realtime, statistik, grafik,
 * kalender mini, upcoming activities, recent activity feed, dan status
 * staff hari ini — seluruhnya realtime dari Firestore.
 * ----------------------------------------------------------------------
 */

import { initApp } from "../app.js";
import { qs } from "../utils/helper.js";
import { formatFullDate, toDateKey } from "../utils/formatter.js";
import { listenAllActiveActivities } from "./activities.js";
import { listenTodayAttendance, computeAttendanceStats } from "./attendance.js";
import { COLLECTIONS, listenCollection } from "../firebase/firestore.js";
import { generateMonthGrid, isSameDay } from "./calendar.js";
import { upcomingActivityRow, feedRow } from "../components/cards.js";
import { listenAllStaff } from "./staff.js";

import { skeletonList, skeletonStatCard } from "../components/skeleton.js";
import { renderDonutChart } from "./charts.js";
import { ATTENDANCE_STATUSES } from "../utils/constants.js";

const unsubscribers = [];

function trackListener(unsub) {
  unsubscribers.push(unsub);
}

window.addEventListener("beforeunload", () =>
  unsubscribers.forEach((fn) => fn?.()),
);

function startClock() {
  const clockEl = qs("[data-clock]");
  const dateEl = qs("[data-clock-date]");
  function tick() {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString("id-ID");
    if (dateEl) dateEl.textContent = formatFullDate(now);
  }
  tick();
  setInterval(tick, 1000);
}

function renderMiniCalendar(activityDateKeys) {
  const target = qs("[data-mini-calendar]");
  if (!target) return;
  const now = new Date();
  const cells = generateMonthGrid(now.getFullYear(), now.getMonth());
  const dayLabels = ["M", "S", "S", "R", "K", "J", "S"];

  const labelsHtml = dayLabels
    .map((d) => `<div class="mini-cal-day-label">${d}</div>`)
    .join("");
  const cellsHtml = cells
    .map((cell) => {
      const classes = ["mini-cal-cell"];
      if (!cell.isCurrentMonth) classes.push("text-faint");
      if (isSameDay(cell.date, now)) classes.push("today");
      if (activityDateKeys.has(cell.dateKey)) classes.push("has-event");
      return `<div class="${classes.join(" ")}">${cell.date.getDate()}</div>`;
    })
    .join("");

  target.innerHTML = `<div class="mini-cal">${labelsHtml}${cellsHtml}</div>`;
}

function renderStats({ activities, attendanceToday, staffCount }) {
  const todayKey = toDateKey(new Date());
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const monthKey = todayKey.slice(0, 7);

  const stats = [
    { label: "Total Staff", value: staffCount },
    { label: "Total Kegiatan", value: activities.length },
    {
      label: "Kegiatan Hari Ini",
      value: activities.filter((a) => a.date === todayKey).length,
    },
    {
      label: "Kegiatan Bulan Ini",
      value: activities.filter((a) => a.date?.startsWith(monthKey)).length,
    },
    {
      label: "Staff Hadir Hari Ini",
      value: attendanceToday.filter((a) => a.status === "hadir").length,
    },
    {
      label: "Kegiatan Selesai",
      value: activities.filter((a) => a.status === "selesai").length,
    },
  ];

  const target = qs("[data-stat-grid]");
  if (!target) return;
  target.innerHTML = stats
    .map(
      (s) => `
        <div class="stat-card">
          <div class="stat-card-label">${s.label}</div>
          <div class="stat-card-value">${s.value}</div>
        </div>
      `,
    )
    .join("");
}

function renderUpcoming(activities) {
  const target = qs("[data-upcoming-list]");
  if (!target) return;
  const todayKey = toDateKey(new Date());
  const upcoming = activities
    .filter(
      (a) =>
        a.date >= todayKey &&
        a.status !== "selesai" &&
        a.status !== "dibatalkan",
    )
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 6);

  if (!upcoming.length) {
    target.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-title">Belum ada kegiatan mendatang.</div>
        <a href="calendar.html" class="btn btn-primary btn-sm">Tambah Kegiatan</a>
      </div>`;
    return;
  }
  target.innerHTML = upcoming.map(upcomingActivityRow).join("");
}

function renderTodayList(activities) {
  const target = qs("[data-today-activities]");
  if (!target) return;
  const todayKey = toDateKey(new Date());
  const todays = activities.filter((a) => a.date === todayKey);

  if (!todays.length) {
    target.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-title">Belum ada kegiatan hari ini.</div>
        <p class="text-sm text-muted">Tambahkan kegiatan pertama Anda.</p>
      </div>`;
    return;
  }
  target.innerHTML = todays.map(upcomingActivityRow).join("");
}

function renderStatusToday(attendanceToday) {
  const target = qs("[data-status-today]");
  if (!target) return;
  const counts = computeAttendanceStats(attendanceToday);
  target.innerHTML = ATTENDANCE_STATUSES.map(
    (s) => `
      <div class="status-today-item">
        <span class="badge badge-${s.badge}">${counts[s.value] || 0}</span>
        <span>${s.label}</span>
      </div>`,
  ).join("");

  renderDonutChart(
    "attendance-today-chart",
    Object.fromEntries(
      ATTENDANCE_STATUSES.map((s) => [s.label, counts[s.value] || 0]),
    ),
    Object.fromEntries(
      ATTENDANCE_STATUSES.map((s) => [
        s.label,
        s.badge === "teal" ? "teal" : s.badge,
      ]),
    ),
  );
}

async function bootstrap() {
  const { user, profile } = await initApp();
  const welcomeName = qs("[data-welcome-name]");
  if (welcomeName)
    welcomeName.textContent = profile?.fullName?.split(" ")[0] || "Staff";

  startClock();

  const statTarget = qs("[data-stat-grid]");
  if (statTarget)
    statTarget.innerHTML = Array.from({ length: 6 }, skeletonStatCard).join("");
  const upcomingTarget = qs("[data-upcoming-list]");
  if (upcomingTarget) upcomingTarget.innerHTML = skeletonList(3);

  let activitiesCache = [];
  let attendanceCache = [];
  let staffCount = 0;
  let staffListCache = [];

  trackListener(
    listenAllActiveActivities((activities) => {
      activitiesCache = activities;
      renderStats({
        activities: activitiesCache,
        attendanceToday: attendanceCache,
        staffCount,
      });
      renderUpcoming(activitiesCache);
      renderTodayList(activitiesCache);
      renderMiniCalendar(new Set(activitiesCache.map((a) => a.date)));
    }),
  );

  trackListener(
    listenTodayAttendance((records) => {
      attendanceCache = records;
      renderStats({
        activities: activitiesCache,
        attendanceToday: attendanceCache,
        staffCount,
      });
      renderStatusToday(attendanceCache);
    }),
  );

  trackListener(
    listenAllStaff((staffList) => {
      staffListCache = staffList;
      staffCount = staffList.length;
      renderStats({
        activities: activitiesCache,
        attendanceToday: attendanceCache,
        staffCount,
      });

      if (activitiesCache.length) {
        const staffNameById = new Map(
          staffListCache.map((s) => [
            s.id,
            s.fullName || s.name || s.email || s.id,
          ]),
        );

        const enriched = activitiesCache.map((a) => {
          const involvedIds = Array.isArray(a.involvedStaffIds)
            ? a.involvedStaffIds
            : [];
          const involvedStaffNames = involvedIds.map(
            (id) => staffNameById.get(id) || id,
          );
          return {
            ...a,
            involvedStaffIds: involvedIds,
            involvedStaffNames,
          };
        });

        renderUpcoming(enriched);
        renderTodayList(enriched);
      }
    }),
  );

  trackListener(
    listenCollection(
      COLLECTIONS.ACTIVITY_LOGS,
      { orderBy: ["createdAt", "desc"], limit: 8 },
      (logs) => {
        const feedTarget = qs("[data-feed-list]");
        if (!feedTarget) return;
        if (!logs.length) {
          feedTarget.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">Belum ada aktivitas.</div></div>`;
          return;
        }
        feedTarget.innerHTML = logs.map(feedRow).join("");
      },
    ),
  );
}

bootstrap();
