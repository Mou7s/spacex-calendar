import { defineEventHandler, getRouterParam, getQuery, setHeader, createError } from 'h3'
import { getCachedData } from '../../utils/kv.js'
import { loadMissionDetails, M2M100_LANG_MAP, translateMissionDetails } from '../../utils/spacex.js'

/**
 * GET /api/launches/[slug]
 * 动态路由 API 端点：根据传入的任务标识（Slug），获取特定 SpaceX 任务的深度图文与超清发射图解详情
 * 现已支持基于 Cloudflare Workers AI 的合流极速翻译与 SWR 多语言缓存分发。
 */
export default defineEventHandler(async (event) => {
  // 1. 从路由路径中提取动态参数 [slug]，以及用户偏好语言 ?lang=
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event) || {}
  const lang = query.lang || 'en'
  const force = query.force === 'true'

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
    const cacheKey = targetLang ? `spacex_mission_details_${slug}_${lang}_v5` : `spacex_mission_details_${slug}_v5`
    
    // 4. 定义数据加载/翻译核心方法
    const loader = async () => {
      const freshData = await loadMissionDetails(slug)
      
      // 如果不是英文，且成功匹配到了支持的翻译语言，则在获取到最新详情后执行合流 AI 汉化翻译
      if (targetLang && freshData?.details) {
        const cloudflare = event.context.cloudflare || {}
        const env = cloudflare.env || {}
        await translateMissionDetails(env.AI, freshData.details, targetLang)
      }
      
      return freshData
    }

    // 5. 校验是否强制刷新：若带 ?force=true，则直接穿透缓存，重新翻译并强制覆写 KV
    let data
    if (force) {
      data = await loader()
      const cloudflare = event.context.cloudflare || {}
      const env = cloudflare.env || {}
      if (env.SPACEX_KV) {
        await env.SPACEX_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 604800 })
      }
    } else {
      data = await getCachedData(event, cacheKey, loader)
    }
    
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
