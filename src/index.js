import { buildCalendarFeed, loadLaunchData } from "./lib/spacex.js";

const CACHE_KEY = "spacex_launches_data";
const CACHE_TTL = 300; // 5 minutes cache

async function getCachedLaunchData(env, fetchImpl) {
  if (env.SPACEX_KV) {
    try {
      const cached = await env.SPACEX_KV.get(CACHE_KEY, "json");
      if (cached) {
        return cached;
      }
    } catch (e) {
      // Ignore KV read errors and fallback to fetch
      console.error("KV read error:", e);
    }
  }

  const data = await loadLaunchData(fetchImpl);

  if (env.SPACEX_KV) {
    try {
      await env.SPACEX_KV.put(CACHE_KEY, JSON.stringify(data), { expirationTtl: CACHE_TTL });
    } catch (e) {
      // Ignore KV write errors
      console.error("KV write error:", e);
    }
  }

  return data;
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
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return jsonResponse({ ok: true });
    }

    if (url.pathname === "/api/launches") {
      try {
        const data = await getCachedLaunchData(env, fetch);
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

    if (url.pathname === "/spacex.ics" || url.pathname === "/calendar.ics") {
      try {
        const data = await getCachedLaunchData(env, fetch);
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
