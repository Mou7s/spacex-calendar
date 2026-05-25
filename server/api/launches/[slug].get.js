import { defineEventHandler, getRouterParam, setHeader, createError } from 'h3'
import { getCachedData } from '../../utils/kv.js'
import { loadMissionDetails } from '../../utils/spacex.js'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');

  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Invalid mission slug"
    });
  }

  try {
    const cacheKey = `spacex_mission_details_${slug}`;
    const data = await getCachedData(event, cacheKey, () => loadMissionDetails(slug));
    
    setHeader(event, "Cache-Control", "public, max-age=300");
    setHeader(event, "Content-Type", "application/json; charset=utf-8");
    
    return data;
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway",
      message: "Unable to load SpaceX mission details right now.",
      data: error.message || String(error)
    });
  }
})
