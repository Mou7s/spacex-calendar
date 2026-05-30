export const CONTENT_URL =
  "https://content.spacex.com/api/spacex-website/launches-page-tiles/upcoming";
export const ALL_LAUNCHES_URL =
  "https://content.spacex.com/api/spacex-website/launches-page-tiles";
export const TIMINGS_URL =
  "https://sxcontent9668.azureedge.us/cms-assets/future_missions.json";
export const MISSION_DETAILS_URL =
  "https://content.spacex.com/api/spacex-website/missions";
export const HISTORY_LIMIT = 50;

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
    tile.imageDesktop?.url ||
    tile.imageDesktop?.formats?.large?.url ||
    tile.imageDesktop?.formats?.medium?.url ||
    tile.imageMobile?.url ||
    tile.imageMobile?.formats?.large?.url ||
    null
  );
}

export function resolveMediaAsset(asset) {
  if (!asset) {
    return null;
  }

  return {
    url:
      asset.formats?.large?.url ||
      asset.formats?.medium?.url ||
      asset.url ||
      null,
    originalUrl: asset.url || null,
    alt: asset.alternativeText || asset.caption || asset.name || null,
    width: asset.width || null,
    height: asset.height || null,
    mime: asset.mime || null,
  };
}

export function buildMissionUrl(slug) {
  return slug
    ? `https://www.spacex.com/launches/${slug}/`
    : "https://www.spacex.com/launches/";
}

export function stripHtml(value) {
  return String(value || "")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractLinksFromHtml(value) {
  const links = [];
  const html = String(value || "");
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = pattern.exec(html))) {
    links.push({
      href: match[1],
      text: stripHtml(match[2]),
    });
  }

  return links;
}

export function normalizeTimeline(timeline) {
  if (!timeline) {
    return null;
  }

  return {
    title: timeline.title || timeline.name || null,
    disclaimer: timeline.disclaimer || null,
    timeHeader: timeline.timeHeader || null,
    descriptionHeader: timeline.descriptionHeader || null,
    entries: (timeline.timelineEntries || []).map((entry) => ({
      time: entry.time || null,
      description: entry.description || null,
    })),
  };
}

export function buildWebcastUrl(webcast) {
  if (!webcast?.videoId) {
    return null;
  }

  if (webcast.streamingVideoType === "youtube") {
    return `https://www.youtube.com/watch?v=${webcast.videoId}`;
  }

  if (webcast.streamingVideoType === "x.com") {
    return `https://x.com/SpaceX/status/${webcast.videoId}`;
  }

  return null;
}

export function normalizeMissionDetails(details) {
  const paragraphs = (details.paragraphs || []).map((paragraph) => ({
    html: paragraph.content || "",
    text: stripHtml(paragraph.content),
    links: extractLinksFromHtml(paragraph.content),
  }));

  return {
    id: details.id,
    documentId: details.documentId || null,
    correlationId: details.correlationId || null,
    slug: details.missionId || null,
    missionUrl: buildMissionUrl(details.missionId),
    title: details.title || null,
    callToAction: details.callToAction || null,
    endDate: details.endDate || null,
    flags: {
      followDragonEnabled: Boolean(details.followDragonEnabled),
      vehicleTrackerEnabled: Boolean(details.vehicleTrackerEnabled),
      returnFromIssEnabled: Boolean(details.returnFromIssEnabled),
      toTheIssEnabled: Boolean(details.toTheIssEnabled),
      toTheIssTense: details.toTheIssTense || null,
    },
    summary: paragraphs.map((paragraph) => paragraph.text).filter(Boolean).join("\n\n"),
    paragraphs,
    media: {
      imageDesktop: resolveMediaAsset(details.imageDesktop),
      imageMobile: resolveMediaAsset(details.imageMobile),
      videoDesktop: resolveMediaAsset(details.videoDesktop),
      videoMobile: resolveMediaAsset(details.videoMobile),
      infographicDesktop: resolveMediaAsset(details.infographicDesktop),
      infographicMobile: resolveMediaAsset(details.infographicMobile),
    },
    timelines: {
      preLaunch: normalizeTimeline(details.preLaunchTimeline),
      postLaunch: normalizeTimeline(details.postLaunchTimeline),
    },
    astronauts: (details.astronauts || []).map((astronaut) => ({
      name: astronaut.name || astronaut.title || null,
      role: astronaut.role || null,
      image: resolveMediaAsset(astronaut.image || astronaut.imageDesktop),
    })),
    webcasts: (details.webcasts || []).map((webcast) => ({
      id: webcast.id,
      title: webcast.title || null,
      date: webcast.date || null,
      videoId: webcast.videoId || null,
      streamingVideoType: webcast.streamingVideoType || null,
      isFeatured: Boolean(webcast.isFeatured),
      url: buildWebcastUrl(webcast),
      imageDesktop: resolveMediaAsset(webcast.imageDesktop),
      imageMobile: resolveMediaAsset(webcast.imageMobile),
    })),
  };
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

export function resolveHistoryImage(launch) {
  return resolveImage(launch);
}

export function resolvePastLaunchAt(tile) {
  if (!tile.launchDate) {
    return null;
  }

  const time = tile.launchTime || "00:00:00";
  const parsed = Date.parse(`${tile.launchDate}T${time}Z`);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

export function normalizeHistoryMission(tile) {
  const launchAt = resolvePastLaunchAt(tile);

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
    image: resolveHistoryImage(tile),
    launchAt,
    returnAt: null,
    launchWindow: {
      open: launchAt,
      close: null,
      tZero: launchAt,
      precision: tile.launchTime ? "exact" : "day",
    },
    success: tile.missionStatus === "final" ? true : null,
    details: null,
    links: {
      article: null,
      webcast: null,
      wikipedia: null,
    },
  };
}

export function sortMissions(missions) {
  return [...missions].sort((left, right) => {
    const leftTime = left.launchAt ? Date.parse(left.launchAt) : Number.MAX_SAFE_INTEGER;
    const rightTime = right.launchAt ? Date.parse(right.launchAt) : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

export function isFutureMission(mission, now = new Date()) {
  if (mission.isLive) {
    return true;
  }

  if (!mission.launchAt) {
    return true;
  }

  const launchAt = Date.parse(mission.launchAt);
  const currentTime = now instanceof Date ? now.getTime() : Date.parse(now);

  if (Number.isNaN(launchAt) || Number.isNaN(currentTime)) {
    return true;
  }

  return launchAt >= currentTime;
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

  const eventDtStamp = mission.firstDiscovered ? formatIcsDate(mission.firstDiscovered) : dtStamp;
  const eventLastModified = mission.lastModified ? formatIcsDate(mission.lastModified) : dtStamp;
  const eventSequence = mission.sequence ?? sequence;

  const lines = [
    "BEGIN:VEVENT",
    `UID:${mission.correlationId || mission.id}@spacexcalendar.local`,
    `DTSTAMP:${eventDtStamp}`,
    `LAST-MODIFIED:${eventLastModified}`,
    `SEQUENCE:${eventSequence}`,
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

export async function loadLaunchData(fetchImpl = fetch, now = new Date()) {
  const [tilesResult, timingsResult] = await Promise.allSettled([
    fetchJson(fetchImpl, CONTENT_URL),
    fetchJson(fetchImpl, TIMINGS_URL),
  ]);

  if (tilesResult.status === "rejected") {
    throw new Error(`Failed to load upcoming tiles: ${tilesResult.reason.message || tilesResult.reason}`);
  }

  const tiles = tilesResult.value;
  let timings = {};

  if (timingsResult.status === "fulfilled") {
    timings = timingsResult.value;
  } else {
    console.warn("Graceful degradation: Failed to load timings data, falling back to empty timings", timingsResult.reason);
  }

  const missions = sortMissions(
    tiles
      .map((tile) => normalizeMission(tile, timings[tile.correlationId]))
      .filter((mission) => isFutureMission(mission, now))
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

export async function loadMissionDetails(slug, fetchImpl = fetch) {
  const normalizedSlug = String(slug || "").trim();

  if (!/^[a-z0-9-]+$/i.test(normalizedSlug)) {
    throw new Error("Invalid mission slug");
  }

  const details = await fetchJson(fetchImpl, `${MISSION_DETAILS_URL}/${normalizedSlug}`);

  return {
    refreshedAt: new Date().toISOString(),
    source: {
      mission: `${MISSION_DETAILS_URL}/${normalizedSlug}`,
    },
    details: normalizeMissionDetails(details),
  };
}

export async function loadHistoryLaunchData(fetchImpl = fetch) {
  const tiles = await fetchJson(fetchImpl, ALL_LAUNCHES_URL);
  const missions = tiles
    .filter((tile) => tile.missionStatus === "final")
    .map(normalizeHistoryMission)
    .filter((mission) => mission.launchAt)
    .sort((left, right) => Date.parse(right.launchAt) - Date.parse(left.launchAt))
    .slice(0, HISTORY_LIMIT);

  return {
    refreshedAt: new Date().toISOString(),
    source: {
      launches: ALL_LAUNCHES_URL,
    },
    missions,
  };
}
