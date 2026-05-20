import {
  getNestedTranslation as getMessageValue,
  loadLocaleMessages,
  resolveLocale,
  translate,
} from "./i18n.js";

const hero = document.querySelector("#hero");
const heroTitle = document.querySelector("#hero-title");
const heroDescription = document.querySelector("#hero-description");
const nextWindow = document.querySelector("#next-window");
const countdown = document.querySelector("#countdown");
const heroMissionLink = document.querySelector("#hero-mission-link");
const monthStrip = document.querySelector("#month-strip");
const tracker = document.querySelector("#tracker");
const missionsGrid = document.querySelector("#missions-grid");
const refreshNote = document.querySelector("#refresh-note");
const historyGrid = document.querySelector("#history-grid");
const historyRefreshNote = document.querySelector("#history-refresh-note");
const missionCardTemplate = document.querySelector("#mission-card-template");
const calendarLink = document.querySelector("#calendar-link");
const icsUrl = document.querySelector("#ics-url");
const webcalUrl = document.querySelector("#webcal-url");
const metaDescription = document.querySelector("#meta-description");

const calendarPrev = document.querySelector("#calendar-prev");
const calendarNext = document.querySelector("#calendar-next");
const calendarMonthLabel = document.querySelector("#calendar-month-label");
const calendarGrid = document.querySelector("#calendar-grid");
const calendarEventsList = document.querySelector("#calendar-events-list");
const themeToggle = document.querySelector("#theme-toggle");
const timezoneSelector = document.querySelector("#timezone-selector");


let activeLocale = "en";
let messages = {};
let countdownTimerId = null;
let calendarMonthKeys = [];
let calendarMissions = [];
let activeCalendarMonthIndex = 0;

let upcomingPayload = null;
let historyPayload = null;
let missionHighlightTimerId = null;
let activeTimezone = null; // null = browser local timezone

const imageObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const src = el.dataset.src;
        if (src) {
          el.style.backgroundImage = `url("${src}")`;
          el.classList.add("is-loaded");
        }
        observer.unobserve(el);
      }
    });
  },
  { rootMargin: "200px" }
);

function getNestedTranslation(key, locale = activeLocale) {
  return getMessageValue(messages, key, locale);
}

function t(key, replacements = {}, locale = activeLocale) {
  return translate(messages, key, replacements, locale);
}

function applyStaticTranslations() {
  document.documentElement.lang = activeLocale;
  document.title = t("meta.title");
  metaDescription.setAttribute("content", t("meta.description"));

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }

  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }

  if (upcomingPayload || historyPayload) {
    refreshCalendar();
  }

}

function localizeStatus(value) {
  if (!value) {
    return t("mission.unspecified");
  }

  return (
    getNestedTranslation(`status.${value.toLowerCase()}`) || titleCase(value)
  );
}

function localizeHistoryStatus(success) {
  if (success === true) {
    return t("history.status.success");
  }

  if (success === false) {
    return t("history.status.failure");
  }

  return t("history.status.unknown");
}

function updateSubscriptionLinks() {
  const httpUrl = new URL("/spacex.ics", window.location.href);
  const webcalProtocol = "webcal:";
  const webcal = `${webcalProtocol}//${httpUrl.host}${httpUrl.pathname}`;

  calendarLink.href = webcal;
  icsUrl.textContent = httpUrl.toString();
  webcalUrl.textContent = webcal;
}

const TIMEZONE_OPTIONS = [
  { key: "local", tz: null },
  { key: "utc",   tz: "UTC" },
  { key: "et",    tz: "America/New_York" },
  { key: "ct",    tz: "America/Chicago" },
  { key: "pt",    tz: "America/Los_Angeles" },
];

function getDateTimeFormatter(withZone = true, timeZone) {
  const options = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  if (withZone) {
    options.timeZoneName = "short";
  }

  // Explicit override > active user selection > browser default
  const tz = timeZone !== undefined ? timeZone : activeTimezone;
  if (tz) {
    options.timeZone = tz;
  }

  return new Intl.DateTimeFormat(activeLocale, options);
}

const formatDateTime = (iso, withZone = true) => {
  if (!iso) {
    return t("mission.tbd");
  }

  return getDateTimeFormatter(withZone).format(new Date(iso));
};

const formatDateTimeUtc = (iso) => {
  if (!iso) {
    return t("mission.tbd");
  }

  return getDateTimeFormatter(true, "UTC").format(new Date(iso));
};

function renderTimezoneSelector() {
  if (!timezoneSelector) {
    return;
  }

  timezoneSelector.replaceChildren();

  for (const option of TIMEZONE_OPTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tz-btn";
    btn.dataset.tz = option.tz || "";
    btn.textContent = t(`timezone.${option.key}`);
    btn.setAttribute("aria-label", t(`timezone.aria.${option.key}`));
    if (activeTimezone === option.tz) {
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
    } else {
      btn.setAttribute("aria-pressed", "false");
    }
    btn.addEventListener("click", () => setActiveTimezone(option.tz));
    timezoneSelector.append(btn);
  }
}

function setActiveTimezone(tz) {
  activeTimezone = tz;
  renderTimezoneSelector();

  // Re-render all time-sensitive UI with the new timezone
  if (upcomingPayload) {
    renderHero(upcomingPayload.nextLaunch);
    renderTracker(upcomingPayload.missions);
    renderMissions(upcomingPayload.missions);
    refreshCalendar(true);
  }
  if (historyPayload) {
    renderHistoryMissions(historyPayload.missions || []);
  }
}

const titleCase = (value) =>
  value
    ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : t("mission.unspecified");

function buildMissionAnchorId(mission) {
  return `mission-${mission.slug || mission.correlationId || mission.id}`;
}

function buildHistoryMissionAnchorId(mission) {
  return `history-mission-${mission.id || mission.correlationId}`;
}

function buildCalendarAnchorId(mission) {
  return mission.calendarGroup === "history"
    ? buildHistoryMissionAnchorId(mission)
    : buildMissionAnchorId(mission);
}

function highlightMissionCard(targetId) {
  if (!targetId) {
    return;
  }

  const target = document.getElementById(targetId);

  if (!target || !target.classList.contains("mission-card")) {
    return;
  }

  target.classList.remove("is-highlighted");
  void target.offsetWidth;
  target.classList.add("is-highlighted");

  if (missionHighlightTimerId) {
    window.clearTimeout(missionHighlightTimerId);
  }

  missionHighlightTimerId = window.setTimeout(() => {
    target.classList.remove("is-highlighted");
    missionHighlightTimerId = null;
  }, 1200);
}

function highlightMissionCardFromHash() {
  highlightMissionCard(window.location.hash.slice(1));
}

function getCalendarMonthKey(iso) {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getCalendarMonths(missions) {
  const keys = [];
  const seen = new Set();

  for (const mission of missions) {
    const key = getCalendarMonthKey(mission.launchAt);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    keys.push(key);
  }

  return keys.sort((a, b) => a.localeCompare(b));
}

function sortMissionsNewestFirst(missions) {
  return [...missions].sort((left, right) => {
    const leftTime = left.launchAt ? Date.parse(left.launchAt) : Number.NEGATIVE_INFINITY;
    const rightTime = right.launchAt ? Date.parse(right.launchAt) : Number.NEGATIVE_INFINITY;
    return rightTime - leftTime;
  });
}

function markCalendarMissions(missions, calendarGroup) {
  return sortMissionsNewestFirst(missions).map((mission) => ({
    ...mission,
    calendarGroup,
  }));
}

function getCalendarMissions() {
  return [
    ...markCalendarMissions(upcomingPayload?.missions || [], "upcoming"),
    ...markCalendarMissions(historyPayload?.missions || [], "history"),
  ].filter((mission) => mission.launchAt);
}

function resolveDefaultCalendarMonthIndex(monthKeys, missions, nextLaunch) {
  const nextMonthKey = getCalendarMonthKey(nextLaunch?.launchAt);
  const nextIndex = nextMonthKey ? monthKeys.indexOf(nextMonthKey) : -1;

  if (nextIndex >= 0) {
    return nextIndex;
  }

  const fallbackMission = missions
    .filter((mission) => mission.launchAt)
    .sort((left, right) => Date.parse(right.launchAt) - Date.parse(left.launchAt))[0];
  const fallbackMonthKey = getCalendarMonthKey(fallbackMission?.launchAt);
  const fallbackIndex = fallbackMonthKey ? monthKeys.indexOf(fallbackMonthKey) : -1;

  return Math.max(0, fallbackIndex);
}

function updateCalendarState(missions, nextLaunch, preserveActiveMonth = false) {
  const previousMonthKey = calendarMonthKeys[activeCalendarMonthIndex];
  calendarMissions = missions;
  calendarMonthKeys = getCalendarMonths(missions);

  if (preserveActiveMonth && previousMonthKey) {
    const previousIndex = calendarMonthKeys.indexOf(previousMonthKey);
    activeCalendarMonthIndex = previousIndex >= 0 ? previousIndex : 0;
  } else {
    activeCalendarMonthIndex = resolveDefaultCalendarMonthIndex(
      calendarMonthKeys,
      missions,
      nextLaunch
    );
  }

  renderCalendar(missions);
}

function refreshCalendar(preserveActiveMonth = false) {
  updateCalendarState(getCalendarMissions(), upcomingPayload?.nextLaunch, preserveActiveMonth);
}



function formatCalendarMonthLabel(monthKey) {
  if (!monthKey) {
    return "";
  }

  return new Intl.DateTimeFormat(activeLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-01T00:00:00.000Z`));
}

function buildCalendarGridDays(monthKey) {
  const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const firstDayIndex = monthStart.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;
  const days = [];

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const dayOffset = cellIndex - firstDayIndex;
    const date = new Date(Date.UTC(year, month, dayOffset + 1));
    days.push({
      isoDate: date.toISOString().slice(0, 10),
      dayNumber: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === month,
    });
  }

  return days;
}

function renderCalendar(missions) {
  calendarGrid.replaceChildren();
  calendarEventsList.replaceChildren();

  // 1. Render Weekday Headers
  const labels = getNestedTranslation("calendar.weekdayShort");
  if (Array.isArray(labels)) {
    for (const label of labels) {
      const item = document.createElement("div");
      item.className = "calendar-weekday";
      item.textContent = label;
      calendarGrid.append(item);
    }
  }

  if (!calendarMonthKeys.length) {
    calendarMonthLabel.textContent = t("calendar.title");
    calendarPrev.disabled = true;
    calendarNext.disabled = true;

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = t("calendar.noLaunches");
    calendarEventsList.append(empty);
    return;
  }

  const monthKey = calendarMonthKeys[activeCalendarMonthIndex];
  const monthMissions = sortMissionsNewestFirst(
    missions.filter((mission) => getCalendarMonthKey(mission.launchAt) === monthKey)
  );
  const missionMap = new Map();

  for (const mission of monthMissions) {
    const isoDate = mission.launchAt.slice(0, 10);
    const entries = missionMap.get(isoDate) || [];
    entries.push(mission);
    missionMap.set(isoDate, entries);
  }

  calendarMonthLabel.textContent = formatCalendarMonthLabel(monthKey);
  calendarPrev.disabled = activeCalendarMonthIndex === 0;
  calendarNext.disabled = activeCalendarMonthIndex === calendarMonthKeys.length - 1;

  const todayKey = new Date().toISOString().slice(0, 10);
  const days = buildCalendarGridDays(monthKey);

  for (const day of days) {
    const cell = document.createElement("div");
    cell.className = "calendar-day";

    if (!day.isCurrentMonth) {
      cell.classList.add("is-outside");
    }

    if (day.isoDate === todayKey) {
      cell.classList.add("is-today");
    }

    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = String(day.dayNumber);

    const events = missionMap.get(day.isoDate) || [];
    if (events.length > 0) {
      cell.classList.add("has-events");
      cell.addEventListener("click", () => {
        // Clear selected state on other cells in the grid
        calendarGrid.querySelectorAll(".calendar-day").forEach((c) => {
          c.classList.remove("is-selected");
        });
        // Select the clicked cell
        cell.classList.add("is-selected");

        const firstMission = events[0];
        const anchorId = buildCalendarAnchorId(firstMission);

        // 1. Scroll the right-hand events list to the corresponding list item
        const link = calendarEventsList.querySelector(`[href="#${anchorId}"]`);
        if (link) {
          link.scrollIntoView({ behavior: "smooth", block: "nearest" });
          link.classList.add("is-active");
          setTimeout(() => {
            link.classList.remove("is-active");
          }, 1200);
        }
      });
    }

    cell.append(dayNumber);
    calendarGrid.append(cell);
  }

  if (!monthMissions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = t("calendar.noLaunches");
    calendarEventsList.append(empty);
    return;
  }

  for (const mission of monthMissions) {
    const link = document.createElement("a");
    link.className = "event-list-item";
    if (mission.calendarGroup === "history") {
      link.classList.add("is-history-event");
    }
    link.href = `#${buildCalendarAnchorId(mission)}`;

    const dateBox = document.createElement("div");
    dateBox.className = "event-list-date";
    const dateObj = new Date(mission.launchAt);
    const monthStr = new Intl.DateTimeFormat(activeLocale, { month: "short", timeZone: "UTC" }).format(dateObj);
    const dayStr = dateObj.getUTCDate();
    dateBox.innerHTML = `<span>${monthStr}</span><strong>${dayStr}</strong>`;

    const details = document.createElement("div");
    details.className = "event-list-details";

    const title = document.createElement("div");
    title.className = "event-list-title";
    title.textContent = mission.title;

    const meta = document.createElement("div");
    meta.className = "event-list-meta";

    if (mission.calendarGroup === "history") {
      const status = document.createElement("span");
      status.textContent = localizeHistoryStatus(mission.success);
      meta.append(status);
    } else if (mission.isLive) {
      const live = document.createElement("span");
      live.className = "event-list-live";
      live.textContent = t("mission.live");
      meta.append(live);
    } else if (mission.launchAt) {
      const time = document.createElement("span");
      time.textContent = new Intl.DateTimeFormat(activeLocale, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(mission.launchAt));
      meta.append(time);
    } else {
      const untimed = document.createElement("span");
      untimed.textContent = t("calendar.untimed");
      meta.append(untimed);
    }

    if (mission.calendarGroup !== "history") {
      const type = document.createElement("span");
      type.textContent = localizeMissionType(mission.missionType);
      meta.append(type);
    }

    details.append(title, meta);
    link.append(dateBox, details);
    
    link.addEventListener("click", () => {
      window.setTimeout(() => {
        highlightMissionCard(buildCalendarAnchorId(mission));
      }, 0);
    });

    calendarEventsList.append(link);
  }
}



function renderMonthSummary(summary) {
  monthStrip.replaceChildren();

  if (!summary.length) {
    const empty = document.createElement("p");
    empty.textContent = t("overview.noLaunchWindows");
    monthStrip.append(empty);
    return;
  }

  for (const item of summary) {
    const pill = document.createElement("article");
    pill.className = "month-pill";
    const label = item.isoMonth
      ? new Intl.DateTimeFormat(activeLocale, {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${item.isoMonth}-01T00:00:00.000Z`))
      : item.label;
    pill.innerHTML = `<strong>${item.count}</strong><span>${label}</span>`;
    monthStrip.append(pill);
  }
}

function localizeMissionType(value) {
  if (!value) {
    return t("mission.unspecified");
  }

  return (
    getNestedTranslation(`mission.types.${value.toLowerCase()}`) ||
    titleCase(value)
  );
}

function renderTracker(missions) {
  tracker.replaceChildren();

  const total = missions.length;
  const liveCount = missions.filter((mission) => mission.isLive).length;
  const trackedWindows = missions.filter((mission) => mission.launchAt).length;

  // Show the selected timezone label or browser default
  const tzDisplay = activeTimezone
    ? activeTimezone.split("/").pop().replace(/_/g, " ")
    : Intl.DateTimeFormat().resolvedOptions().timeZone;

  const rows = [
    [t("overview.tracker.missionsLoaded"), String(total)],
    [t("overview.tracker.timedWindows"), String(trackedWindows)],
    [t("overview.tracker.liveNow"), String(liveCount)],
    [t("overview.tracker.viewerTimezone"), tzDisplay],
  ];

  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "tracker-item";
    row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    tracker.append(row);
  }
}

function missionWindowCopy(mission) {
  if (!mission.launchAt) {
    return t("mission.launchTimingUnavailable");
  }

  if (mission.launchWindow.close) {
    return t("mission.window", {
      open: formatDateTime(mission.launchWindow.open),
      close: formatDateTime(mission.launchWindow.close),
    });
  }

  return t("mission.launchTarget", {
    local: formatDateTime(mission.launchAt),
    utc: formatDateTimeUtc(mission.launchAt),
  });
}

function renderSkeletons() {
  tracker.replaceChildren();
  for (let i = 0; i < 4; i++) {
    const item = document.createElement("div");
    item.className = "skeleton-tracker-item is-skeleton";
    tracker.append(item);
  }

  missionsGrid.replaceChildren();
  for (let i = 0; i < 6; i++) {
    const card = document.createElement("article");
    card.className = "mission-card skeleton-card";
    card.innerHTML = `
      <div class="skeleton-image is-skeleton"></div>
      <div class="mission-content">
        <div class="mission-topline">
          <div class="skeleton-badge is-skeleton"></div>
          <div class="skeleton-type is-skeleton"></div>
        </div>
        <div class="skeleton-title is-skeleton"></div>
        <div class="skeleton-window is-skeleton"></div>
        <div class="mission-facts">
          <div class="skeleton-fact is-skeleton"></div>
          <div class="skeleton-fact is-skeleton"></div>
          <div class="skeleton-fact is-skeleton"></div>
        </div>
      </div>
    `;
    missionsGrid.append(card);
  }
}

function renderMissions(missions) {
  missionsGrid.replaceChildren();

  if (!missions.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = t("mission.emptyState");
    missionsGrid.append(emptyState);
    return;
  }

  for (const mission of missions) {
    const fragment = missionCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".mission-card");
    const image = fragment.querySelector(".mission-image");
    const badge = fragment.querySelector(".mission-badge");
    const type = fragment.querySelector(".mission-type");
    const title = fragment.querySelector(".mission-title");
    const windowText = fragment.querySelector(".mission-window");
    const vehicle = fragment.querySelector(".vehicle");
    const launchSite = fragment.querySelector(".launch-site");
    const returnSite = fragment.querySelector(".return-site");
    const terms = fragment.querySelectorAll("[data-i18n]");

    for (const term of terms) {
      term.textContent = t(term.dataset.i18n);
    }

    badge.textContent = mission.isLive
      ? t("mission.live")
      : localizeStatus(mission.status);
    type.textContent = localizeMissionType(mission.missionType);
    title.textContent = mission.title;
    windowText.textContent = missionWindowCopy(mission);
    vehicle.textContent = mission.vehicle || t("mission.tbd");
    launchSite.textContent = mission.launchSite || t("mission.tbd");
    returnSite.textContent = mission.returnSite || t("mission.tbd");

    if (mission.image) {
      image.dataset.src = mission.image;
      imageObserver.observe(image);
    }

    card.id = buildMissionAnchorId(mission);
    card.dataset.mission = mission.slug || mission.correlationId;
    missionsGrid.append(fragment);
  }
}

function renderHistorySkeletons() {
  historyGrid.replaceChildren();
  for (let i = 0; i < 6; i++) {
    const card = document.createElement("article");
    card.className = "mission-card skeleton-card";
    card.innerHTML = `
      <div class="skeleton-image is-skeleton"></div>
      <div class="mission-content">
        <div class="mission-topline">
          <div class="skeleton-badge is-skeleton"></div>
          <div class="skeleton-type is-skeleton"></div>
        </div>
        <div class="skeleton-title is-skeleton"></div>
        <div class="skeleton-window is-skeleton"></div>
        <div class="mission-facts">
          <div class="skeleton-fact is-skeleton"></div>
          <div class="skeleton-fact is-skeleton"></div>
          <div class="skeleton-fact is-skeleton"></div>
        </div>
      </div>
    `;
    historyGrid.append(card);
  }
}

function formatHistoryDate(iso) {
  if (!iso) {
    return t("mission.tbd");
  }

  return new Intl.DateTimeFormat(activeLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function renderHistoryMissions(missions) {
  historyGrid.replaceChildren();

  const sortedMissions = sortMissionsNewestFirst(missions);

  if (!sortedMissions.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = t("history.emptyState");
    historyGrid.append(emptyState);
    return;
  }

  for (const mission of sortedMissions) {
    const fragment = missionCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".mission-card");
    const image = fragment.querySelector(".mission-image");
    const badge = fragment.querySelector(".mission-badge");
    const type = fragment.querySelector(".mission-type");
    const title = fragment.querySelector(".mission-title");
    const windowText = fragment.querySelector(".mission-window");
    const vehicle = fragment.querySelector(".vehicle");
    const launchSite = fragment.querySelector(".launch-site");
    const returnSite = fragment.querySelector(".return-site");
    const returnSiteLabel = returnSite.closest("div")?.querySelector("dt");
    const terms = fragment.querySelectorAll("[data-i18n]");

    for (const term of terms) {
      term.textContent = t(term.dataset.i18n);
    }

    card.classList.add("history-card");
    badge.textContent = localizeHistoryStatus(mission.success);
    badge.classList.toggle("is-success", mission.success === true);
    badge.classList.toggle("is-failure", mission.success === false);
    type.textContent = formatHistoryDate(mission.launchAt);
    title.textContent = mission.title;
    windowText.textContent = mission.details || t("history.noDetails");
    vehicle.textContent = mission.vehicle || t("mission.tbd");
    launchSite.textContent = mission.launchSite || t("mission.tbd");
    returnSiteLabel.textContent = t("history.detailsLabel");
    returnSite.textContent = mission.missionUrl ? t("history.detailsAvailable") : t("history.noLink");
    card.id = buildHistoryMissionAnchorId(mission);
    card.dataset.mission = mission.id || mission.correlationId;

    if (mission.image) {
      image.dataset.src = mission.image;
      imageObserver.observe(image);
    }

    if (mission.missionUrl) {
      const link = document.createElement("a");
      link.className = "history-details-link";
      link.href = mission.missionUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = t("history.detailsLink");
      fragment.querySelector(".mission-content").append(link);
    }

    historyGrid.append(fragment);
  }
}

function startCountdown(nextLaunch) {
  if (countdownTimerId) {
    window.clearInterval(countdownTimerId);
    countdownTimerId = null;
  }

  const renderStructure = () => {
    countdown.innerHTML = `
      <div class="countdown-block">
        <div class="countdown-val" data-unit="days">00</div>
        <div class="countdown-unit" data-i18n="countdown.units.days">${t("countdown.units.days")}</div>
      </div>
      <div class="countdown-block">
        <div class="countdown-val" data-unit="hours">00</div>
        <div class="countdown-unit" data-i18n="countdown.units.hours">${t("countdown.units.hours")}</div>
      </div>
      <div class="countdown-block">
        <div class="countdown-val" data-unit="minutes">00</div>
        <div class="countdown-unit" data-i18n="countdown.units.minutes">${t("countdown.units.minutes")}</div>
      </div>
      <div class="countdown-block">
        <div class="countdown-val" data-unit="seconds">00</div>
        <div class="countdown-unit" data-i18n="countdown.units.seconds">${t("countdown.units.seconds")}</div>
      </div>
    `;
  };

  const updateDigit = (unit, value) => {
    const el = countdown.querySelector(`[data-unit="${unit}"]`);
    if (!el) return;
    const strValue = String(value).padStart(2, "0");
    if (el.textContent !== strValue) {
      el.textContent = strValue;
      el.classList.remove("animate");
      void el.offsetWidth;
      el.classList.add("animate");
    }
  };

  const update = () => {
    if (!nextLaunch?.launchAt) {
      countdown.textContent = t("countdown.awaitingTime");
      return;
    }

    const diff = Date.parse(nextLaunch.launchAt) - Date.now();

    if (diff <= 0) {
      countdown.textContent = t("countdown.windowOpen");
      return;
    }

    if (!countdown.querySelector(".countdown-block")) {
      renderStructure();
    }

    const totalSeconds = Math.floor(diff / 1000);
    
    countdown.classList.toggle("is-urgent", totalSeconds < 86400);
    countdown.classList.toggle("is-critical", totalSeconds < 3600);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    updateDigit("days", days);
    updateDigit("hours", hours);
    updateDigit("minutes", minutes);
    updateDigit("seconds", seconds);
  };

  update();
  countdownTimerId = window.setInterval(update, 1000);
}

function renderHero(nextLaunch) {
  if (!nextLaunch) {
    heroTitle.textContent = t("hero.noMissionsTitle");
    heroDescription.textContent = t("hero.noMissionsDescription");
    nextWindow.textContent = t("mission.tbd");
    countdown.textContent = t("hero.unavailable");
    heroMissionLink.href = "https://www.spacex.com/launches/";
    heroMissionLink.textContent = t("mission.detailsLink");
    return;
  }

  heroTitle.textContent = nextLaunch.title;
  heroDescription.textContent = t("hero.nextLaunchDescription", {
    vehicle: nextLaunch.vehicle || t("mission.tbd"),
    launchSite: nextLaunch.launchSite || t("mission.sitePending"),
    returnSite: nextLaunch.returnSite || t("mission.recoveryPending"),
  });
  nextWindow.textContent = nextLaunch.launchAt
    ? formatDateTime(nextLaunch.launchAt)
    : t("mission.tbd");
  heroMissionLink.href =
    nextLaunch.missionUrl || "https://www.spacex.com/launches/";
  heroMissionLink.textContent =
    nextLaunch.isLive || nextLaunch.callToAction === "WATCH"
      ? t("mission.watchLive")
      : t("mission.detailsLink");

  if (nextLaunch.image) {
    hero.style.backgroundImage = `radial-gradient(circle at top, rgba(112, 133, 188, 0.24), transparent 34%), url("${nextLaunch.image}")`;
  }
}

function injectStructuredData(missions) {
  const existingScript = document.querySelector("#structured-data");
  if (existingScript) {
    existingScript.remove();
  }

  const events = missions
    .filter((m) => m.launchAt)
    .map((m) => ({
      "@context": "https://schema.org",
      "@type": "Event",
      name: m.title,
      startDate: m.launchAt,
      endDate: m.launchWindow?.close || m.launchAt,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: m.launchSite || "TBD",
      },
      image: m.image ? [m.image] : [],
      description: `${m.vehicle || "TBD"} launch from ${m.launchSite || "TBD"}.`,
    }));

  if (events.length === 0) return;

  const script = document.createElement("script");
  script.id = "structured-data";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(events);
  document.head.appendChild(script);
}

async function loadLaunches() {
  renderSkeletons();
  try {
    const response = await fetch("/api/launches");

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    upcomingPayload = payload;

    renderHero(payload.nextLaunch);
    renderMonthSummary(payload.monthSummary);
    renderTracker(payload.missions);
    refreshCalendar();

    renderMissions(payload.missions);
    injectStructuredData(payload.missions);
    highlightMissionCardFromHash();
    refreshNote.textContent = t("manifest.refreshedAt", {
      value: new Intl.DateTimeFormat(activeLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(payload.refreshedAt)),
    });
    startCountdown(payload.nextLaunch);
  } catch (error) {
    heroTitle.textContent = t("hero.unavailableTitle");
    heroDescription.textContent = t("hero.unavailableDescription");
    nextWindow.textContent = t("hero.retryLater");
    countdown.textContent = t("hero.unavailable");
    upcomingPayload = null;
    refreshCalendar();

    missionsGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

async function loadHistoryLaunches() {
  renderHistorySkeletons();
  try {
    const response = await fetch("/api/history-launches");

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    historyPayload = payload;
    renderHistoryMissions(payload.missions || []);
    refreshCalendar();
    historyRefreshNote.textContent = t("history.refreshedAt", {
      value: new Intl.DateTimeFormat(activeLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(payload.refreshedAt)),
    });
  } catch (error) {
    historyPayload = null;
    refreshCalendar(true);
    historyGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
    historyRefreshNote.textContent = t("history.unavailable");
  }
}

async function initializeLocale() {
  const params = new URLSearchParams(window.location.search);
  const preferred =
    params.get("hl") ||
    localStorage.getItem("preferred-locale") ||
    navigator.language;

  const localeResult = await loadLocaleMessages(preferred);
  activeLocale = localeResult.locale;
  messages = localeResult.messages;
}

await initializeLocale();
applyStaticTranslations();
renderTimezoneSelector();
updateSubscriptionLinks();
window.addEventListener("hashchange", highlightMissionCardFromHash);

document.addEventListener("click", (event) => {
  const btn = event.target.closest(".calendar-nav-button");
  if (!btn || !calendarMonthKeys.length) {
    return;
  }

  if (btn.id === "calendar-prev") {
    if (activeCalendarMonthIndex > 0) {
      activeCalendarMonthIndex -= 1;
      renderCalendar(calendarMissions);
    }
  } else if (btn.id === "calendar-next") {
    if (activeCalendarMonthIndex < calendarMonthKeys.length - 1) {
      activeCalendarMonthIndex += 1;
      renderCalendar(calendarMissions);
    }
  }
});

// --- Theme ---

function getPreferredTheme() {
  const stored = localStorage.getItem("theme");

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

applyTheme(getPreferredTheme());

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("theme", next);
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (event) => {
  if (!localStorage.getItem("theme")) {
    applyTheme(event.matches ? "light" : "dark");
  }
});

loadLaunches();
loadHistoryLaunches();

// --- PWA ---

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration.scope);
      })
      .catch((err) => {
        console.log("SW registration failed:", err);
      });
  });
}

// Export for testing
export {
  resolveLocale,
  t,
  titleCase,
  localizeStatus,
  localizeMissionType,
  localizeHistoryStatus,
  buildHistoryMissionAnchorId,
  getCalendarMonths,
  markCalendarMissions,
  updateCalendarState,
  refreshCalendar,
  renderHistoryMissions,
  renderCalendar,
  renderMissions
};
