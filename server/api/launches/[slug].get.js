import { defineEventHandler, getRouterParam, getQuery, setHeader, createError } from 'h3'
import { getCachedData } from '../../utils/kv.js'
import { loadMissionDetails } from '../../utils/spacex.js'

// M2M100 支持的语言名称映射
const M2M100_LANG_MAP = {
  'zh-CN': 'chinese',
  'ja': 'japanese',
  'ko': 'korean',
  'es': 'spanish',
  'fr': 'french',
  'de': 'german'
}

/**
 * 针对单个字符串字段，调用 Cloudflare Workers AI 翻译接口进行翻译
 */
async function translateText(ai, text, targetLang) {
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
    return text // 异常时优雅降级：返回原始英文文本，确保系统决不崩溃
  }
}

/**
 * 核心并发翻译器：并行对任务简报 (summary)、时间线等关键字段进行 AI 多语言翻译
 */
async function translateMissionDetails(event, details, targetLang) {
  const cloudflare = event.context.cloudflare || {}
  const env = cloudflare.env || {}
  const ai = env.AI

  if (!ai || !details) return

  const promises = []

  // 1. 翻译任务摘要/简报
  if (details.summary) {
    promises.push((async () => {
      details.summary = await translateText(ai, details.summary, targetLang)
    })())
  }

  // 2. 翻译发射前时间线及其免责声明
  const preLaunch = details.timelines?.preLaunch
  if (preLaunch) {
    if (preLaunch.disclaimer) {
      promises.push((async () => {
        preLaunch.disclaimer = await translateText(ai, preLaunch.disclaimer, targetLang)
      })())
    }
    if (preLaunch.entries) {
      preLaunch.entries.forEach((entry) => {
        if (entry.description) {
          promises.push((async () => {
            entry.description = await translateText(ai, entry.description, targetLang)
          })())
        }
      })
    }
  }

  // 3. 翻译发射后时间线及其免责声明
  const postLaunch = details.timelines?.postLaunch
  if (postLaunch) {
    if (postLaunch.disclaimer) {
      promises.push((async () => {
        postLaunch.disclaimer = await translateText(ai, postLaunch.disclaimer, targetLang)
      })())
    }
    if (postLaunch.entries) {
      postLaunch.entries.forEach((entry) => {
        if (entry.description) {
          promises.push((async () => {
            entry.description = await translateText(ai, entry.description, targetLang)
          })())
        }
      })
    }
  }

  // 利用 Promise.all 进行极速高并发并行翻译
  await Promise.all(promises)
}

/**
 * GET /api/launches/[slug]
 * 动态路由 API 端点：根据传入的任务标识（Slug），获取特定 SpaceX 任务的深度图文与超清发射图解详情
 * 现已全面支持基于 Cloudflare Workers AI 的多语言动态自动翻译与 SWR 缓存分发。
 */
export default defineEventHandler(async (event) => {
  // 1. 从路由路径中提取动态参数 [slug]，以及用户偏好语言 ?lang=
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event) || {}
  const lang = query.lang || 'en'

  // 2. 安全校验：强制防范目录穿越、路径注入与非法参数，只允许英文字母、数字和连字符 "-"
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Invalid mission slug"
    })
  }

  try {
    // 3. 匹配多语言翻译目标，根据语言后缀单独缓存不同的翻译结果，实现多语言隔离
    const targetLang = M2M100_LANG_MAP[lang]
    const cacheKey = targetLang ? `spacex_mission_details_${slug}_${lang}` : `spacex_mission_details_${slug}`
    
    // 4. 调用 KV 控制器的 getCachedData 方法（SWR 控制流）：
    //    - 如果 KV 存在且新鲜：直接秒回数据。
    //    - 如果 KV 存在但已过期：先秒回旧数据，并在后台异步请求刷新 KV。
    //    - 如果 KV 不存在：同步发起网络请求并写入 KV。
    const data = await getCachedData(event, cacheKey, async () => {
      const freshData = await loadMissionDetails(slug)
      
      // 如果不是英文，且成功匹配到了支持的翻译语言，则在获取到最新详情后执行多语言 AI 汉化翻译
      if (targetLang && freshData?.details) {
        await translateMissionDetails(event, freshData.details, targetLang)
      }
      
      return freshData
    })
    
    // 5. 设置 HTTP 响应头：
    //    - Cache-Control：指示浏览器或 CDN 缓存此接口 5 分钟，降低服务器二次请求负载
    //    - Content-Type：统一格式化为 UTF-8 编码的 JSON 数据
    setHeader(event, "Cache-Control", "public, max-age=300")
    setHeader(event, "Content-Type", "application/json; charset=utf-8")
    
    // 6. 返回规范化并多语言翻译后的任务细节 JSON 数据体
    return data
  } catch (error) {
    // 7. 优雅降级与异常处理：如果上游网络抓取彻底失败，向上层抛出 502 网关错误
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway",
      message: "Unable to load SpaceX mission details right now.",
      data: error.message || String(error)
    })
  }
})
