import { buildCalendarFeed, loadHistoryLaunchData, loadLaunchData } from "./lib/spacex.js";

const CACHE_KEY = "spacex_launches_data";
const HISTORY_CACHE_KEY = "spacex_history_launches_data";
const CACHE_TTL = 300; // 5 minutes cache

const HISTORY_METADATA_KEY = "spacex_launches_history_metadata";

async function enrichWithStableVersions(env, freshData) {
  if (!env.SPACEX_KV) {
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
    const storedHistory = (await env.SPACEX_KV.get(HISTORY_METADATA_KEY, "json")) || {};
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

    await env.SPACEX_KV.put(HISTORY_METADATA_KEY, JSON.stringify(updatedHistory));
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

async function getCachedData(env, cacheKey, loader, fetchImpl, ctx) {
  let cached = null;
  if (env.SPACEX_KV) {
    try {
      cached = await env.SPACEX_KV.get(cacheKey, "json");
    } catch (e) {
      console.error("KV read error:", e);
    }
  }

  const nowMs = Date.now();

  if (cached) {
    const refreshedAtMs = cached.refreshedAt ? Date.parse(cached.refreshedAt) : 0;
    const age = Number.isNaN(refreshedAtMs) ? Infinity : nowMs - refreshedAtMs;

    if (age < CACHE_TTL * 1000) {
      // Fresh: Return immediately
      return cached;
    }

    // Stale: SWR or Sync Fallback
    if (ctx && typeof ctx.waitUntil === "function") {
      // 1. Stale-While-Revalidate (SWR): Return stale data immediately, update in background
      const revalidatePromise = (async () => {
        try {
          let freshData = await loader(fetchImpl);
          if (cacheKey === CACHE_KEY) {
            freshData = await enrichWithStableVersions(env, freshData);
          }
          await env.SPACEX_KV.put(cacheKey, JSON.stringify(freshData), { expirationTtl: 604800 });
        } catch (e) {
          console.error(`Background revalidation failed for ${cacheKey}:`, e);
        }
      })();
      ctx.waitUntil(revalidatePromise);
      return cached;
    } else {
      // 2. No ctx.waitUntil available: Sync fetch with disaster recovery fallback
      try {
        let freshData = await loader(fetchImpl);
        if (cacheKey === CACHE_KEY) {
          freshData = await enrichWithStableVersions(env, freshData);
        }
        if (env.SPACEX_KV) {
          await env.SPACEX_KV.put(cacheKey, JSON.stringify(freshData), { expirationTtl: 604800 });
        }
        return freshData;
      } catch (e) {
        console.warn(`Synchronous revalidation failed for ${cacheKey}. Falling back to stale cache:`, e);
        return cached;
      }
    }
  }

  // No cache: Sync fetch is required
  let freshData = await loader(fetchImpl);
  if (cacheKey === CACHE_KEY) {
    freshData = await enrichWithStableVersions(env, freshData);
  }

  if (env.SPACEX_KV) {
    try {
      await env.SPACEX_KV.put(cacheKey, JSON.stringify(freshData), { expirationTtl: 604800 });
    } catch (e) {
      console.error("KV write error:", e);
    }
  }

  return freshData;
}

function getCachedLaunchData(env, fetchImpl, ctx) {
  return getCachedData(env, CACHE_KEY, loadLaunchData, fetchImpl, ctx);
}

function getCachedHistoryLaunchData(env, fetchImpl, ctx) {
  return getCachedData(env, HISTORY_CACHE_KEY, loadHistoryLaunchData, fetchImpl, ctx);
}

function jsonResponse(payload, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
    },
  });
}

function calendarResponse(body) {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=300",
      "content-disposition": 'inline; filename="spacex-launches.ics"',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return jsonResponse({ ok: true });
    }

    if (url.pathname === "/api/launches") {
      try {
        const data = await getCachedLaunchData(env, fetch, ctx);
        return jsonResponse(data, 200, "public, max-age=300");
      } catch (error) {
        return jsonResponse(
          {
            error: "Unable to load SpaceX launch data right now.",
            detail: error instanceof Error ? error.message : String(error),
          },
          502
        );
      }
    }

    if (url.pathname === "/api/history-launches") {
      try {
        const data = await getCachedHistoryLaunchData(env, fetch, ctx);
        return jsonResponse(data, 200, "public, max-age=300");
      } catch (error) {
        return jsonResponse(
          {
            error: "Unable to load SpaceX launch history right now.",
            detail: error instanceof Error ? error.message : String(error),
          },
          502
        );
      }
    }

    if (url.pathname === "/spacex.ics" || url.pathname === "/calendar.ics") {
      try {
        const data = await getCachedLaunchData(env, fetch, ctx);
        return calendarResponse(buildCalendarFeed(data));
      } catch (error) {
        return jsonResponse(
          {
            error: "Unable to build SpaceX calendar right now.",
            detail: error instanceof Error ? error.message : String(error),
          },
          502
        );
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Asset binding is not configured.", { status: 500 });
  },
};
