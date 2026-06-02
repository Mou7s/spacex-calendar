<template>
  <div class="page-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <AppHeader />

    <main>
      <SubscribePanel id="subscribe" :webcal-link="webcalSubscriptionLink" :ics-link="icsSubscriptionLink" />

      <HeroSection id="hero" :next-launch="upcomingPayload?.nextLaunch" :countdown="countdown" :hero-style="heroStyle"
        :next-launch-title="nextLaunchTitle" :next-launch-description="nextLaunchDescription"
        :next-launch-time-formatted="nextLaunchTimeFormatted" @select-mission="selectMission" />

      <OverviewGrid id="overview" :month-summary="monthSummary" :timed-windows-count="timedWindowsCount"
        :live-count="liveCount" :missions-count="upcomingPayload?.missions?.length || 0"
        :active-timezone="activeTimezone" :active-timezone-display="activeTimezoneDisplay"
        :timezone-options="TIMEZONE_OPTIONS" :format-month-pill-label="formatMonthPillLabel"
        @set-timezone="setTimezone" />

      <LaunchCalendar id="calendar" :grid-days="gridDays" :month-missions="monthMissions" :month-keys="monthKeys"
        :active-month-index="activeMonthIndex" :active-month-label="activeMonthLabel" :today-iso="todayIso"
        :selected-date-iso="selectedDateIso" :focused-date-iso="focusedDateIso"
        :selected-mission-key="selectedMissionKey" :format-event-month="formatEventMonth"
        :format-event-day="formatEventDay" :format-event-time="formatEventTime" :title-case="titleCase"
        @update:active-month-index="activeMonthIndex = $event" @focus-date="focusDate"
        @select-mission="selectMission" />

      <MissionDetail :selected-mission="selectedMission" :loading-details="loadingDetails" :details="details"
        :is-infographic-open="isInfographicOpen" :is-zoomed="isZoomed"
        :mission-window-copy="selectedMission ? getMissionWindowCopy(selectedMission) : ''" :title-case="titleCase"
        @close="selectedMission = null" @update:is-infographic-open="isInfographicOpen = $event"
        @update:is-zoomed="isZoomed = $event" />

      <FaqSection id="faq" :items="faqItems" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useHead, useFetch, useSeoMeta } from '#app'
import { TIMEZONE_OPTIONS } from '~/composables/useTimezone'

const { t, locale } = useI18n()

// ─── Composables ───
const {
  activeTimezone,
  activeTimezoneDisplay,
  setTimezone,
  formatDateTime,
  formatDateTimeUtc,
  formatEventMonth,
  formatEventDay,
  formatEventTime,
  titleCase,
  formatMonthPillLabel,
} = useTimezone()

// ─── Data Fetching ───
const { data: upcomingPayload } = await useFetch<any>('/api/launches')
const { data: historyPayload } = await useFetch<any>('/api/history-launches')

// ─── SEO ───
const nextLaunch = computed(() => upcomingPayload.value?.nextLaunch)

const computedTitle = computed(() => {
  return `${t('meta.title')} | ${t('subscribe.title')}`
})

// ─── Subscription Links ───
const webcalSubscriptionLink = computed(() => {
  if (import.meta.client) {
    const httpUrl = new URL("/spacex.ics", window.location.href)
    return `webcal://${httpUrl.host}${httpUrl.pathname}`
  }
  return 'webcal://spacex-calendar.mou7s.com/spacex.ics'
})

const icsSubscriptionLink = computed(() => {
  if (import.meta.client) {
    return new URL("/spacex.ics", window.location.href).toString()
  }
  return 'https://spacex-calendar.mou7s.com/spacex.ics'
})

// ─── Countdown ───
const nextLaunchAt = computed(() => nextLaunch.value?.launchAt || null)
const { countdown } = useCountdown(nextLaunchAt)

// ─── Hero Computed ───
const nextLaunchTitle = computed(() => {
  return nextLaunch.value?.title || t("hero.noMissionsTitle")
})

const nextLaunchDescription = computed(() => {
  const mission = nextLaunch.value
  if (!mission) {
    return t("hero.noMissionsDescription")
  }
  return t("hero.nextLaunchDescription", {
    vehicle: mission.vehicle || t("mission.tbd"),
    launchSite: mission.launchSite || t("mission.sitePending"),
    returnSite: mission.returnSite || t("mission.recoveryPending")
  })
})

const nextLaunchTimeFormatted = computed(() => {
  const mission = nextLaunch.value
  if (!mission?.launchAt) {
    return t("hero.pending")
  }
  return formatDateTime(mission.launchAt)
})

const heroStyle = computed(() => {
  if (nextLaunch.value?.image) {
    return {
      backgroundImage: `radial-gradient(circle at top, var(--hero-glow), transparent 34%), url("${nextLaunch.value.image}")`
    }
  }
  return {}
})

// ─── Overview Stats ───
const monthSummary = computed(() => upcomingPayload.value?.monthSummary || [])

const timedWindowsCount = computed(() => {
  const missions = upcomingPayload.value?.missions || []
  return missions.filter((m: any) => m.launchAt).length
})

const liveCount = computed(() => {
  const missions = upcomingPayload.value?.missions || []
  return missions.filter((m: any) => m.isLive).length
})

// ─── Calendar Integration (Upcoming & History) ───
const sortedCalendarMissions = computed(() => {
  const upcoming = (upcomingPayload.value?.missions || []).map((m: any) => ({ ...m, calendarGroup: 'upcoming', key: `upcoming:${m.slug || m.id}` }))
  const history = (historyPayload.value?.missions || []).map((m: any) => ({ ...m, calendarGroup: 'history', key: `history:${m.slug || m.id}` }))

  return [...upcoming, ...history].filter((m: any) => m.launchAt).sort((a: any, b: any) => {
    return Date.parse(b.launchAt) - Date.parse(a.launchAt) // Newest first
  })
})

const monthKeys = computed(() => {
  const keys: string[] = []
  const seen = new Set<string>()

  for (const mission of sortedCalendarMissions.value) {
    if (!mission.launchAt) continue
    const date = new Date(mission.launchAt)
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    if (!seen.has(key)) {
      seen.add(key)
      keys.push(key)
    }
  }

  return keys.sort((a, b) => a.localeCompare(b))
})

const activeMonthIndex = ref(0)
const activeMonthKey = computed(() => monthKeys.value[activeMonthIndex.value])

// Set default active month to next launch's month
watch([monthKeys, nextLaunch], () => {
  if (nextLaunch.value?.launchAt) {
    const nextDate = new Date(nextLaunch.value.launchAt)
    const nextKey = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`
    const idx = monthKeys.value.indexOf(nextKey)
    if (idx >= 0) {
      activeMonthIndex.value = idx
    }
  }
}, { immediate: true })

const activeMonthLabel = computed(() => {
  const monthKey = activeMonthKey.value
  if (!monthKey) return t('calendar.title')

  return new Intl.DateTimeFormat(locale.value, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-01T00:00:00.000Z`))
})

const monthMissions = computed(() => {
  const monthKey = activeMonthKey.value
  if (!monthKey) return []
  return sortedCalendarMissions.value.filter((mission: any) => {
    if (!mission.launchAt) return false
    const date = new Date(mission.launchAt)
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    return key === monthKey
  })
})

// ─── Calendar Grid Days ───
interface GridDay {
  isoDate: string
  dayNumber: number
  isCurrentMonth: boolean
  hasEvents: boolean
}

const gridDays = computed<GridDay[]>(() => {
  const monthKey = activeMonthKey.value
  if (!monthKey) return []

  const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`)
  const year = monthStart.getUTCFullYear()
  const month = monthStart.getUTCMonth()
  const firstDayIndex = monthStart.getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7
  const days: GridDay[] = []

  const eventDates = new Set(
    monthMissions.value.map((m: any) => m.launchAt.slice(0, 10))
  )

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const dayOffset = cellIndex - firstDayIndex
    const date = new Date(Date.UTC(year, month, dayOffset + 1))
    const isoDate = date.toISOString().slice(0, 10)

    days.push({
      isoDate,
      dayNumber: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === month,
      hasEvents: eventDates.has(isoDate)
    })
  }

  return days
})

const todayIso = computed(() => new Date().toISOString().slice(0, 10))
const selectedDateIso = ref<string | null>(null)
const focusedDateIso = ref<string | null>(null)

// ─── Mission Selection ───
const selectedMission = ref<any>(null)
const selectedMissionKey = computed(() => selectedMission.value?.key || null)

const loadingDetails = ref(false)
const details = ref<any>(null)
const isInfographicOpen = ref(false)
const isZoomed = ref(false)

// 内存缓存：缓存已经拉取过的任务多语言详情，避免重复点击时的二次请求与闪烁
const detailsCache = new Map<string, any>()

watch(isInfographicOpen, (val) => {
  if (!val) {
    isZoomed.value = false
  }
})

// 监听语言切换，若已选择任务则自动重新抓取并更新多语言动态详情
watch(locale, async (newLocale) => {
  if (selectedMission.value && selectedMission.value.slug) {
    const cacheKey = `${selectedMission.value.slug}_${newLocale}`
    if (detailsCache.has(cacheKey)) {
      details.value = detailsCache.get(cacheKey)
      loadingDetails.value = false
    } else {
      loadingDetails.value = true
      try {
        const res: any = await $fetch(`/api/launches/${selectedMission.value.slug}`, {
          query: { lang: newLocale }
        })
        if (res?.details) {
          details.value = res.details
          detailsCache.set(cacheKey, res.details)
        }
      } catch (e) {
        console.error("Failed to update mission details on language switch:", e)
      } finally {
        loadingDetails.value = false
      }
    }
  }
})

const selectMission = async (mission: any, scrollPage = true) => {
  selectedMission.value = mission
  focusedDateIso.value = mission.launchAt?.slice(0, 10) || null
  isInfographicOpen.value = false
  isZoomed.value = false

  if (import.meta.client && scrollPage) {
    setTimeout(() => {
      const panel = document.querySelector('.selected-mission-panel')
      panel?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  if (mission.slug) {
    const cacheKey = `${mission.slug}_${locale.value}`
    if (detailsCache.has(cacheKey)) {
      details.value = detailsCache.get(cacheKey)
      loadingDetails.value = false
    } else {
      loadingDetails.value = true
      details.value = null
      try {
        const res: any = await $fetch(`/api/launches/${mission.slug}`, {
          query: { lang: locale.value }
        })
        if (res?.details) {
          details.value = res.details
          detailsCache.set(cacheKey, res.details)
        }
      } catch (e) {
        console.error(e)
      } finally {
        loadingDetails.value = false
      }
    }
  } else {
    details.value = null
  }
}

const focusDate = (isoDate: string) => {
  selectedDateIso.value = isoDate

  const firstOnDay = monthMissions.value.find((m: any) => m.launchAt.slice(0, 10) === isoDate)
  if (firstOnDay) {
    selectMission(firstOnDay, false)

    if (import.meta.client) {
      setTimeout(() => {
        const missionEl = document.getElementById(`mission-card-${firstOnDay.key}`)
        missionEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }
}

const getMissionWindowCopy = (mission: any) => {
  if (!mission.launchAt) {
    return t("mission.launchTimingUnavailable")
  }

  if (mission.launchWindow?.close) {
    return t("mission.window", {
      open: formatDateTime(mission.launchWindow.open),
      close: formatDateTime(mission.launchWindow.close),
    })
  }

  return t("mission.launchTarget", {
    local: formatDateTime(mission.launchAt),
    utc: formatDateTimeUtc(mission.launchAt),
  })
}

// ─── FAQ ───
const getFaqQuestion = (num: number) => {
  return t(`faq.q${num}`)
}

const getFaqAnswer = (num: number) => {
  return t(`faq.a${num}`, { link: webcalSubscriptionLink.value })
}


const faqItems = computed(() => [
  { label: getFaqQuestion(1), content: getFaqAnswer(1) },
  { label: getFaqQuestion(2), content: getFaqAnswer(2) },
  { label: getFaqQuestion(3), content: getFaqAnswer(3) },
  { label: getFaqQuestion(4), content: getFaqAnswer(4) }
])

useSeoMeta({
  title: computedTitle,
  ogTitle: computedTitle,
  description: () => t('meta.description'),
  ogDescription: () => t('meta.description'),
  ogType: 'website',
  ogImage: '/icon-512.png',
  twitterCard: 'summary',
  twitterTitle: computedTitle,
  twitterDescription: () => t('meta.description'),
  twitterImage: '/icon-512.png'
})

// useHead 现在专用于处理复杂的非普通元数据标签（例如注入 JSON-LD 谷歌结构化数据）
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": "https://spacex-calendar.mou7s.com/#website",
            "url": "https://spacex-calendar.mou7s.com/",
            "name": t('meta.title'),
            "description": t('meta.description'),
            "publisher": {
              "@type": "Organization",
              "name": "SpaceX Calendar Team"
            },
            "hasPart": [
              {
                "@type": "WebPage",
                "@id": "https://spacex-calendar.mou7s.com/#subscribe",
                "name": t('subscribe.title'),
                "url": "https://spacex-calendar.mou7s.com/#subscribe"
              },
              {
                "@type": "WebPage",
                "@id": "https://spacex-calendar.mou7s.com/#calendar",
                "name": t('calendar.title'),
                "url": "https://spacex-calendar.mou7s.com/#calendar"
              },
              {
                "@type": "WebPage",
                "@id": "https://spacex-calendar.mou7s.com/#faq",
                "name": locale.value === 'zh-CN' ? '常见问题' : 'FAQ',
                "url": "https://spacex-calendar.mou7s.com/#faq"
              }
            ]
          },
          {
            "@type": "SoftwareApplication",
            "@id": "https://spacex-calendar.mou7s.com/#software",
            "name": "SpaceX Calendar PWA",
            "operatingSystem": "All",
            "applicationCategory": "UtilitiesApplication",
            "offers": {
              "@type": "Offer",
              "price": "0.00",
              "priceCurrency": "USD"
            }
          },
          {
            "@type": "FAQPage",
            "@id": "https://spacex-calendar.mou7s.com/#faq-page",
            "mainEntity": [1, 2, 3, 4].map(num => ({
              "@type": "Question",
              "name": getFaqQuestion(num),
              "acceptedAnswer": {
                "@type": "Answer",
                "text": getFaqAnswer(num).replace(/<[^>]+>/g, '')
              }
            }))
          },
          nextLaunch.value?.launchAt ? {
            "@type": "Event",
            "name": nextLaunch.value.title,
            "startDate": nextLaunch.value.launchAt,
            "location": {
              "@type": "Place",
              "name": nextLaunch.value.launchSite || "TBD",
              "address": nextLaunch.value.launchSite || "TBD"
            },
            "description": `${nextLaunch.value.vehicle} launch tracking: ${nextLaunch.value.title} scheduled flight.`
          } : null
        ].filter(Boolean)
      })
    }
  ]
}))
</script>

<style>
/* Custom global adjustments */
body {
  margin: 0;
  padding: 0;
}
</style>
