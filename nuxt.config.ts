import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@nuxt/ui',
    '@nuxtjs/i18n'
  ],
  css: [
    '~/assets/css/styles.css'
  ],
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    lazy: true,
    restructureDir: false,
    langDir: 'public/locales/',
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
  future: {
    compatibilityVersion: 4
  },
  nitro: {
    preset: 'cloudflare-pages'
  },
  compatibilityDate: '2026-04-17',
  devtools: { enabled: true }
})
