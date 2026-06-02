import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // 全局 Head 配置：包含网站 favicon 图标关联
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/icon-512.png?v=2' }
      ]
    }
  },
  // 启用的 Nuxt 核心与第三方扩展模块列表
  modules: [
    '@nuxthub/core', // NuxtHub 模块：集成 Cloudflare KV、D1、Blob 等边缘计算与数据库服务
    '@nuxt/ui',      // Nuxt UI 模块：基于 Tailwind CSS 构建 of 现代化组件库，提供开箱即用的优质 UI
    '@nuxtjs/i18n'   // Nuxt i18n 模块：提供全站多语言国际化支持及自动化的翻译资源加载
  ],

  // 全局加载 of CSS 样式文件列表
  css: [
    '~/assets/css/styles.css' // 引入项目自定义的全局主题风格、渐变与动画样式表
  ],

  // 国际化 (i18n) 多语言的详细配置
  i18n: {
    compilation: {
      strictMessage: false,
      escapeHtml: false
    },
    strategy: 'no_prefix', // 路由策略：在 URL 中不添加语言前缀（例如不显示 /zh-CN/），保持清爽干净的单一路由
    defaultLocale: 'en',   // 网站初始加载时的默认语言
    lazy: true,            // 启用延迟加载：只在用户切换语言时，才动态异步加载对应的 JSON 文件，优化首屏加载体积
    langDir: 'locales',    // 基于 Nuxt 4 规范，翻译字典自动从 app/i18n/locales/ 目录下进行延迟加载与打包
    // 系统支持的多语言列表及其翻译映射文件
    locales: [
      { code: 'zh-CN', file: 'zh-CN.json', name: '简体中文' },
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'ja', file: 'ja.json', name: '日本語' },
      { code: 'ko', file: 'ko.json', name: '한국어' },
      { code: 'es', file: 'es.json', name: 'Español' },
      { code: 'fr', file: 'fr.json', name: 'Français' },
      { code: 'de', file: 'de.json', name: 'Deutsch' }
    ]
  },

  // Nuxt Hub 平台特性配置：开启 KV 数据库缓存支持
  hub: {
    kv: true
  },

  // 核心未来特性兼容配置
  future: {
    compatibilityVersion: 4 // 提前启用 Nuxt 4 规范与现代文件树结构，确保代码具备长期的可升级性与健壮性
  },

  // Nitro 服务器引擎编译与部署相关的底层配置
  nitro: {
    preset: 'cloudflare-pages' // 部署预设：适配 Cloudflare Pages 边缘托管环境，自动打包为极速的 Worker 格式
  },

  // 系统升级与向下兼容的基准日期
  compatibilityDate: '2026-04-17',

  // 启用本地开发环境下的 Nuxt 开发者工具 (DevTools)
  devtools: { enabled: true }
})
