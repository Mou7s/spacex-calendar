import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxthub/core'
  ],
  css: [
    '~/assets/css/styles.css'
  ],
  compatibilityDate: '2026-04-17',
  devtools: { enabled: true }
})
