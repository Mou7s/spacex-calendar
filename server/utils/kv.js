import { loadMissionDetails, M2M100_LANG_MAP, translateMissionDetails } from './spacex.js'

const CACHE_TTL = 300; // 5 minutes cache for lists
const HISTORY_METADATA_KEY = "spacex_launches_history_metadata";

/**
 * 统一获取 KV 存储的包装器函数
 * 优先使用 Cloudflare context 中的 SPACEX_KV 绑定，以便单元测试和 Worker 原生环境运行；
 * 若未定义，则自动降级使用 Nuxt Hub 的 hubKV()，从而为本地开发（npm run dev）提供完全的磁盘持久化缓存能力。
 */
export function getKvStorage(env) {
  if (env && env.SPACEX_KV) {
    return {
      get: async (key) => {
        return await env.SPACEX_KV.get(key, "json");
      },
      set: async (key, val, options) => {
        const stringified = typeof val === 'string' ? val : JSON.stringify(val);
        const putOptions = options?.ttl ? { expirationTtl: options.ttl } : {};
        await env.SPACEX_KV.put(key, stringified, putOptions);
      }
    };
  }

  // Fallback to Nuxt Hub KV (auto-imported by Nitro)
  try {
    const hubStorage = hubKV();
    return {
      get: async (key) => {
        return await hubStorage.get(key);
      },
      set: async (key, val, options) => {
        await hubStorage.set(key, val, options);
      }
    };
  } catch (e) {
    // Falls back to null when running in Node unit tests without hubKV global
    return null;
  }
}

export async function enrichWithStableVersions(env, freshData) {
  const kv = getKvStorage(env);
  if (!kv) {
    // Fallback: stateless deterministic values
    freshData.missions = freshData.missions.map((mission) => {
      const stableTime = mission.launchAt || freshData.refreshedAt;
      return {
        ...mission,
        firstDiscovered: stableTime,
        lastModified: stableTime,
        sequence: 0,
      };
    });
    return freshData;
  }

  try {
    const storedHistory = (await kv.get(HISTORY_METADATA_KEY)) || {};
    const updatedHistory = {};
    const now = new Date().toISOString();

    freshData.missions = freshData.missions.map((mission) => {
      const id = String(mission.correlationId || mission.id);
      const launchAt = mission.launchAt || "";
      const launchSite = mission.launchSite || "";
      const vehicle = mission.vehicle || "";
      const title = mission.title || "";

      const currentHash = `${launchAt}|${launchSite}|${vehicle}|${title}`;
      const previous = storedHistory[id];

      let firstDiscovered = now;
      let lastModified = now;
      let sequence = 0;

      if (previous) {
        firstDiscovered = previous.firstDiscovered || now;
        if (previous.hash === currentHash) {
          lastModified = previous.lastModified || now;
          sequence = previous.sequence ?? 0;
        } else {
          lastModified = now;
          sequence = (previous.sequence ?? 0) + 1;
        }
      }

      updatedHistory[id] = {
        firstDiscovered,
        lastModified,
        sequence,
        hash: currentHash,
      };

      return {
        ...mission,
        firstDiscovered,
        lastModified,
        sequence,
      };
    });

    await kv.set(HISTORY_METADATA_KEY, updatedHistory);
  } catch (error) {
    console.error("Error processing stable versions:", error);
    // Fallback in case of KV errors
    freshData.missions = freshData.missions.map((mission) => {
      const stableTime = mission.launchAt || freshData.refreshedAt;
      return {
        ...mission,
        firstDiscovered: stableTime,
        lastModified: stableTime,
        sequence: 0,
      };
    });
  }

  return freshData;
}

export async function getCachedData(
  event,
  cacheKey,
  loader
) {
  // Extract Cloudflare Environment from request context
  const cloudflare = event.context.cloudflare || {};
  const env = cloudflare.env || {};
  const ctx = cloudflare.context; // waitUntil is inside the ExecutionContext

  const kv = getKvStorage(env);
  let cached = null;
  if (kv) {
    try {
      cached = await kv.get(cacheKey);
    } catch (e) {
      console.error("KV read error:", e);
    }
  }

  const nowMs = Date.now();

  // 根据缓存类型采用不同的时效策略
  // 任务列表（spacex_launches_data）经常变动，采用 5分钟 CACHE_TTL
  // 具体的详情翻译卡片属于静态数据，变动极慢，采用 24小时 (86400秒) 的超长缓存 TTL，最大化降低首屏 API 延迟与 AI 消耗！
  const isDetailsKey = cacheKey.startsWith("spacex_mission_details_");
  const currentTTL = isDetailsKey ? 86400 : CACHE_TTL;

  if (cached) {
    const refreshedAtMs = cached.refreshedAt ? Date.parse(cached.refreshedAt) : 0;
    const age = Number.isNaN(refreshedAtMs) ? Infinity : nowMs - refreshedAtMs;

    if (age < currentTTL * 1000) {
      // Fresh: Return immediately
      return cached;
    }

    // Stale: SWR or Sync Fallback
    if (ctx && typeof ctx.waitUntil === "function") {
      // 1. Stale-While-Revalidate (SWR): Return stale data immediately, update in background
      const revalidatePromise = (async () => {
        try {
          let freshData = await loader(fetch);
          if (cacheKey === "spacex_launches_data") {
            freshData = await enrichWithStableVersions(env, freshData);
            if (kv) {
              await kv.set(cacheKey, freshData, { ttl: 604800 });
            }
            
            // 后台静默预翻译触发，缓存即将发射任务的多语言详情，保障客户端 0ms 秒回
            if (env.AI && freshData.missions) {
              await preTranslateUpcomingMissions(event, env, freshData.missions);
            }
          } else {
            if (kv) {
              await kv.set(cacheKey, freshData, { ttl: 604800 });
            }
          }
        } catch (e) {
          console.error(`Background revalidation failed for ${cacheKey}:`, e);
        }
      })();
      ctx.waitUntil(revalidatePromise);
      return cached;
    } else {
      // 2. No ctx.waitUntil available: Sync fetch with disaster recovery fallback
      try {
        let freshData = await loader(fetch);
        if (cacheKey === "spacex_launches_data") {
          freshData = await enrichWithStableVersions(env, freshData);
        }
        if (kv) {
          await kv.set(cacheKey, freshData, { ttl: 604800 });
        }
        return freshData;
      } catch (e) {
        console.warn(`Synchronous revalidation failed for ${cacheKey}. Falling back to stale cache:`, e);
        return cached;
      }
    }
  }

  // No cache: Sync fetch is required
  let freshData = await loader(fetch);
  if (cacheKey === "spacex_launches_data") {
    freshData = await enrichWithStableVersions(env, freshData);
  }

  if (kv) {
    try {
      await kv.set(cacheKey, freshData, { ttl: 604800 });
    } catch (e) {
      console.error("KV write error:", e);
    }
  }

  return freshData;
}

/**
 * 后台静默预翻译服务：提前获取即将发射任务的多语言详情并存储在 KV 缓存中，消除首屏翻译延迟
 */
export async function preTranslateUpcomingMissions(event, env, missions) {
  const kv = getKvStorage(env);
  if (!kv || !env.AI || !missions || !Array.isArray(missions)) {
    return
  }

  // 1. 过滤出有有效 slug 的即将发射任务（仅限制前 5 个，防后台执行超时）
  const upcomingMissions = missions
    .filter(m => m.slug && m.launchAt)
    .slice(0, 5)

  if (upcomingMissions.length === 0) return

  const languages = Object.keys(M2M100_LANG_MAP)

  // 2. 遍历每一个即将发射任务
  for (const mission of upcomingMissions) {
    const slug = mission.slug

    // 3. 遍历每一种支持的多语言进行预翻译
    for (const lang of languages) {
      const targetLang = M2M100_LANG_MAP[lang]
      if (!targetLang) continue

      const cacheKey = `spacex_mission_details_${slug}_${lang}_v7`

      try {
        // 4. 核心优化：先检查 KV 里是否已经存在该语言的缓存，并校验时效性，避免盲目重复翻译
        const existing = await kv.get(cacheKey)
        if (existing && existing.refreshedAt) {
          const cacheAge = Date.now() - Date.parse(existing.refreshedAt)
          // 仅在缓存新鲜（小于 12 小时）时跳过；若超过 12 小时，则在后台静默更新以同步可能发生变更的发射时间与描述
          if (cacheAge < 12 * 3600 * 1000) {
            continue
          }
        }

        // 5. 若无缓存，在后台进行同步抓取与合流翻译
        const freshData = await loadMissionDetails(slug)
        if (freshData?.details) {
          await translateMissionDetails(env.AI, freshData.details, targetLang)
          // 写入 KV，设置 7 天过期时间
          await kv.set(cacheKey, freshData, { ttl: 604800 })
          console.log(`[SWR Pre-translate] Successfully cached translated details for ${slug} (${lang})`)
        }
      } catch (err) {
        console.error(`[SWR Pre-translate] Failed for ${slug} (${lang}):`, err)
      }
    }
  }
}
