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

/**
 * 针对单个文本字段，调用 Cloudflare Workers AI 翻译接口进行翻译
 */
export async function translateText(ai, text, targetLang) {
  if (!text || !ai) return text
  try {
    const response = await ai.run('@cf/meta/m2m100-1.2b', {
      text: text,
      source_lang: 'english',
      target_lang: targetLang
    })
    return response?.translated_text || text
  } catch (error) {
    console.error(`Workers AI translation failed for text "${text.slice(0, 20)}...":`, error)
    return text // 异常时优雅降级：返回原始英文文本，确保系统正常响应
  }
}

/**
 * 核心并发/合流翻译器：并行对任务简报 (summary)、时间线等关键字段进行 AI 多语言翻译
 * 采用 A 方案：大合流打包翻译（仅调用 1 次 AI），失败时自动回退为并发独立翻译，极速且健壮。
 */
export async function translateMissionDetails(ai, details, targetLang) {
  if (!ai || !details) return

  const segments = []
  const mapping = []

  // 1. 收集任务摘要/简报
  if (details.summary) {
    segments.push(details.summary)
    mapping.push({ type: 'summary' })
  }

  // 2. 收集发射前时间线及其免责声明
  const preLaunch = details.timelines?.preLaunch
  if (preLaunch) {
    if (preLaunch.disclaimer) {
      segments.push(preLaunch.disclaimer)
      mapping.push({ type: 'preDisclaimer' })
    }
    if (preLaunch.entries) {
      preLaunch.entries.forEach((entry, idx) => {
        if (entry.description) {
          segments.push(entry.description)
          mapping.push({ type: 'preEntry', index: idx })
        }
      })
    }
  }

  // 3. 收集发射后时间线及其免责声明
  const postLaunch = details.timelines?.postLaunch
  if (postLaunch) {
    if (postLaunch.disclaimer) {
      segments.push(postLaunch.disclaimer)
      mapping.push({ type: 'postDisclaimer' })
    }
    if (postLaunch.entries) {
      postLaunch.entries.forEach((entry, idx) => {
        if (entry.description) {
          segments.push(entry.description)
          mapping.push({ type: 'postEntry', index: idx })
        }
      })
    }
  }

  if (segments.length === 0) return

  // 合流：使用定界符拼接为单个超长文本，只调用一次 AI，大幅削减并发排队延迟
  const combinedText = segments.join(" \n\n[SPLIT]\n\n ")

  try {
    const translatedCombined = await translateText(ai, combinedText, targetLang)
    const translatedSegments = translatedCombined.split(/\s*\[SPLIT\]\s*/)

    if (translatedSegments.length === segments.length) {
      // 完美对齐：映射回各对象字段
      mapping.forEach((mapItem, idx) => {
        const translatedVal = translatedSegments[idx].trim()
        if (mapItem.type === 'summary') {
          details.summary = translatedVal
        } else if (mapItem.type === 'preDisclaimer') {
          preLaunch.disclaimer = translatedVal
        } else if (mapItem.type === 'preEntry') {
          preLaunch.entries[mapItem.index].description = translatedVal
        } else if (mapItem.type === 'postDisclaimer') {
          postLaunch.disclaimer = translatedVal
        } else if (mapItem.type === 'postEntry') {
          postLaunch.entries[mapItem.index].description = translatedVal
        }
      })
      return
    } else {
      console.warn(`Translation segment count mismatch (expected ${segments.length}, got ${translatedSegments.length}). Falling back to parallel individual translations.`)
    }
  } catch (error) {
    console.error("Combined translation failed, falling back to parallel translations:", error)
  }

  // 回退降级方案：若合流拆分数量不对或报错，执行并行的独立翻译，防范数据错位
  const fallbackPromises = mapping.map(async (mapItem, idx) => {
    const originalText = segments[idx]
    const translatedVal = await translateText(ai, originalText, targetLang)

    if (mapItem.type === 'summary') {
      details.summary = translatedVal
    } else if (mapItem.type === 'preDisclaimer') {
      preLaunch.disclaimer = translatedVal
    } else if (mapItem.type === 'preEntry') {
      preLaunch.entries[mapItem.index].description = translatedVal
    } else if (mapItem.type === 'postDisclaimer') {
      postLaunch.disclaimer = translatedVal
    } else if (mapItem.type === 'postEntry') {
      postLaunch.entries[mapItem.index].description = translatedVal
    }
  })

  await Promise.all(fallbackPromises)
}
