import { ref } from 'vue'
import { useRequestHeaders } from '#app'

import de from '~/public/locales/de.json'
import en from '~/public/locales/en.json'
import es from '~/public/locales/es.json'
import fr from '~/public/locales/fr.json'
import ja from '~/public/locales/ja.json'
import ko from '~/public/locales/ko.json'
import zhCN from '~/public/locales/zh-CN.json'

const fallbackLocale = "en"
const supportedLocales = ["zh-CN", "en", "ja", "ko", "es", "fr", "de"]

const messages = {
  de,
  en,
  es,
  fr,
  ja,
  ko,
  "zh-CN": zhCN
}

export function resolveLocale(preferred) {
  if (!preferred) {
    return fallbackLocale
  }

  if (supportedLocales.includes(preferred)) {
    return preferred
  }

  const language = preferred.toLowerCase().split("-")[0]
  const locale = supportedLocales.find((candidate) => candidate.toLowerCase().split("-")[0] === language)

  return locale || fallbackLocale
}

function getNestedTranslation(key, locale) {
  const fileMessages = messages[locale] || messages[fallbackLocale]
  return key.split(".").reduce((value, segment) => value?.[segment], fileMessages)
}

// Global active locale state
const activeLocale = ref(fallbackLocale)

export function useI18n() {
  // Determine active locale
  if (import.meta.server) {
    const headers = useRequestHeaders(['accept-language'])
    const acceptLanguage = headers['accept-language']
    if (acceptLanguage) {
      const preferred = acceptLanguage.split(',')[0].trim()
      activeLocale.value = resolveLocale(preferred)
    }
  } else {
    const stored = localStorage.getItem('spacex_calendar_locale')
    if (stored && supportedLocales.includes(stored)) {
      activeLocale.value = stored
    } else {
      activeLocale.value = resolveLocale(navigator.language)
    }
  }

  const t = (key, replacements = {}, locale = activeLocale.value) => {
    const template =
      getNestedTranslation(key, locale) ??
      getNestedTranslation(key, fallbackLocale) ??
      key

    if (typeof template !== "string") {
      if (Array.isArray(template)) {
        return template
      }
      return String(template ?? key)
    }

    return template.replace(/\{(\w+)\}/g, (_, token) => {
      return replacements[token] ?? ""
    })
  }

  const setLocale = (locale) => {
    if (supportedLocales.includes(locale)) {
      activeLocale.value = locale
      if (import.meta.client) {
        localStorage.setItem('spacex_calendar_locale', locale)
        document.documentElement.lang = locale
      }
    }
  }

  return {
    activeLocale,
    supportedLocales,
    t,
    setLocale,
    resolveLocale
  }
}
