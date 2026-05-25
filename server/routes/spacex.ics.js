import { defineEventHandler, setHeader, createError } from 'h3'
import { getCachedData } from '../utils/kv.js'
import { loadLaunchData, buildCalendarFeed } from '../utils/spacex.js'

export default defineEventHandler(async (event) => {
  try {
    const data = await getCachedData(event, "spacex_launches_data", loadLaunchData);
    const icsContent = buildCalendarFeed(data);
    
    setHeader(event, "Content-Type", "text/calendar; charset=utf-8");
    setHeader(event, "Cache-Control", "public, max-age=300");
    setHeader(event, "Content-Disposition", 'inline; filename="spacex-launches.ics"');
    setHeader(event, "X-Robots-Tag", "noindex");
    
    return icsContent;
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway",
      message: "Unable to build SpaceX calendar right now.",
      data: error.message || String(error)
    });
  }
})
