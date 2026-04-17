const hero = document.querySelector("#hero");
const heroTitle = document.querySelector("#hero-title");
const heroDescription = document.querySelector("#hero-description");
const nextWindow = document.querySelector("#next-window");
const nextType = document.querySelector("#next-type");
const countdown = document.querySelector("#countdown");
const monthStrip = document.querySelector("#month-strip");
const tracker = document.querySelector("#tracker");
const missionsGrid = document.querySelector("#missions-grid");
const refreshNote = document.querySelector("#refresh-note");
const missionCardTemplate = document.querySelector("#mission-card-template");
const icsLink = document.querySelector("#ics-link");
const icsUrl = document.querySelector("#ics-url");
const webcalUrl = document.querySelector("#webcal-url");

function updateSubscriptionLinks() {
  const httpUrl = new URL("/spacex.ics", window.location.href);
  const webcalProtocol =
    window.location.protocol === "https:" ? "webcal:" : "webcal:";
  const webcal = `${webcalProtocol}//${httpUrl.host}${httpUrl.pathname}`;

  icsLink.href = httpUrl.toString();
  icsUrl.textContent = httpUrl.toString();
  webcalUrl.textContent = webcal;
}

const formatDateTime = (iso, withZone = true) => {
  if (!iso) {
    return "TBD";
  }

  const options = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  if (withZone) {
    options.timeZoneName = "short";
  }

  return new Intl.DateTimeFormat(undefined, options).format(new Date(iso));
};

const formatDateTimeUtc = (iso) => {
  if (!iso) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
};

const titleCase = (value) =>
  value
    ? value
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Unspecified";

function renderMonthSummary(summary) {
  monthStrip.replaceChildren();

  if (!summary.length) {
    const empty = document.createElement("p");
    empty.textContent = "No launch windows are available yet.";
    monthStrip.append(empty);
    return;
  }

  for (const item of summary) {
    const pill = document.createElement("article");
    pill.className = "month-pill";
    pill.innerHTML = `<strong>${item.count}</strong><span>${item.label}</span>`;
    monthStrip.append(pill);
  }
}

function renderTracker(missions) {
  tracker.replaceChildren();

  const total = missions.length;
  const liveCount = missions.filter((mission) => mission.isLive).length;
  const trackedWindows = missions.filter((mission) => mission.launchAt).length;

  const rows = [
    ["Missions loaded", String(total)],
    ["Timed windows", String(trackedWindows)],
    ["Live now", String(liveCount)],
    ["Viewer timezone", Intl.DateTimeFormat().resolvedOptions().timeZone],
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
    return "Launch timing has not been published yet.";
  }

  if (mission.launchWindow.close) {
    return `Window: ${formatDateTime(mission.launchWindow.open)} to ${formatDateTime(
      mission.launchWindow.close
    )}`;
  }

  return `Launch target: ${formatDateTime(mission.launchAt)} · ${formatDateTimeUtc(
    mission.launchAt
  )}`;
}

function renderMissions(missions) {
  missionsGrid.replaceChildren();

  if (!missions.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No upcoming SpaceX missions were returned by the live data feed.";
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

    badge.textContent = mission.isLive ? "Live" : titleCase(mission.status);
    type.textContent = titleCase(mission.missionType);
    title.textContent = mission.title;
    windowText.textContent = missionWindowCopy(mission);
    vehicle.textContent = mission.vehicle || "TBD";
    launchSite.textContent = mission.launchSite || "TBD";
    returnSite.textContent = mission.returnSite || "TBD";

    if (mission.image) {
      image.style.backgroundImage = `linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.72)), url("${mission.image}")`;
    }

    card.dataset.mission = mission.slug || mission.correlationId;
    missionsGrid.append(fragment);
  }
}

function startCountdown(nextLaunch) {
  const update = () => {
    if (!nextLaunch?.launchAt) {
      countdown.textContent = "Awaiting time";
      return;
    }

    const diff = Date.parse(nextLaunch.launchAt) - Date.now();

    if (diff <= 0) {
      countdown.textContent = "Window open";
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdown.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  update();
  window.setInterval(update, 1000);
}

function renderHero(nextLaunch) {
  if (!nextLaunch) {
    heroTitle.textContent = "No upcoming missions";
    heroDescription.textContent = "The live mission feed did not return any upcoming launches.";
    nextWindow.textContent = "TBD";
    nextType.textContent = "/spacex.ics";
    countdown.textContent = "Unavailable";
    return;
  }

  heroTitle.textContent = nextLaunch.title;
  heroDescription.textContent = `${nextLaunch.vehicle || "Vehicle TBD"} from ${
    nextLaunch.launchSite || "site pending"
  } with recovery at ${nextLaunch.returnSite || "an unlisted site"}.`;
  nextWindow.textContent = nextLaunch.launchAt ? formatDateTime(nextLaunch.launchAt) : "TBD";
  nextType.textContent = "/spacex.ics";

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
    refreshNote.textContent = `Refreshed ${new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(payload.refreshedAt))}`;
    startCountdown(payload.nextLaunch);
  } catch (error) {
    heroTitle.textContent = "Launch data unavailable";
    heroDescription.textContent =
      "The local proxy could not reach the SpaceX mission feeds just now.";
    nextWindow.textContent = "Retry later";
    nextType.textContent = "Unavailable";
    countdown.textContent = "Unavailable";
    missionsGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

updateSubscriptionLinks();
loadLaunches();
