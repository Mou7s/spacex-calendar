const hero = document.querySelector("#hero");
const heroTitle = document.querySelector("#hero-title");
const heroDescription = document.querySelector("#hero-description");
const nextWindow = document.querySelector("#next-window");
const countdown = document.querySelector("#countdown");
const monthStrip = document.querySelector("#month-strip");
const tracker = document.querySelector("#tracker");
const missionsGrid = document.querySelector("#missions-grid");
const refreshNote = document.querySelector("#refresh-note");
const missionCardTemplate = document.querySelector("#mission-card-template");
const calendarLink = document.querySelector("#calendar-link");
const icsUrl = document.querySelector("#ics-url");
const webcalUrl = document.querySelector("#webcal-url");
const metaDescription = document.querySelector("#meta-description");

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
    },
    status: {
      upcoming: "即将进行",
      live: "直播中",
    },
  },
  en: {
    meta: {
      title: "SpaceX Launch Calendar",
      description: "Subscribe to an online ICS calendar and keep up with upcoming SpaceX launches.",
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
      loadingDescription: "Fetching the current mission queue and launch windows from SpaceX website feeds.",
      noMissionsTitle: "No upcoming missions",
      noMissionsDescription: "The live mission feed did not return any upcoming launches.",
      unavailableTitle: "Launch data unavailable",
      unavailableDescription: "The app could not reach the SpaceX mission feeds just now.",
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
      emptyState: "No upcoming SpaceX missions were returned by the live data feed.",
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
    },
    status: {
      upcoming: "Upcoming",
      live: "Live",
    },
  },
};

let activeLocale = "zh-CN";
let countdownTimerId = null;

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
  return key.split(".").reduce((value, segment) => value?.[segment], translations[locale]);
}

function t(key, replacements = {}, locale = activeLocale) {
  const template = getNestedTranslation(key, locale) ?? getNestedTranslation(key, "en") ?? key;

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
}

function localizeStatus(value) {
  if (!value) {
    return t("mission.unspecified");
  }

  return getNestedTranslation(`status.${value.toLowerCase()}`) || titleCase(value);
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
    ? value
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : t("mission.unspecified");

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

  return getNestedTranslation(`mission.types.${value.toLowerCase()}`) || titleCase(value);
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
    [t("overview.tracker.viewerTimezone"), Intl.DateTimeFormat().resolvedOptions().timeZone],
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

    badge.textContent = mission.isLive ? t("mission.live") : localizeStatus(mission.status);
    type.textContent = localizeMissionType(mission.missionType);
    title.textContent = mission.title;
    windowText.textContent = missionWindowCopy(mission);
    vehicle.textContent = mission.vehicle || t("mission.tbd");
    launchSite.textContent = mission.launchSite || t("mission.tbd");
    returnSite.textContent = mission.returnSite || t("mission.tbd");

    if (mission.image) {
      image.style.backgroundImage = `linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.72)), url("${mission.image}")`;
    }

    card.dataset.mission = mission.slug || mission.correlationId;
    missionsGrid.append(fragment);
  }
}

function startCountdown(nextLaunch) {
  if (countdownTimerId) {
    window.clearInterval(countdownTimerId);
    countdownTimerId = null;
  }

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

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdown.textContent = t("countdown.format", {
      days,
      hours,
      minutes,
      seconds,
    });
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
    return;
  }

  heroTitle.textContent = nextLaunch.title;
  heroDescription.textContent = t("hero.nextLaunchDescription", {
    vehicle: nextLaunch.vehicle || t("mission.tbd"),
    launchSite: nextLaunch.launchSite || t("mission.sitePending"),
    returnSite: nextLaunch.returnSite || t("mission.recoveryPending"),
  });
  nextWindow.textContent = nextLaunch.launchAt ? formatDateTime(nextLaunch.launchAt) : t("mission.tbd");

  if (nextLaunch.image) {
    hero.style.backgroundImage = `linear-gradient(180deg, rgba(3, 5, 8, 0.18), rgba(3, 5, 8, 0.92)), radial-gradient(circle at top, rgba(112, 133, 188, 0.24), transparent 34%), url("${nextLaunch.image}")`;
  }
}

async function loadLaunches() {
  try {
    const response = await fetch("/api/launches");

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    renderHero(payload.nextLaunch);
    renderMonthSummary(payload.monthSummary);
    renderTracker(payload.missions);
    renderMissions(payload.missions);
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
    missionsGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

function initializeLocale() {
  activeLocale = resolveLocale(navigator.language);
  applyStaticTranslations();
}

initializeLocale();
updateSubscriptionLinks();
loadLaunches();
