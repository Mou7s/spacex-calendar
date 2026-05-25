import { defineEventHandler, setHeader, createError } from 'h3'
import { getCachedData } from '../utils/kv.js'
import { loadLaunchData } from '../utils/spacex.js'

export default defineEventHandler(async (event) => {
  try {
    const data = await getCachedData(event, "spacex_launches_data", loadLaunchData);
    
    setHeader(event, "Cache-Control", "public, max-age=300");
    setHeader(event, "Content-Type", "application/json; charset=utf-8");
    
    return data;
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway",
      message: "Unable to load SpaceX launch data right now.",
      data: error.message || String(error)
    });
  }
})
