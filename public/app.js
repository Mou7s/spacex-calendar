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


const translations = {
  "zh-CN": {
    meta: {
      title: "SpaceX 发射日历",
      description: "订阅在线 ICS 日历，随时获取最新的 SpaceX 发射计划。",
    },
    header: {
      copy: "订阅在线 ICS 日历，随时获取最新的 SpaceX 发射计划。",
    },
    subscribe: {
      eyebrow: "ICS 订阅",
      title: "订阅在线日历",
      copy: "使用下面的订阅地址添加日历。部署到公网 HTTPS 域名后，支持 ICS 订阅的日历应用都可以持续同步。",
      subscribeLink: "订阅在线日历",
    },
    hero: {
      eyebrow: "实时日历源",
      loadingTitle: "正在加载发射日历",
      loadingDescription: "正在拉取 SpaceX 官网当前使用的任务和发射窗口数据。",
      noMissionsTitle: "暂无即将发射任务",
      noMissionsDescription: "实时任务源暂时没有返回可用的即将发射任务。",
      unavailableTitle: "发射数据暂时不可用",
      unavailableDescription: "当前无法从 SpaceX 数据源拉取最新任务信息。",
      meta: {
        nextLaunch: "下一次发射",
        countdown: "倒计时",
      },
      pending: "等待中",
      syncing: "同步中",
      retryLater: "稍后再试",
      unavailable: "不可用",
      nextLaunchDescription:
        "{vehicle} 从 {launchSite} 发射，并计划在 {returnSite} 回收。",
    },
    overview: {
      cadenceEyebrow: "发射节奏",
      cadenceTitle: "近期发射分布",
      statusEyebrow: "状态",
      statusTitle: "发射追踪",
      noLaunchWindows: "当前还没有可展示的发射窗口。",
      tracker: {
        missionsLoaded: "任务总数",
        timedWindows: "有时间窗口的任务",
        liveNow: "正在直播",
        viewerTimezone: "当前时区",
      },
    },
    calendar: {
      eyebrow: "发射日历",
      title: "按月查看任务",
      previousMonthAria: "查看上个月",
      nextMonthAria: "查看下个月",
      noLaunches: "这个月还没有带日期的发射任务。",
      dayLabel: "{month}月{day}日",
      untimed: "时间待定",
      weekdayShort: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
    },
    manifest: {
      eyebrow: "任务清单",
      title: "即将执行的任务",
      waiting: "等待数据中",
      refreshedAt: "更新于 {value}",
    },
    mission: {
      vehicle: "火箭",
      launchSite: "发射场",
      returnSite: "回收点",
      watchLive: "观看直播",
      detailsLink: "任务详情",
      emptyState: "实时数据源没有返回 upcoming SpaceX 任务。",
      live: "直播中",
      unspecified: "未说明",
      tbd: "待定",
      sitePending: "待定发射场",
      recoveryPending: "待定回收点",
      launchTimingUnavailable: "暂未公布发射时间。",
      window: "窗口：{open} 至 {close}",
      launchTarget: "目标发射时间：{local} · {utc}",
      types: {
        starlink: "星链",
        nssl: "国家安全发射",
      },
    },
    countdown: {
      awaitingTime: "等待时间",
      windowOpen: "窗口已开启",
      format: "{days}天 {hours}时 {minutes}分 {seconds}秒",
      units: {
        days: "天",
        hours: "时",
        minutes: "分",
        seconds: "秒",
      },
    },
    status: {
      upcoming: "即将进行",
      live: "直播中",
    },
  },
  en: {
    meta: {
      title: "SpaceX Launch Calendar",
      description:
        "Subscribe to an online ICS calendar and keep up with upcoming SpaceX launches.",
    },
    header: {
      copy: "Subscribe to an online ICS calendar and keep up with upcoming SpaceX launches.",
    },
    subscribe: {
      eyebrow: "ICS Subscription",
      title: "Subscribe to Online Calendar",
      copy: "Use the subscription links below to add this calendar. Once deployed on a public HTTPS domain, calendar apps with ICS subscription support can keep it synced automatically.",
      subscribeLink: "Subscribe to Calendar",
    },
    hero: {
      eyebrow: "Live Calendar Feed",
      loadingTitle: "Loading launch calendar",
      loadingDescription:
        "Fetching the current mission queue and launch windows from SpaceX website feeds.",
      noMissionsTitle: "No upcoming missions",
      noMissionsDescription:
        "The live mission feed did not return any upcoming launches.",
      unavailableTitle: "Launch data unavailable",
      unavailableDescription:
        "The app could not reach the SpaceX mission feeds just now.",
      meta: {
        nextLaunch: "Next launch",
        countdown: "Countdown",
      },
      pending: "Pending",
      syncing: "Syncing",
      retryLater: "Retry later",
      unavailable: "Unavailable",
      nextLaunchDescription:
        "{vehicle} from {launchSite} with recovery at {returnSite}.",
    },
    overview: {
      cadenceEyebrow: "Flight cadence",
      cadenceTitle: "Upcoming launch rhythm",
      statusEyebrow: "Status",
      statusTitle: "Launch tracker",
      noLaunchWindows: "No launch windows are available yet.",
      tracker: {
        missionsLoaded: "Missions loaded",
        timedWindows: "Timed windows",
        liveNow: "Live now",
        viewerTimezone: "Viewer timezone",
      },
    },
    calendar: {
      eyebrow: "Launch calendar",
      title: "Browse missions by month",
      previousMonthAria: "View previous month",
      nextMonthAria: "View next month",
      noLaunches: "No dated launches are available for this month yet.",
      dayLabel: "{month} {day}",
      untimed: "Time TBD",
      weekdayShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
    manifest: {
      eyebrow: "Manifest",
      title: "Upcoming missions",
      waiting: "Waiting for data",
      refreshedAt: "Refreshed {value}",
    },
    mission: {
      vehicle: "Vehicle",
      launchSite: "Launch site",
      returnSite: "Return site",
      watchLive: "Watch Live",
      detailsLink: "Mission Page",
      emptyState:
        "No upcoming SpaceX missions were returned by the live data feed.",
      live: "Live",
      unspecified: "Unspecified",
      tbd: "TBD",
      sitePending: "site pending",
      recoveryPending: "an unlisted recovery site",
      launchTimingUnavailable: "Launch timing has not been published yet.",
      window: "Window: {open} to {close}",
      launchTarget: "Launch target: {local} · {utc}",
      types: {
        starlink: "Starlink",
        nssl: "National Security Launch",
      },
    },
    countdown: {
      awaitingTime: "Awaiting time",
      windowOpen: "Window open",
      format: "{days}d {hours}h {minutes}m {seconds}s",
      units: {
        days: "Days",
        hours: "Hours",
        minutes: "Mins",
        seconds: "Secs",
      },
    },
    status: {
      upcoming: "Upcoming",
      live: "Live",
    },
  },
};

translations["zh-CN"].header.github = "GitHub 仓库";
translations["zh-CN"].header.githubAriaLabel = "在 GitHub 查看项目";
translations["zh-CN"].header.themeToggleAria = "切换深色/浅色模式";
translations.en.header.github = "GitHub";
translations.en.header.githubAriaLabel = "View project on GitHub";
translations.en.header.themeToggleAria = "Toggle dark/light mode";

let activeLocale = "zh-CN";
let countdownTimerId = null;
let calendarMonthKeys = [];
let activeCalendarMonthIndex = 0;

let latestPayload = null;
let missionHighlightTimerId = null;

const imageObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const src = el.dataset.src;
        if (src) {
          el.style.backgroundImage = `linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.72)), url("${src}")`;
          el.classList.add("is-loaded");
        }
        observer.unobserve(el);
      }
    });
  },
  { rootMargin: "200px" }
);

function resolveLocale(preferred) {
  if (preferred && translations[preferred]) {
    return preferred;
  }

  if (preferred && preferred.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }

  return "en";
}

function getNestedTranslation(key, locale = activeLocale) {
  return key
    .split(".")
    .reduce((value, segment) => value?.[segment], translations[locale]);
}

function t(key, replacements = {}, locale = activeLocale) {
  const template =
    getNestedTranslation(key, locale) ?? getNestedTranslation(key, "en") ?? key;

  if (typeof template !== "string") {
    return String(template ?? key);
  }

  return template.replace(/\{(\w+)\}/g, (_, token) => {
    return replacements[token] ?? "";
  });
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

  if (latestPayload) {
    renderCalendar(latestPayload.missions);
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

function updateSubscriptionLinks() {
  const httpUrl = new URL("/spacex.ics", window.location.href);
  const webcalProtocol = "webcal:";
  const webcal = `${webcalProtocol}//${httpUrl.host}${httpUrl.pathname}`;

  calendarLink.href = webcal;
  icsUrl.textContent = httpUrl.toString();
  webcalUrl.textContent = webcal;
}

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

  if (timeZone) {
    options.timeZone = timeZone;
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

const titleCase = (value) =>
  value
    ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : t("mission.unspecified");

function buildMissionAnchorId(mission) {
  return `mission-${mission.slug || mission.correlationId || mission.id}`;
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
  const monthMissions = missions.filter(
    (mission) => getCalendarMonthKey(mission.launchAt) === monthKey
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
    link.href = `#${buildMissionAnchorId(mission)}`;

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

    if (mission.isLive) {
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

    const type = document.createElement("span");
    type.textContent = localizeMissionType(mission.missionType);
    meta.append(type);

    details.append(title, meta);
    link.append(dateBox, details);
    
    link.addEventListener("click", () => {
      window.setTimeout(() => {
        highlightMissionCard(buildMissionAnchorId(mission));
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

  const rows = [
    [t("overview.tracker.missionsLoaded"), String(total)],
    [t("overview.tracker.timedWindows"), String(trackedWindows)],
    [t("overview.tracker.liveNow"), String(liveCount)],
    [
      t("overview.tracker.viewerTimezone"),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ],
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
    hero.style.backgroundImage = `linear-gradient(180deg, rgba(3, 5, 8, 0.18), rgba(3, 5, 8, 0.92)), radial-gradient(circle at top, rgba(112, 133, 188, 0.24), transparent 34%), url("${nextLaunch.image}")`;
  }
}

async function loadLaunches() {
  renderSkeletons();
  try {
    const response = await fetch("/api/launches");

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    latestPayload = payload;

    calendarMonthKeys = getCalendarMonths(payload.missions);
    activeCalendarMonthIndex = Math.max(
      0,
      calendarMonthKeys.indexOf(getCalendarMonthKey(payload.nextLaunch?.launchAt))
    );
    renderHero(payload.nextLaunch);
    renderMonthSummary(payload.monthSummary);
    renderTracker(payload.missions);
    renderCalendar(payload.missions);

    renderMissions(payload.missions);
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
    latestPayload = null;
    calendarMonthKeys = [];
    activeCalendarMonthIndex = 0;
    renderCalendar([]);

    missionsGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

function initializeLocale() {
  activeLocale = resolveLocale(navigator.language);
  applyStaticTranslations();
}

initializeLocale();
updateSubscriptionLinks();

window.addEventListener("hashchange", () => {
  highlightMissionCardFromHash();
});


document.addEventListener("click", (event) => {
  const btn = event.target.closest(".calendar-nav-button");
  if (!btn || !latestPayload) {
    return;
  }

  if (btn.id === "calendar-prev") {
    if (activeCalendarMonthIndex > 0) {
      activeCalendarMonthIndex -= 1;
      renderCalendar(latestPayload.missions);
    }
  } else if (btn.id === "calendar-next") {
    if (activeCalendarMonthIndex < calendarMonthKeys.length - 1) {
      activeCalendarMonthIndex += 1;
      renderCalendar(latestPayload.missions);
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
