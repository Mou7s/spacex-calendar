/**
 * SpaceX 发射日历 - 核心数据处理与标准转换工具库
 * 本文件运行在 Cloudflare Workers / Pages 边缘计算环境，负责与 SpaceX 官网 API 对接，
 * 执行数据拉取、数据清洗、规范化以及输出 RFC 5545 标准的 ICS 订阅数据源。
 */

// ==========================================
// 1. 官方 API 端点与常量定义
// ==========================================

// SpaceX 官网“即将发射任务”的卡片（Tiles）数据源
export const CONTENT_URL =
  "https://content.spacex.com/api/spacex-website/launches-page-tiles/upcoming";

// SpaceX 官网“有史以来所有发射任务（含历史已完成）”的数据源
export const ALL_LAUNCHES_URL =
  "https://content.spacex.com/api/spacex-website/launches-page-tiles";

// 托管在 Azure CDN 上的高精度发射时间/倒计时配置文件（驱动官网首屏倒计时时钟）
export const TIMINGS_URL =
  "https://sxcontent9668.azureedge.us/cms-assets/future_missions.json";

// 获取特定发射任务（Mission）深度图文及图解详情的 API 前缀
export const MISSION_DETAILS_URL =
  "https://content.spacex.com/api/spacex-website/missions";

// 历史已完成发射记录的展示上限数量
export const HISTORY_LIMIT = 50;

// ==========================================
// 2. 基础辅助与时间转换工具函数
// ==========================================

/**
 * 将秒级 Unix 时间戳转换为标准 ISO 8601 字符串格式
 * JavaScript 内部的 Date 接收毫秒数，而 SpaceX 接口主要输出秒数，故需做此换算。
 * @param {number} value - 秒级 Unix 时间戳
 * @returns {string|null} ISO 8601 字符串或 null
 */
export function toIsoFromSeconds(value) {
  // 安全容错校验：防止 false、null、undefined 或 NaN 等无效输入导致运行报错
  // 数字 0 在 JS 中是 Falsy，但在时间戳里合法（代表1970年1月1日），故必须排除 0
  if (!value && value !== 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

/**
 * 解析并标准化 SpaceX 精确的发射窗口时间
 * 智能读取 timing 结构，实现多级退步容错，确保一定能得到一个有效的时间。
 * @param {object} timing - 官方 timings 接口中对应任务的时间对象
 * @returns {object} 标准化后的窗口时间对象
 */
export function resolveWindow(timing) {
  // 如果当前任务没有时间配置，返回空的默认值对象
  if (!timing) {
    return {
      open: null,
      close: null,
      tZero: null,
      precision: "unknown",
    };
  }

  // 转换深层嵌套的秒级时间戳为 ISO 格式
  const open = toIsoFromSeconds(timing.PrimaryLaunchWindow?.Open?.Seconds);
  const close = toIsoFromSeconds(timing.PrimaryLaunchWindow?.Close?.Seconds);
  const tZero = toIsoFromSeconds(timing.TZeroLaunchDate?.Seconds);
  const primary = toIsoFromSeconds(timing.PrimaryLaunchDate?.Seconds);

  return {
    // 【退步容错链】：优先使用显式窗口开启时间，其次使用主定发射日期，最后用起飞点火点
    open: open || primary || tZero,
    close,
    tZero,
    // 精度判定：如果官方给出了主计划点火时间，精度设为 "exact"（精确），否则设为 "window"（模糊窗口）
    precision: timing.IsPrimaryLaunchTimeGiven ? "exact" : "window",
  };
}

/**
 * 提取并匹配最适合的首屏/卡片桌面及移动端背景图片
 * 优先读取桌面大图，逐级退步到移动端小图，避免前端图片加载挂起。
 * @param {object} tile - 原始 Upcoming/History 磁贴卡片对象
 * @returns {string|null} 图片的绝对 URL 链接或 null
 */
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

/**
 * 从 CMS 的媒体结构中解析并返回格式化后的媒体文件细节
 * 实现了响应式 URL 选取、原始大图直链存储、无障碍 alt 及物理规格的统一清洗。
 * @param {object} asset - CMS 原始媒体资源对象
 * @returns {object|null} 格式化后的标准媒体数据或 null
 */
export function resolveMediaAsset(asset) {
  if (!asset) {
    return null;
  }

  return {
    // 【性能优化】：展示用图按 large ➔ medium ➔ original 顺序匹配，大幅缩减页面体积
    url:
      asset.formats?.large?.url ||
      asset.formats?.medium?.url ||
      asset.url ||
      null,
    // 原始高解析度直链，用于 Lightbox 双击无损放大查看
    originalUrl: asset.url || null,
    // 无障碍友好：匹配替代描述 ➔ 标题 ➔ 资源文件名，确保 alt 绝对不空
    alt: asset.alternativeText || asset.caption || asset.name || null,
    width: asset.width || null,
    height: asset.height || null,
    mime: asset.mime || null,
  };
}

/**
 * 智能构建 SpaceX 官方该任务的完整网页超链接
 * @param {string} slug - 任务的唯一标识（Link/Slug）
 * @returns {string} 任务在官方网站的绝对 URL 地址
 */
export function buildMissionUrl(slug) {
  return slug
    ? `https://www.spacex.com/launches/${slug}/`
    : "https://www.spacex.com/launches/";
}

/**
 * 将带有富文本 HTML 标签的描述性内容清洗并转为标准的“纯文本”
 * 主要为了完美匹配日历 .ics 文件不支持 HTML 代码的规范。
 * @param {string} value - HTML 富文本字符串
 * @returns {string} 清洗完成的纯文本内容
 */
export function stripHtml(value) {
  return String(value || "")
    // 【精妙处理】：先将超链接 <a> 转换为 text (url) 的结构形式，确保链接地址不丢失
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    // 抹除其他所有 HTML 标签
    .replace(/<[^>]+>/g, "")
    // 反转义网页中常见的特殊 HTML 实体编码字符，换回真实符号
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // 将连续的换行符或多余空格合并为单空格，并去掉首尾多余空格
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 从 HTML 内容中检索并提取出所有的超链接对象数组
 * @param {string} value - 待搜索 of HTML 文本
 * @returns {Array} 包含 href 地址与纯净文本的超链接数据集合
 */
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

/**
 * 标准化深度详情接口中的时间线（Timeline）结构
 * @param {object} timeline - 原始 timeline 结构
 * @returns {object|null} 包含说明与纯文字时间线的标准化对象
 */
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

/**
 * 拼装单个直播视频（Webcast）的标准路由链接，适配 YouTube 和 X(Twitter) 的直播地址形式
 * @param {object} webcast - 原始 webcast 对象
 * @returns {string|null} 直播网页的绝对链接
 */
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

/**
 * 标准化任务详情大页面中加载的极其庞杂的 CMS 富元数据
 * 主要服务于 MissionDetail.vue 全全高清大图图解与 Lightbox 渲染。
 * @param {object} details - 原始 details 数据
 * @returns {object} 标准化后的详情结构
 */
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
    // 将所有的 paragraphs 的纯文本以双换行符拼接，合并为任务的摘要/简报
    summary: paragraphs.map((paragraph) => paragraph.text).filter(Boolean).join("\n\n"),
    paragraphs,
    // 解耦并解析各类尺寸的多媒体大图、视频与超清图解链接
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

/**
 * 转换合并 Upcoming Launch 磁贴数据与高精度倒计时数据
 * @param {object} tile - 原始 Tile 卡片大对象
 * @param {object} timing - 对应的 timings 数据对象
 * @returns {object} 统一规格的前后端异构数据实体
 */
export function normalizeMission(tile, timing) {
  // 解析此任务的发射时间窗口
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

/**
 * 转换历史已完成发射的时间日期字符
 * 因为已完成任务直接带有年月日和时分秒字符串，故在此将其转换为 ISO 8601 时间戳
 */
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

/**
 * 转换历史发射卡片数据，建立专门的标准化历史任务实体
 */
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
    // 历史发射直接构建虚拟的已确认 exact 发射窗口
    launchWindow: {
      open: launchAt,
      close: null,
      tZero: launchAt,
      precision: tile.launchTime ? "exact" : "day",
    },
    // 标记历史任务发射状态：成功 (true)
    success: tile.missionStatus === "final" ? true : null,
    details: null,
    links: {
      article: null,
      webcast: null,
      wikipedia: null,
    },
  };
}

/**
 * 对即将发射任务列表进行正序排序（按时间越近的排越前面）
 */
export function sortMissions(missions) {
  return [...missions].sort((left, right) => {
    const leftTime = left.launchAt ? Date.parse(left.launchAt) : Number.MAX_SAFE_INTEGER;
    const rightTime = right.launchAt ? Date.parse(right.launchAt) : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

/**
 * 校验当前任务是否应该保留在 Upcoming 列表和日历数据源中
 * 【核心直播保活机制】：如果一个任务处于 isLive 直播中状态，即使当前时间已经跨过了
 * 其原定的发射时间（即已成为过去式），系统也必须坚持判定为“未来/直播中任务”并保留。
 */
export function isFutureMission(mission, now = new Date()) {
  if (mission.isLive) {
    return true; // 直播保活：强行判定为即将发射任务，留住订阅及落地页直播间按钮
  }

  if (!mission.launchAt) {
    return true; // 没有日期的待定发射，一律保留
  }

  const launchAt = Date.parse(mission.launchAt);
  const currentTime = now instanceof Date ? now.getTime() : Date.parse(now);

  if (Number.isNaN(launchAt) || Number.isNaN(currentTime)) {
    return true;
  }

  return launchAt >= currentTime;
}

/**
 * 依据发射队列自动构建按月份分布的概览统计数据
 */
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

/**
 * 转换为首字母大写的 Title Case 书写规范
 */
export function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ==========================================
// 4. ICS 日历文件序列化生成器 (RFC 5545)
// ==========================================

/**
 * 针对 ICS 规范的特殊文本过滤与字符转义
 * 严格遵照 RFC 5545 标准对反斜杠、换行符、分号、逗号进行安全转义，防止日历解析出错。
 */
export function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * 格式化 ISO 日期时间字符串为 ICS 专用标准格式
 * 例如：2026-05-31T08:00:00.000Z ➔ 20260531T080000Z
 */
export function formatIcsDate(iso) {
  if (!iso) {
    return null;
  }

  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/**
 * 折叠过长的 ICS 行（RFC 5545 换行规则）
 * 每行上限 73 字符（包含换行本身），超长行折行时必须在行首额外填充一个空格。
 */
export function foldIcsLine(line) {
  const limit = 73;
  const parts = [];

  for (let index = 0; index < line.length; index += limit) {
    const chunk = line.slice(index, index + limit);
    parts.push(index === 0 ? chunk : ` ${chunk}`);
  }

  return parts.join("\r\n");
}

/**
 * 基于同步版本自增的 Sequence 生成
 */
export function buildSequence(value) {
  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    return 0;
  }

  return Math.floor(time / 1000);
}

/**
 * 拼装日历事件（VEVENT）的 Description 富备注文本
 */
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

/**
 * 构建单个标准的 VEVENT 块内容字符串
 * 【核心红线锁定】：UID 生成算法严格锁定为 UID:${correlationId || id}@spacexcalendar.local
 * 绝对严禁随意修改，否则会导致所有订阅用户的日历客户端中涌现重复日程！
 */
export function buildCalendarEvent(mission, dtStamp, sequence) {
  if (!mission.launchAt) {
    return null;
  }

  // 沿用首次发现日期、上次更新日期及版本号，防止频繁触发变动提示
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
    `URL:${mission.missionUrl || buildMissionUrl(mission.slug)}`,
    "END:VEVENT",
  ];

  // 如果有精确的发射窗口关闭时间，智能插入 DTEND 结束标记
  if (mission.launchWindow.close) {
    lines.splice(4, 0, `DTEND:${formatIcsDate(mission.launchWindow.close)}`);
  }

  return lines.map(foldIcsLine).join("\r\n");
}

/**
 * 聚合所有 VEVENT 块并输出符合规范的完整 VCALENDAR 字符串内容
 */
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

// ==========================================
// 5. 边缘网络数据拉取服务 (Edge Fetch Services)
// ==========================================

/**
 * 轻量且对 CDN 友好的数据抓取请求方法
 */
export async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "spaceXcalendar-cloudflare-worker",
    },
    // 支持 Cloudflare Workers 原生边缘缓存
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

/**
 * 对接上游，拉取合并并排序整理即将发射（Upcoming）的最新任务矩阵
 * 支持 GraphQL 磁贴和 precise 倒计时双源的优雅降级。
 */
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
    // 优雅降级：如果 timings 接口超时或挂掉，不阻断运行，使用空时间降级
    console.warn("Graceful degradation: Failed to load timings data, falling back to empty timings", timingsResult.reason);
  }

  // 转换、过滤并按时间线升序正排发射任务
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
    // 自动抓取队列中最早的时间健全的任务作为“下一次发射”的锁定聚焦项
    nextLaunch: missions.find((mission) => mission.launchAt) || missions[0] || null,
    monthSummary: buildMonthSummary(missions),
    missions,
  };
}

/**
 * 依照任务标识，深度抓取并还原特定发射任务的高清详情内容与发射前后时间线
 */
export async function loadMissionDetails(slug, fetchImpl = fetch) {
  const normalizedSlug = String(slug || "").trim();

  // 正则强制隔离防跨站及目录越权访问
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

/**
 * 拉取并洗涤最近 50 次已成功完成发射的 SpaceX 历史发射清单
 */
export async function loadHistoryLaunchData(fetchImpl = fetch) {
  const tiles = await fetchJson(fetchImpl, ALL_LAUNCHES_URL);
  const missions = tiles
    .filter((tile) => tile.missionStatus === "final")
    .map(normalizeHistoryMission)
    .filter((mission) => mission.launchAt)
    // 降序反排：最近发生的事情摆在列表最顶端
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

// ==========================================
// 6. 多语言 AI 动态翻译服务 (Dynamic i18n Translation Services)
// ==========================================

// M2M100 支持的语言名称与 i18n locale 的映射映射
export const M2M100_LANG_MAP = {
  'zh-CN': 'chinese',
  'ja': 'japanese',
  'ko': 'korean',
  'es': 'spanish',
  'fr': 'french',
  'de': 'german'
}

// 针对标准航天和 SpaceX 发射时间线条目进行高精度、零延迟的本地字典直译
// 如果没有匹配的字典项，则返回 null，由大语言模型 fallback 兜底翻译。
export function getStandardTranslation(text, targetLang) {
  if (!text) return null

  // 清理字符串：去除首尾空格、转换为小写，并且仅保留英文字母和数字字符，以规避各种标点、空格差异
  const clean = String(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^a-z0-9]/g, '')

  const translations = {
    // 发射前阶段 (Pre-launch)
    "spacexlaunchdirectorverifiesgoforpropellantload": {
      "zh-CN": "SpaceX 发射主管确认允许加注推进剂",
      "ja": "SpaceXの打上げディレクターが推進剤充填のGO判断を検証",
      "ko": "SpaceX 발사 디렉터가 추진제 주입 승인 확인",
      "es": "El Director de Lanzamiento de SpaceX verifica el visto bueno para la carga de propulsor",
      "fr": "Le directeur de lancement de SpaceX vérifie le feu vert pour le remplissage des ergols",
      "de": "SpaceX-Startleiter bestätigt Freigabe für Treibstoffbefüllung"
    },
    "rp1loadingbegins": {
      "zh-CN": "RP-1（航空煤油）加注开始",
      "ja": "RP-1（ロケットグレード灯油）の充填開始",
      "ko": "RP-1(로켓 등급 등유) 주입 시작",
      "es": "Comienza la carga de RP-1 (queroseno de grado de cohete)",
      "fr": "Le remplissage en RP-1 (kérosène de qualité fusée) commence",
      "de": "Befüllung mit RP-1 (Raketenkerosin) beginnt"
    },
    "rp1rocketgradekeroseneloadingbegins": {
      "zh-CN": "RP-1（航空煤油）加注开始",
      "ja": "RP-1（ロケットグレード灯油）の充填開始",
      "ko": "RP-1(로켓 등급 등유) 주입 시작",
      "es": "Comienza la carga de RP-1 (queroseno de grado de cohete)",
      "fr": "Le remplissage en RP-1 (kérosène de quality fusée) commence",
      "de": "Befüllung mit RP-1 (Raketenkerosin) beginnt"
    },
    "1ststageloxliquidoxygenloadingbegins": {
      "zh-CN": "一级液氧（LOX）加注开始",
      "ja": "第1段液体酸素（LOX）の充填開始",
      "ko": "1단 액체산소(LOX) 주입 시작",
      "es": "Comienza la carga de LOX (oxígeno líquido) de la 1.ª etapa",
      "fr": "Le remplissage en LOX (oxygène liquide) du 1er étage commence",
      "de": "Befüllung der 1. Stufe mit LOX (flüssigem Sauerstoff) beginnt"
    },
    "1ststageloxloadingbegins": {
      "zh-CN": "一级液氧（LOX）加注开始",
      "ja": "第1段液体酸素（LOX）の充填開始",
      "ko": "1단 액체산소(LOX) 주입 시작",
      "es": "Comienza la carga de LOX de la 1.ª etapa",
      "fr": "Le remplissage en LOX du 1er étage commence",
      "de": "Befüllung der 1. Stufe mit LOX begins"
    },
    "2ndstageloxloadingbegins": {
      "zh-CN": "二级液氧（LOX）加注开始",
      "ja": "第2段液体酸素（LOX）の充填開始",
      "ko": "2단 액체산소(LOX) 주입 시작",
      "es": "Comienza la carga de LOX de la 2.ª etapa",
      "fr": "Le remplissage en LOX du 2e étage commence",
      "de": "Befüllung der 2. Stufe mit LOX beginnt"
    },
    "falcon9beginsenginechillpriortolaunch": {
      "zh-CN": "猎鹰 9 号发动机发射前预冷开始",
      "ja": "打ち上げ前のファルコン9のエンジン冷却開始",
      "ko": "발사 전 팰컨 9 엔진 냉각 시작",
      "es": "El Falcon 9 comienza el enfriamiento del motor antes del lanzamiento",
      "fr": "Le Falcon 9 commence le refroidissement des moteurs avant le lancement",
      "de": "Falcon 9 beginnt mit der Triebwerkskühlung vor dem Start"
    },
    "falcon9beginsenginechill": {
      "zh-CN": "猎鹰 9 号发动机预冷开始",
      "ja": "ファルコン9のエンジン冷却開始",
      "ko": "팰컨 9 엔진冷却 시작",
      "es": "El Falcon 9 comienza el enfriamiento del motor",
      "fr": "Le Falcon 9 commence le refroidissement des moteurs",
      "de": "Falcon 9 beginnt mit der Triebwerkskühlung"
    },
    "commandflightcomputertobeginfinalprelaunchchecks": {
      "zh-CN": "控制飞行电脑开始进行最后的发射前检查",
      "ja": "フライトコンピューターに最終発射前チェックの開始を指令",
      "ko": "비행 컴퓨터에 최종 발사 전 점검 시작 명령",
      "es": "Se ordena al ordenador de vuelo iniciar las comprobaciones previas al lanzamiento",
      "fr": "Ordre à l'ordinateur de vol de commencer les vérifications pré-vol finales",
      "de": "Befehl an den Bordcomputer, die letzten Startvorbereitungsprüfungen zu starten"
    },
    "propellanttankpressurizationtoflightpressurebegins": {
      "zh-CN": "推进剂储罐开始增压至飞行压力",
      "ja": "推進剤タンクの飛行圧力への加圧開始",
      "ko": "추진제 탱크 비행 압력 가압 시작",
      "es": "Comienza la presurización del tanque de propulsor a presión de vuelo",
      "fr": "La pressurisation des réservoirs d'ergols à la pression de vol commence",
      "de": "Druckbeaufschlagung der Treibstofftanks auf Flugdruck beginnt"
    },
    "spacexlaunchdirectorverifiesgoforlaunch": {
      "zh-CN": "SpaceX 发射主管确认允许发射",
      "ja": "SpaceXの打上げディレクターが打上げのGO判断を検証",
      "ko": "SpaceX 발사 디렉터가 발사 승인 확인",
      "es": "El Director de Lanzamiento de SpaceX verifica el visto bueno para el lanzamiento",
      "fr": "Le directeur de lancement de SpaceX vérifie le feu vert pour le lancement",
      "de": "SpaceX-Startleiter bestätigt Freigabe für den Start"
    },
    "enginecontrollercommandsengineignitionsequencetostart": {
      "zh-CN": "发动机控制器发出发动机点火序列启动指令",
      "ja": "エンジンコントローラーがエンジン点火シーケンスの開始を指令",
      "ko": "엔진 제어기가 엔진 점화 시퀀스 시작 명령",
      "es": "El controlador del motor ordena el inicio de la secuencia de encendido del motor",
      "fr": "Le contrôleur des moteurs ordonne le démarrage de la séquence d'allumage",
      "de": "Triebwerkssteuerung befiehlt den Start der Zündsequenz"
    },
    "falcon9liftoff": {
      "zh-CN": "猎鹰 9 号发射升空",
      "ja": "ファルコン9打上げ",
      "ko": "팰컨 9 발사",
      "es": "Despegue del Falcon 9",
      "fr": "Décollage du Falcon 9",
      "de": "Falcon 9 hebt ab"
    },
    
    // 发射后阶段 (Post-launch)
    "maxq": {
      "zh-CN": "最大动力学压力 (Max Q)",
      "ja": "最大動圧 (Max Q)",
      "ko": "최대 동압 (Max Q)",
      "es": "Máxima presión dinámica (Max Q)",
      "fr": "Pression dynamique maximale (Max Q)",
      "de": "Maximale aerodynamische Belastung (Max Q)"
    },
    "maxqmomentofpeakmechanicalstressontherocket": {
      "zh-CN": "最大动力学压力 (Max Q)",
      "ja": "最大動圧 (Max Q)",
      "ko": "최대 동압 (Max Q)",
      "es": "Máxima presión dinámica (Max Q)",
      "fr": "Pression dynamique maximale (Max Q)",
      "de": "Maximale aerodynamische Belastung (Max Q)"
    },
    "maxqmomentofpeakmechanicalstressonthevehicle": {
      "zh-CN": "最大动力学压力 (Max Q)",
      "ja": "最大動圧 (Max Q)",
      "ko": "최대 동압 (Max Q)",
      "es": "Máxima presión dinámica (Max Q)",
      "fr": "Pression dynamique maximale (Max Q)",
      "de": "Maximale aerodynamische Belastung (Max Q)"
    },
    "1ststagemainenginecutoffmeco": {
      "zh-CN": "一级主发动机关闭 (MECO)",
      "ja": "第1段メインエンジン停止 (MECO)",
      "ko": "1단 주엔진 차단 (MECO)",
      "es": "Corte del motor principal de la 1.ª etapa (MECO)",
      "fr": "Arrêt des moteurs principaux du 1er étage (MECO)",
      "de": "Haupttriebwerksschluss der 1. Stufe (MECO)"
    },
    "1stand2ndstagesseparate": {
      "zh-CN": "一二级分离",
      "ja": "第1段と第2段の分离",
      "ko": "1단 및 2단 분리",
      "es": "Separación de la 1.ª y 2.ª etapa",
      "fr": "Séparation des 1er et 2e étages",
      "de": "Stufentrennung von 1. und 2. Stufe"
    },
    "stageseparation": {
      "zh-CN": "一二级分离",
      "ja": "第1段と第2段の分離",
      "ko": "1단 및 2단 분리",
      "es": "Separación de etapas",
      "fr": "Séparation des étages",
      "de": "Stufentrennung"
    },
    "2ndstageenginestartsses1": {
      "zh-CN": "二级发动机点火 (SES-1)",
      "ja": "第2段エンジン始動 (SES-1)",
      "ko": "2단 엔진 시동 (SES-1)",
      "es": "Encendido del motor de la 2.ª etapa (SES-1)",
      "fr": "Allumage du moteur du 2e étage (SES-1)",
      "de": "Zündung des Triebwerks der 2. Stufe (SES-1)"
    },
    "fairingseparation": {
      "zh-CN": "整流罩分离",
      "ja": "フェアリング分離",
      "ko": "페어링 분리",
      "es": "Separación de la cofia",
      "fr": "Séparation de la coiffe",
      "de": "Nutzlastverkleidungstrennung"
    },
    "fairingdeployment": {
      "zh-CN": "整流罩分离",
      "ja": "フェアリング展開",
      "ko": "페어링 전개",
      "es": "Despliegue de la cofia",
      "fr": "Déploiement de la coiffe",
      "de": "Nutzlastverkleidungsentfaltung"
    },
    "1ststageentryburnbegins": {
      "zh-CN": "一级助推器入口点火开始",
      "ja": "第1段エントリーバーン開始",
      "ko": "1단 대기진입 점화 시작",
      "es": "Comienza el encendido de entrada de la 1.ª etapa",
      "fr": "Début du freinage de rentrée du 1er étage",
      "de": "Wiedereintrittszündung der 1. Stufe beginnt"
    },
    "1ststageentryburnends": {
      "zh-CN": "一级助推器入口点火结束",
      "ja": "第1段エントリーバーン終了",
      "ko": "1단 대기진입 점화 종료",
      "es": "Termina el encendido de entrada de la 1.ª etapa",
      "fr": "Fin du freinage de rentrée du 1er étage",
      "de": "Wiedereintrittszündung der 1. Stufe beendet"
    },
    "1ststagelandingburnbegins": {
      "zh-CN": "一级助推器着陆点火开始",
      "ja": "第1段着陸バーン開始",
      "ko": "1단 착륙 점화 시작",
      "es": "Comienza el encendido de aterrizaje de la 1.ª etapa",
      "fr": "Début du freinage d'atterrissage du 1er étage",
      "de": "Landezündung der 1. Stufe beginnt"
    },
    "1ststagelanding": {
      "zh-CN": "一级助推器着陆",
      "ja": "第1段着陸",
      "ko": "1단 착륙",
      "es": "Aterrizaje de la 1.ª etapa",
      "fr": "Atterrissage du 1er étage",
      "de": "Landung der 1. Stufe"
    },
    "2ndstageenginecutoffseco1": {
      "zh-CN": "二级发动机关闭 (SECO-1)",
      "ja": "第2段エンジン停止 (SECO-1)",
      "ko": "2단 엔진 차단 (SECO-1)",
      "es": "Corte del motor de la 2.ª etapa (SECO-1)",
      "fr": "Arrêt du moteur du 2e étage (SECO-1)",
      "de": "Triebwerksschluss der 2. Stufe (SECO-1)"
    },
    "2ndstageenginestartsses2": {
      "zh-CN": "二级发动机点火 (SES-2)",
      "ja": "第2段エンジン始動 (SES-2)",
      "ko": "2단 엔진 시동 (SES-2)",
      "es": "Encendido del motor de la 2.ª etapa (SES-2)",
      "fr": "Allumage du moteur du 2e étage (SES-2)",
      "de": "Zündung des Triebwerks der 2. Stufe (SES-2)"
    },
    "2ndstageenginecutoffseco2": {
      "zh-CN": "二级发动机关闭 (SECO-2)",
      "ja": "第2段エンジン停止 (SECO-2)",
      "ko": "2단 엔진 차단 (SECO-2)",
      "es": "Corte del motor de la 2.ª etapa (SECO-2)",
      "fr": "Arrêt du moteur du 2e étage (SECO-2)",
      "de": "Triebwerksschluss der 2. Stufe (SECO-2)"
    },
    "starlinksatellitesdeploy": {
      "zh-CN": "星链卫星发射部署",
      "ja": "スターリンク衛星の放出",
      "ko": "스타링크 위성 배치",
      "es": "Despliegue de satélites Starlink",
      "fr": "Déploiement des satellites Starlink",
      "de": "Starlink-Satelliten werden ausgesetzt"
    },
    
    // 免责声明 (Disclaimers)
    "alltimesapproximate": {
      "zh-CN": "所有时间均为大约估计",
      "ja": "時間はすべておおよそです",
      "ko": "모든 시간은 대략적인 예정 시간입니다",
      "es": "Todos los tiempos son aproximados",
      "fr": "Tous les temps sont approximatifs",
      "de": "Alle Zeiten sind Richtwerte"
    },
    "countdownisapproximate": {
      "zh-CN": "倒计时仅供参考",
      "ja": "カウントダウンはおおよその目安です",
      "ko": "카운트다운은 대략적인 시간입니다",
      "es": "El inicio de la cuenta atrás es aproximado",
      "fr": "Le compte à rebours est approximatif",
      "de": "Countdown ist ein Richtwert"
    }
  }

  // 统一的语言键映射
  const langKeyMap = {
    'chinese': 'zh-CN',
    'japanese': 'ja',
    'korean': 'ko',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de'
  }

  const langKey = langKeyMap[targetLang] || targetLang
  const matched = translations[clean]
  
  if (matched && matched[langKey]) {
    return matched[langKey]
  }

  return null
}

// 针对不同语言定制的专业航天术语对照字典，避免跨语言翻译混淆与中英混杂
const GLOSSARIES = {
  chinese: `
   - "Falcon", "Falcon 9" or "Falcon Heavy" -> "猎鹰", "猎鹰 9 号" or "重型猎鹰"
   - "liftoff" or "lift-off" -> "发射升空"
   - "Starlink" -> "星链"
   - "MECO" (Main Engine Cut-off) -> "主发动机关闭 (MECO)"
   - "SECO" (Second Engine Cut-off) -> "二级发动机关闭 (SECO)"
   - "static fire" -> "静态点火测试"
   - "launch pad" or "pad" -> "发射台"
   - "booster" -> "助推器"
   - "fairing" -> "整流罩"
   - "autonomous spaceport drone ship" or "drone ship" -> "海上无人回收船"
   - "droneship" -> "海上无人回收船"
   - "landing zone" or "LZ" -> "陆地回收区"
   - "stage separation" -> "一二级分离"
   - "payload" -> "载荷"
   - "Raptor" or "Raptor engine" -> "猛禽" or "猛禽发动机"`,
  japanese: `
   - "Falcon", "Falcon 9" or "Falcon Heavy" -> "ファルコン", "ファルコン9" or "ファルコン・ヘビー"
   - "liftoff" or "lift-off" -> "打ち上げ" or "リフトオフ"
   - "Starlink" -> "スターリンク"
   - "MECO" (Main Engine Cut-off) -> "主力エンジン停止 (MECO)"
   - "SECO" (Second Engine Cut-off) -> "第2段エンジン停止 (SECO)"
   - "static fire" -> "スタティック・ファイア試験"
   - "launch pad" or "pad" -> "発射台"
   - "booster" -> "ブースター"
   - "fairing" -> "フェアリング"
   - "drone ship" or "droneship" -> "ドローン船"
   - "landing zone" or "LZ" -> "着陸帯"`,
  korean: `
   - "Falcon", "Falcon 9" or "Falcon Heavy" -> "팰컨", "팰컨 9" or "팰컨 헤비"
   - "liftoff" or "lift-off" -> "발사" or "이륙"
   - "Starlink" -> "스타링크"
   - "MECO" (Main Engine Cut-off) -> "주엔진 차단 (MECO)"
   - "SECO" (Second Engine Cut-off) -> "2단 엔진 차단 (SECO)"
   - "static fire" -> "정적 점화 시험"
   - "launch pad" or "pad" -> "발사대"
   - "booster" -> "부스터"
   - "fairing" -> "페어링"
   - "drone ship" or "droneship" -> "드론쉽"
   - "landing zone" or "LZ" -> "착륙 구역"`
}

// 针对短语和免责声明的 Few-shot 示例，约束大模型翻译的长度和风格，防止写小作文和脑补
const FEW_SHOT_EXAMPLES = {
  chinese: {
    input: {
      "preDisclaimer": "All times approximate",
      "preEntry_0": "Falcon 9 engine chilling",
      "postDisclaimer": "All times approximate",
      "postEntry_0": "Max Q (moment of peak mechanical stress on the rocket)",
      "postEntry_1": "Starlink satellites deploy"
    },
    output: {
      "preDisclaimer": "所有时间均为大约估计",
      "preEntry_0": "猎鹰 9 号发动机开始冷却",
      "postDisclaimer": "所有时间均为大约估计",
      "postEntry_0": "最大动力学压力 (Max Q)",
      "postEntry_1": "星链卫星发射部署"
    }
  },
  japanese: {
    input: {
      "preDisclaimer": "All times approximate",
      "preEntry_0": "Falcon 9 engine chilling",
      "postDisclaimer": "All times approximate",
      "postEntry_0": "Max Q (moment of peak mechanical stress on the rocket)",
      "postEntry_1": "Starlink satellites deploy"
    },
    output: {
      "preDisclaimer": "時間はすべておおよそです",
      "preEntry_0": "ファルコン9のエンジン冷却開始",
      "postDisclaimer": "時間はすべておおよそです",
      "postEntry_0": "最大動圧 (Max Q)",
      "postEntry_1": "スターリンク衛星の放出"
    }
  },
  korean: {
    input: {
      "preDisclaimer": "All times approximate",
      "preEntry_0": "Falcon 9 engine chilling",
      "postDisclaimer": "All times approximate",
      "postEntry_0": "Max Q (moment of peak mechanical stress on the rocket)",
      "postEntry_1": "Starlink satellites deploy"
    },
    output: {
      "preDisclaimer": "모든 시간은 대략적인 예정 시간입니다",
      "preEntry_0": "팰컨 9 엔진 냉각 시작",
      "postDisclaimer": "모든 시간은 대략적인 예정 시간입니다",
      "postEntry_0": "최대 동압 (Max Q)",
      "postEntry_1": "스타링크 위성 배치"
    }
  },
  spanish: {
    input: {
      "preDisclaimer": "All times approximate",
      "preEntry_0": "Falcon 9 engine chilling",
      "postDisclaimer": "All times approximate",
      "postEntry_0": "Max Q (moment of peak mechanical stress on the rocket)",
      "postEntry_1": "Starlink satellites deploy"
    },
    output: {
      "preDisclaimer": "Todos los tiempos son aproximados",
      "preEntry_0": "Enfriamiento del motor del Falcon 9",
      "postDisclaimer": "Todos los tiempos son aproximados",
      "postEntry_0": "Máxima presión dinámica (Max Q)",
      "postEntry_1": "Despliegue de satélites Starlink"
    }
  },
  french: {
    input: {
      "preDisclaimer": "All times approximate",
      "preEntry_0": "Falcon 9 engine chilling",
      "postDisclaimer": "All times approximate",
      "postEntry_0": "Max Q (moment of peak mechanical stress on the rocket)",
      "postEntry_1": "Starlink satellites deploy"
    },
    output: {
      "preDisclaimer": "Tous les temps sont approximatifs",
      "preEntry_0": "Refroidissement des moteurs du Falcon 9",
      "postDisclaimer": "Tous les temps sont approximatifs",
      "postEntry_0": "Pression dynamique maximale (Max Q)",
      "postEntry_1": "Déploiement des satellites Starlink"
    }
  },
  german: {
    input: {
      "preDisclaimer": "All times approximate",
      "preEntry_0": "Falcon 9 engine chilling",
      "postDisclaimer": "All times approximate",
      "postEntry_0": "Max Q (moment of peak mechanical stress on the rocket)",
      "postEntry_1": "Starlink satellites deploy"
    },
    output: {
      "preDisclaimer": "Alle Zeiten sind Richtwerte",
      "preEntry_0": "Kühlung der Falcon 9-Triebwerke",
      "postDisclaimer": "Alle Zeiten sind Richtwerte",
      "postEntry_0": "Maximale aerodynamische Belastung (Max Q)",
      "postEntry_1": "Starlink-Satelliten werden ausgesetzt"
    }
  }
}

/**
 * 针对单个文本字段，调用 Cloudflare Workers AI 的 Llama 3.1 8B 大语言模型进行专业级航天翻译
 */
export async function translateText(ai, text, targetLang) {
  if (!text || !ai) return text

  // 1. 尝试匹配本地字典，如果匹配成功，直接返回译文以获得 0ms、100% 正确的结果
  const stdTranslation = getStandardTranslation(text, targetLang)
  if (stdTranslation) {
    return stdTranslation
  }

  const glossary = GLOSSARIES[targetLang] || ""
  const glossaryInstruction = glossary
    ? `Translate technical and aerospace terms accurately using this glossary: ${glossary}`
    : `Translate technical and aerospace terms accurately using standard industry terminology in ${targetLang}.`

  // 构造针对段落翻译的 Few-shot，进一步确立长度和直译风格
  let fewShotText = ""
  if (targetLang === "chinese") {
    fewShotText = `
Example 1:
Input: "Max Q"
Output: "最大动力学压力 (Max Q)"

Example 2:
Input: "SpaceX’s Falcon 9 is targeting the launch of 29 Starlink satellites to low-Earth orbit."
Output: "SpaceX 的猎鹰 9 号计划将 29 颗星链卫星发射到近地轨道。"`
  } else if (targetLang === "japanese") {
    fewShotText = `
Example 1:
Input: "Max Q"
Output: "最大動圧 (Max Q)"

Example 2:
Input: "SpaceX’s Falcon 9 is targeting the launch of 29 Starlink satellites to low-Earth orbit."
Output: "SpaceXのファルコン9は、29機のスターリンク衛星を近地軌道に打ち上げることを目指しています。"`
  }

  // 注入针对当前目标语言的环境提示词，彻底杜绝语言乱序与跨语种污染
  const systemPrompt = `You are a professional aerospace translator. Translate the given text from English to ${targetLang}. 
Follow these guidelines strictly:
1. ${glossaryInstruction}
2. Preserve all structural elements, newlines, lists, and spacing perfectly.
3. Keep product and program names such as SpaceX, Starlink, Falcon 9, Falcon Heavy, Dragon, Starship, and NASA unchanged unless the target language has a standard translated term.
4. Translate ONLY the given text. DO NOT explain terms. DO NOT add, invent, or hallucinate details, lists, timelines, or stories.
5. Keep the translation equivalent in length and details to the source text.
6. ONLY return the final translated text. DO NOT include any introductory remarks, markdown wraps (like \`\`\`), or explanations.
7. CRITICAL: If the input is a short phrase of 1-5 words, the output MUST be a short phrase of 1-5 words. Do NOT write a paragraph or summary.

${fewShotText}`

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.1, // 极低的温度系数，确保翻译高度准确、稳定、高度一致
      max_tokens: 150   // 限制生成字符数，截断任何脑补小作文
    })
    
    let translated = response?.result?.response || response?.response || text
    if (targetLang === 'chinese' && typeof translated === 'string') {
      translated = translated
        .replace(/拉普托/g, '猛禽')
        .replace(/拉普特/g, '猛禽')
    }
    return translated
  } catch (error) {
    console.error(`Workers AI LLM translation failed for text "${text.slice(0, 20)}...":`, error)
    return text // 异常时优雅降级：返回原始英文文本，确保系统正常响应
  }
}

export async function translateMissionDetails(ai, details, targetLang) {
  if (!ai || !details) return

  // 1. 第一阶段：独立翻译 summary（任务简报）
  // 彻底隔离简报的高级上下文，严防其污染和诱导时间线条目的翻译！
  if (details.summary) {
    details.summary = await translateText(ai, details.summary, targetLang)
  }

  // 2. 第二阶段：收集并尝试利用本地字典预翻译，非标项才交给大模型
  const timelineObj = {}
  const localTranslations = {} // 存储已通过字典翻译的项，以便后续还原

  const preLaunch = details.timelines?.preLaunch
  if (preLaunch) {
    if (preLaunch.disclaimer) {
      const dictVal = getStandardTranslation(preLaunch.disclaimer, targetLang)
      if (dictVal) {
        localTranslations.preDisclaimer = dictVal
      } else {
        timelineObj.preDisclaimer = preLaunch.disclaimer
      }
    }
    if (preLaunch.entries) {
      preLaunch.entries.forEach((entry, idx) => {
        if (entry.description) {
          const dictVal = getStandardTranslation(entry.description, targetLang)
          if (dictVal) {
            localTranslations[`preEntry_${idx}`] = dictVal
          } else {
            timelineObj[`preEntry_${idx}`] = entry.description
          }
        }
      })
    }
  }

  const postLaunch = details.timelines?.postLaunch
  if (postLaunch) {
    if (postLaunch.disclaimer) {
      const dictVal = getStandardTranslation(postLaunch.disclaimer, targetLang)
      if (dictVal) {
        localTranslations.postDisclaimer = dictVal
      } else {
        timelineObj.postDisclaimer = postLaunch.disclaimer
      }
    }
    if (postLaunch.entries) {
      postLaunch.entries.forEach((entry, idx) => {
        if (entry.description) {
          const dictVal = getStandardTranslation(entry.description, targetLang)
          if (dictVal) {
            localTranslations[`postEntry_${idx}`] = dictVal
          } else {
            timelineObj[`postEntry_${idx}`] = entry.description
          }
        }
      })
    }
  }

  // 应用本地字典的预翻译结果，确保匹配项能即刻加载
  const applyTranslations = (translatedMap) => {
    if (preLaunch) {
      if (translatedMap.preDisclaimer && preLaunch.disclaimer) {
        preLaunch.disclaimer = String(translatedMap.preDisclaimer).trim()
      }
      if (preLaunch.entries) {
        preLaunch.entries.forEach((entry, idx) => {
          const key = `preEntry_${idx}`
          if (translatedMap[key] && entry.description) {
            entry.description = String(translatedMap[key]).trim()
          }
        })
      }
    }
    if (postLaunch) {
      if (translatedMap.postDisclaimer && postLaunch.disclaimer) {
        postLaunch.disclaimer = String(translatedMap.postDisclaimer).trim()
      }
      if (postLaunch.entries) {
        postLaunch.entries.forEach((entry, idx) => {
          const key = `postEntry_${idx}`
          if (translatedMap[key] && entry.description) {
            entry.description = String(translatedMap[key]).trim()
          }
        })
      }
    }
  }

  // 立即将已有的本地翻译写回
  applyTranslations(localTranslations)

  // 3. 如果所有项都已经通过本地字典翻译完成，无需再调用 Workers AI，直接返回
  if (Object.keys(timelineObj).length === 0) return

  const glossary = GLOSSARIES[targetLang] || ""
  const glossaryInstruction = glossary
    ? `Translate technical and aerospace terms accurately using this glossary: ${glossary}`
    : `Translate technical and aerospace terms accurately using standard industry terminology in ${targetLang}.`

  // 构造针对时间线条目的 few-shot 示例，强力约束大模型遵循简短翻译规范，禁止写背景小作文
  const example = FEW_SHOT_EXAMPLES[targetLang] || FEW_SHOT_EXAMPLES.spanish;
  const fewShotInstruction = `
Your translations MUST follow this style and length strictly. Keep translations short and direct, mapping 1-to-1 without adding details or descriptions.
Example Input JSON:
${JSON.stringify(example.input, null, 2)}

Example Output JSON:
${JSON.stringify(example.output, null, 2)}
`;

  // 4. 构造用于 LLM 翻译的 JSON 对象 Prompt，确保 Key 严格 1-to-1 对齐，绝无顺序错位可能
  const systemPrompt = `You are a professional aerospace translator. Translate the given JSON object of English timeline entries and disclaimers into a JSON object of ${targetLang} strings.
Guidelines:
1. ${glossaryInstruction}
2. You MUST preserve the exact same keys in the output JSON object. Do NOT skip, delete, or rename any keys.
3. Keep product and program names such as SpaceX, Starlink, Falcon 9, Falcon Heavy, Dragon, Starship, and NASA unchanged unless the target language has a standard translated term.
4. Translate ONLY the string values. DO NOT add, invent, or hallucinate any content, lists, timelines, or stories not present in the original values. Keep the translated values short, brief, and concise. Do NOT describe or explain the terms.
5. Respond ONLY with the final translated JSON object. Do not include any introductory remarks, explanations, or markdown wraps (like \`\`\`json or \`\`\`).
6. CRITICAL: For each key, the translated value MUST be equivalent in length to the original value. Keep them brief and 1-to-1. Do NOT expand them into paragraphs.

${fewShotInstruction}`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(timelineObj) }
      ],
      temperature: 0.1,
      max_tokens: 1000
    })

    let responseText = response?.result?.response || response?.response || ""
    responseText = responseText.trim()

    // 剔除可能存在的 markdown 代码块标记 (如 ```json ... ```)
    if (responseText.startsWith("```")) {
      responseText = responseText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    }

    const translatedObj = JSON.parse(responseText.trim())

    if (translatedObj && typeof translatedObj === 'object') {
      if (targetLang === 'chinese') {
        for (const key in translatedObj) {
          if (typeof translatedObj[key] === 'string') {
            translatedObj[key] = translatedObj[key]
              .replace(/拉普托/g, '猛禽')
              .replace(/拉普特/g, '猛禽')
          }
        }
      }
      // 合并 AI 翻译结果到 timelines
      applyTranslations(translatedObj)
      return
    } else {
      console.warn("JSON Translation returned an invalid object. Falling back to parallel individual translations.")
    }
  } catch (error) {
    console.error("Structured JSON object translation failed, falling back to parallel translations:", error)
  }

  // 5. 回退降级方案：若 JSON 翻译解析失败或不是对象，执行并行的独立翻译，防范数据错位
  const fallbackPromises = []

  if (preLaunch) {
    if (preLaunch.disclaimer && !localTranslations.preDisclaimer) {
      fallbackPromises.push((async () => {
        preLaunch.disclaimer = await translateText(ai, preLaunch.disclaimer, targetLang)
      })())
    }
    if (preLaunch.entries) {
      preLaunch.entries.forEach((entry, idx) => {
        const key = `preEntry_${idx}`
        if (entry.description && !localTranslations[key]) {
          fallbackPromises.push((async () => {
            entry.description = await translateText(ai, entry.description, targetLang)
          })())
        }
      })
    }
  }

  if (postLaunch) {
    if (postLaunch.disclaimer && !localTranslations.postDisclaimer) {
      fallbackPromises.push((async () => {
        postLaunch.disclaimer = await translateText(ai, postLaunch.disclaimer, targetLang)
      })())
    }
    if (postLaunch.entries) {
      postLaunch.entries.forEach((entry, idx) => {
        const key = `postEntry_${idx}`
        if (entry.description && !localTranslations[key]) {
          fallbackPromises.push((async () => {
            entry.description = await translateText(ai, entry.description, targetLang)
          })())
        }
      })
    }
  }

  await Promise.all(fallbackPromises)
}
