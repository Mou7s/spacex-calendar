export const CONTENT_URL =
  "https://content.spacex.com/api/spacex-website/launches-page-tiles/upcoming";
export const TIMINGS_URL =
  "https://sxcontent9668.azureedge.us/cms-assets/future_missions.json";

export function toIsoFromSeconds(value) {
  if (!value && value !== 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

export function resolveWindow(timing) {
  if (!timing) {
    return {
      open: null,
      close: null,
      tZero: null,
      precision: "unknown",
    };
  }

  const open = toIsoFromSeconds(timing.PrimaryLaunchWindow?.Open?.Seconds);
  const close = toIsoFromSeconds(timing.PrimaryLaunchWindow?.Close?.Seconds);
  const tZero = toIsoFromSeconds(timing.TZeroLaunchDate?.Seconds);
  const primary = toIsoFromSeconds(timing.PrimaryLaunchDate?.Seconds);

  return {
    open: open || primary || tZero,
    close,
    tZero,
    precision: timing.IsPrimaryLaunchTimeGiven ? "exact" : "window",
  };
}

export function resolveImage(tile) {
  return (
    tile.imageDesktop?.formats?.large?.url ||
    tile.imageDesktop?.formats?.medium?.url ||
    tile.imageDesktop?.url ||
    tile.imageMobile?.formats?.large?.url ||
    tile.imageMobile?.url ||
    null
  );
}

export function buildMissionUrl(slug) {
  return slug
    ? `https://www.spacex.com/launches/${slug}/`
    : "https://www.spacex.com/launches/";
}

export function normalizeMission(tile, timing) {
  const launchWindow = resolveWindow(timing);
  const launchAt = launchWindow.open;

  return {
    id: tile.id,
    correlationId: tile.correlationId,
    slug: tile.link,
    missionUrl: buildMissionUrl(tile.link),
    title: tile.title,
    shortTitle: tile.shortTitle,
    missionType: tile.missionType,
    vehicle: tile.vehicle,
    launchSite: tile.launchSite,
    returnSite: tile.returnSite,
    callToAction: tile.callToAction,
    status: tile.missionStatus,
    isLive: Boolean(tile.isLive),
    directToCell: Boolean(tile.directToCell),
    image: resolveImage(tile),
    launchAt,
    returnAt: tile.returnDateTime || null,
    launchWindow,
  };
}

export function sortMissions(missions) {
  return [...missions].sort((left, right) => {
    const leftTime = left.launchAt ? Date.parse(left.launchAt) : Number.MAX_SAFE_INTEGER;
    const rightTime = right.launchAt ? Date.parse(right.launchAt) : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

export function buildMonthSummary(missions) {
  const counts = new Map();

  for (const mission of missions) {
    if (!mission.launchAt) {
      continue;
    }

    const date = new Date(mission.launchAt);
    const isoMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    counts.set(isoMonth, (counts.get(isoMonth) || 0) + 1);
  }

  return Array.from(counts, ([isoMonth, count]) => ({
    isoMonth,
    label: isoMonth,
    count,
  }));
}

export function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function formatIcsDate(iso) {
  if (!iso) {
    return null;
  }

  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function foldIcsLine(line) {
  const limit = 73;
  const parts = [];

  for (let index = 0; index < line.length; index += limit) {
    const chunk = line.slice(index, index + limit);
    parts.push(index === 0 ? chunk : ` ${chunk}`);
  }

  return parts.join("\r\n");
}

export function buildSequence(value) {
  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    return 0;
  }

  return Math.floor(time / 1000);
}

export function buildMissionDescription(mission) {
  const lines = [
    mission.title,
    `Vehicle: ${mission.vehicle || "TBD"}`,
    `Launch site: ${mission.launchSite || "TBD"}`,
    `Return site: ${mission.returnSite || "TBD"}`,
    `Mission type: ${mission.missionType || "TBD"}`,
  ];

  if (mission.launchWindow.close) {
    lines.push(`Launch window closes: ${mission.launchWindow.close}`);
  }

  if (mission.slug) {
    lines.push(`Mission page slug: ${mission.slug}`);
  }

  lines.push("Source: https://www.spacex.com/launches/");

  return lines.join("\n");
}

export function buildCalendarEvent(mission, dtStamp, sequence) {
  if (!mission.launchAt) {
    return null;
  }

  const lines = [
    "BEGIN:VEVENT",
    `UID:${mission.correlationId || mission.id}@spacexcalendar.local`,
    `DTSTAMP:${dtStamp}`,
    `LAST-MODIFIED:${dtStamp}`,
    `SEQUENCE:${sequence}`,
    `DTSTART:${formatIcsDate(mission.launchAt)}`,
    `SUMMARY:${escapeIcsText(mission.title)}`,
    `DESCRIPTION:${escapeIcsText(buildMissionDescription(mission))}`,
    `LOCATION:${escapeIcsText(mission.launchSite || "TBD")}`,
    `STATUS:${mission.isLive ? "CONFIRMED" : "TENTATIVE"}`,
    "TRANSP:OPAQUE",
    `CATEGORIES:${escapeIcsText(titleCase(mission.missionType || "launch"))}`,
    `URL:${
      mission.missionUrl || buildMissionUrl(mission.slug)
    }`,
    "END:VEVENT",
  ];

  if (mission.launchWindow.close) {
    lines.splice(4, 0, `DTEND:${formatIcsDate(mission.launchWindow.close)}`);
  }

  return lines.map(foldIcsLine).join("\r\n");
}

export function buildCalendarFeed(data) {
  const dtStamp = formatIcsDate(data.refreshedAt || new Date().toISOString());
  const sequence = buildSequence(data.refreshedAt || new Date().toISOString());
  const events = data.missions
    .map((mission) => buildCalendarEvent(mission, dtStamp, sequence))
    .filter(Boolean)
    .join("\r\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//spaceXcalendar//SpaceX Launch Feed//EN",
    "X-WR-CALNAME:SpaceX Launches",
    "X-WR-CALDESC:Upcoming SpaceX launches generated from the live SpaceX website feeds.",
    "X-PUBLISHED-TTL:PT1H",
    events,
    "END:VCALENDAR",
  ];

  return `${lines.filter(Boolean).join("\r\n")}\r\n`;
}

export async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "spaceXcalendar-cloudflare-worker",
    },
    cf: {
      cacheEverything: true,
      cacheTtl: 300,
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }

  return response.json();
}

export async function loadLaunchData(fetchImpl = fetch) {
  const [tiles, timings] = await Promise.all([
    fetchJson(fetchImpl, CONTENT_URL),
    fetchJson(fetchImpl, TIMINGS_URL),
  ]);

  const missions = sortMissions(
    tiles.map((tile) => normalizeMission(tile, timings[tile.correlationId]))
  );

  return {
    refreshedAt: new Date().toISOString(),
    source: {
      tiles: CONTENT_URL,
      timings: TIMINGS_URL,
    },
    nextLaunch: missions.find((mission) => mission.launchAt) || missions[0] || null,
    monthSummary: buildMonthSummary(missions),
    missions,
  };
}
