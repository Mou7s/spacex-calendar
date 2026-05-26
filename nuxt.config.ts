import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxthub/core'
  ],
  css: [
    '~/assets/css/styles.css'
  ],
  future: {
    compatibilityVersion: 4
  },
  nitro: {
    preset: 'cloudflare-pages'
  },
  compatibilityDate: '2026-04-17',
  devtools: { enabled: true }
})
