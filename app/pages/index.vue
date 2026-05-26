<template>
  <div class="page-shell">
    <!-- Header -->
    <header class="site-header">
      <div class="brand">
        <span class="brand-mark">SPACEX</span>
        <span class="brand-sub">CALENDAR</span>
      </div>
      <div class="header-actions">
        <p class="header-copy">{{ t('header.copy') }}</p>
        
        <!-- Language Switcher -->
        <div class="lang-selector">
          <select :value="activeLocale" @change="e => setLocale((e.target as HTMLSelectElement).value)" aria-label="Change language">
            <option v-for="lang in supportedLocales" :key="lang" :value="lang">
              {{ lang === 'zh-CN' ? '简体中文' : lang.toUpperCase() }}
            </option>
          </select>
        </div>

        <!-- Theme Toggle -->
        <button class="theme-toggle" @click="toggleTheme" type="button" :aria-label="t('header.themeToggleAria')">
          <svg v-if="theme === 'dark'" class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
            <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </g>
          </svg>
          <svg v-else class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- GitHub Link -->
        <a
          class="github-link"
          href="https://github.com/Mou7s/spacex-calendar"
          target="_blank"
          rel="noreferrer"
          :aria-label="t('header.githubAriaLabel')"
          title="GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 0.5C5.37 0.5 0 5.87 0 12.5C0 17.8 3.44 22.3 8.21 23.89C8.81 24 9.03 23.63 9.03 23.31C9.03 23.02 9.02 22.06 9.01 20.79C5.67 21.52 4.97 19.38 4.97 19.38C4.42 17.97 3.63 17.6 3.63 17.6C2.55 16.86 3.71 16.88 3.71 16.88C4.91 16.97 5.54 18.11 5.54 18.11C6.6 19.95 8.32 19.42 9 19.11C9.11 18.34 9.42 17.81 9.76 17.51C7.09 17.2 4.29 16.17 4.29 11.58C4.29 10.27 4.76 9.21 5.53 8.38C5.41 8.08 4.99 6.86 5.65 5.21C5.65 5.21 6.66 4.89 8.98 6.46C9.94 6.19 10.96 6.05 11.98 6.05C13 6.05 14.02 6.19 14.98 6.46C17.3 4.89 18.31 5.21 18.31 5.21C18.97 6.86 18.55 8.08 18.43 8.38C19.2 9.21 19.67 10.27 19.67 11.58C19.67 16.18 16.87 17.19 14.19 17.5C14.62 17.87 15 18.61 15 19.76C15 21.41 14.98 22.75 14.98 23.31C14.98 23.63 15.2 24.01 15.81 23.89C20.57 22.29 24 17.8 24 12.5C24 5.87 18.63 0.5 12 0.5Z"
              fill="currentColor"
            />
          </svg>
          <span>{{ t('header.github') }}</span>
        </a>
      </div>
    </header>

    <main>
      <!-- Subscribe Panel -->
      <section class="subscribe-panel">
        <div>
          <p class="eyebrow">{{ t('subscribe.eyebrow') }}</p>
          <h2>{{ t('subscribe.title') }}</h2>
          <p class="section-copy">{{ t('subscribe.copy') }}</p>
        </div>
        <div class="subscribe-actions">
          <a class="subscribe-link" :href="webcalSubscriptionLink">{{ t('subscribe.subscribeLink') }}</a>
          <code class="subscribe-url">{{ icsSubscriptionLink }}</code>
          <code class="subscribe-url">{{ webcalSubscriptionLink }}</code>
        </div>
      </section>

      <!-- Hero / Next Launch Section -->
      <section class="hero" id="hero" :style="heroStyle">
        <div class="hero-copy">
          <p class="eyebrow">{{ t('hero.eyebrow') }}</p>
          <h1>{{ nextLaunchTitle }}</h1>
          <p class="hero-description">{{ nextLaunchDescription }}</p>
          
          <div class="hero-meta">
            <div class="meta-card">
              <span class="meta-label">{{ t('hero.meta.nextLaunch') }}</span>
              <strong>{{ nextLaunchTimeFormatted }}</strong>
            </div>
            <div class="meta-card">
              <span class="meta-label">{{ t('hero.meta.countdown') }}</span>
              
              <!-- Live Countdown Display -->
              <div class="countdown-display">
                <div class="countdown-block">
                  <div class="countdown-val">{{ countdown.days }}</div>
                  <div class="countdown-unit">{{ t('countdown.units.days') }}</div>
                </div>
                <div class="countdown-block">
                  <div class="countdown-val">{{ countdown.hours }}</div>
                  <div class="countdown-unit">{{ t('countdown.units.hours') }}</div>
                </div>
                <div class="countdown-block">
                  <div class="countdown-val">{{ countdown.minutes }}</div>
                  <div class="countdown-unit">{{ t('countdown.units.minutes') }}</div>
                </div>
                <div class="countdown-block">
                  <div class="countdown-val">{{ countdown.seconds }}</div>
                  <div class="countdown-unit">{{ t('countdown.units.seconds') }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="hero-actions" v-if="upcomingPayload?.nextLaunch?.slug">
            <button class="hero-link" @click="selectMission(upcomingPayload.nextLaunch)">
              {{ t('history.detailsLink') }}
            </button>
          </div>
        </div>
      </section>

      <!-- Overview Grid (Month Strip & Tracker) -->
      <section class="overview-grid">
        <article class="panel panel-wide">
          <div class="panel-header">
            <p class="eyebrow">{{ t('overview.cadenceEyebrow') }}</p>
            <h2>{{ t('overview.cadenceTitle') }}</h2>
          </div>
          <div class="month-strip">
            <p v-if="!monthSummary.length">{{ t('overview.noLaunchWindows') }}</p>
            <article v-for="item in monthSummary" :key="item.isoMonth || item.label" class="month-pill">
              <strong>{{ item.count }}</strong>
              <span>{{ formatMonthPillLabel(item) }}</span>
            </article>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <p class="eyebrow">{{ t('overview.statusEyebrow') }}</p>
            <h2>{{ t('overview.statusTitle') }}</h2>
          </div>
          
          <!-- Tracker Info -->
          <div class="tracker">
            <div class="tracker-item">
              <span>{{ t('overview.tracker.missionsLoaded') }}</span>
              <strong>{{ upcomingPayload?.missions?.length || 0 }}</strong>
            </div>
            <div class="tracker-item">
              <span>{{ t('overview.tracker.timedWindows') }}</span>
              <strong>{{ timedWindowsCount }}</strong>
            </div>
            <div class="tracker-item">
              <span>{{ t('overview.tracker.liveNow') }}</span>
              <strong>{{ liveCount }}</strong>
            </div>
            <div class="tracker-item">
              <span>{{ t('overview.tracker.viewerTimezone') }}</span>
              <strong>{{ activeTimezoneDisplay }}</strong>
            </div>
          </div>
          
          <!-- Timezone Selector -->
          <div class="timezone-selector" role="group" aria-label="Display timezone">
            <button 
              v-for="opt in TIMEZONE_OPTIONS" 
              :key="opt.key"
              type="button"
              class="tz-btn"
              :class="{ 'is-active': activeTimezone === opt.tz }"
              :aria-pressed="activeTimezone === opt.tz ? 'true' : 'false'"
              :aria-label="t(`timezone.aria.${opt.key}`)"
              @click="setTimezone(opt.tz)"
            >
              {{ t(`timezone.${opt.key}`) }}
            </button>
          </div>
        </article>
      </section>

      <!-- Calendar Layout Section -->
      <section class="panel calendar-panel new-calendar-layout" aria-live="polite">
        <div class="calendar-sidebar">
          <div class="calendar-header">
            <div class="panel-header">
              <p class="eyebrow">{{ t('calendar.eyebrow') }}</p>
              <h2>{{ t('calendar.title') }}</h2>
            </div>
            <div class="calendar-nav">
              <button 
                class="calendar-nav-button" 
                :disabled="activeMonthIndex === 0" 
                @click="activeMonthIndex = Math.max(0, activeMonthIndex - 1)"
                type="button" 
                :aria-label="t('calendar.previousMonthAria')"
              >
                <span aria-hidden="true">&#8249;</span>
              </button>
              <strong class="calendar-month-label">{{ activeMonthLabel }}</strong>
              <button 
                class="calendar-nav-button" 
                :disabled="activeMonthIndex === monthKeys.length - 1" 
                @click="activeMonthIndex = Math.min(monthKeys.length - 1, activeMonthIndex + 1)"
                type="button" 
                :aria-label="t('calendar.nextMonthAria')"
              >
                <span aria-hidden="true">&#8250;</span>
              </button>
            </div>
          </div>
          
          <!-- Mini Grid -->
          <div class="mini-calendar">
            <div class="calendar-grid">
              <!-- Weekdays -->
              <div v-for="dayLabel in t('calendar.weekdayShort')" :key="dayLabel" class="calendar-weekday">
                {{ dayLabel }}
              </div>
              <!-- Grid Days -->
              <div 
                v-for="day in gridDays" 
                :key="day.isoDate"
                class="calendar-day"
                :class="{
                  'is-outside': !day.isCurrentMonth,
                  'is-today': day.isoDate === todayIso,
                  'has-events': day.hasEvents,
                  'is-selected': day.isoDate === selectedDateIso,
                  'is-date-focused': day.isoDate === focusedDateIso
                }"
                @click="day.hasEvents ? focusDate(day.isoDate) : null"
              >
                <div class="calendar-day-number">{{ day.dayNumber }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Events List in Current Month -->
        <div class="calendar-events-view">
          <div class="events-list">
            <div v-if="!monthMissions.length" class="empty-state">
              {{ t('calendar.noLaunches') }}
            </div>
            <button 
              v-for="mission in monthMissions" 
              :key="mission.key"
              type="button" 
              class="event-list-item"
              :class="{ 
                'is-history-event': mission.calendarGroup === 'history',
                'is-selected': mission.key === selectedMissionKey
              }"
              :data-date="mission.launchAt.slice(0, 10)"
              @click="selectMission(mission)"
            >
              <div class="event-list-date">
                <span>{{ formatEventMonth(mission.launchAt) }}</span>
                <strong>{{ formatEventDay(mission.launchAt) }}</strong>
              </div>
              <div class="event-list-details">
                <div class="event-list-title">{{ mission.title }}</div>
                <div class="event-list-meta">
                  <span v-if="mission.calendarGroup === 'history'">
                    {{ t(`history.status.${mission.success === true ? 'success' : mission.success === false ? 'failure' : 'unknown'}`) }}
                  </span>
                  <span v-else-if="mission.isLive" class="event-list-live">
                    {{ t('mission.live') }}
                  </span>
                  <span v-else-if="mission.launchAt">
                    {{ formatEventTime(mission.launchAt) }}
                  </span>
                  <span v-else>
                    {{ t('calendar.untimed') }}
                  </span>
                  
                  <span v-if="mission.calendarGroup !== 'history'">
                    {{ t(`mission.types.${mission.missionType?.toLowerCase()}`) || titleCase(mission.missionType) }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      <!-- Selected Mission Panel (Full Dynamic Details) -->
      <section class="selected-mission-panel" aria-live="polite">
        <!-- Empty State -->
        <div v-if="!selectedMission" class="selected-mission-empty">
          <p class="eyebrow">{{ t('mission.selectionEyebrow') }}</p>
          <h2>{{ t('mission.selectionTitle') }}</h2>
          <p>{{ t('mission.selectionCopy') }}</p>
        </div>
        
        <!-- Detailed State -->
        <div v-else class="selected-mission-card">
          <!-- Left Column: Mission Image -->
          <div 
            class="selected-mission-image" 
            :style="selectedMission.image ? { backgroundImage: `url(${selectedMission.image})` } : {}"
          ></div>
          
          <!-- Right Column: Mission Content -->
          <div class="selected-mission-content">
            <!-- Back button inside content to keep the grid clean -->
            <button class="tz-btn" style="margin-bottom: 1.5rem" @click="selectedMission = null" type="button">
              &larr; {{ t('calendar.title') }}
            </button>
            <h2 class="selected-mission-title">{{ selectedMission.title }}</h2>
            <div class="mission-topline" style="margin-bottom: 1rem">
              <span class="mission-badge" :class="{ 'is-live': selectedMission.isLive }">
                {{ selectedMission.isLive ? t('mission.live') : t(`status.${selectedMission.status?.toLowerCase()}`) || titleCase(selectedMission.status) }}
              </span>
              <span class="mission-type">
                {{ t(`mission.types.${selectedMission.missionType?.toLowerCase()}`) || titleCase(selectedMission.missionType) }}
              </span>
            </div>
            
            <p class="mission-window" style="font-size: 1.1rem; color: var(--accent); font-weight: 500; margin-bottom: 1.5rem">
              {{ getMissionWindowCopy(selectedMission) }}
            </p>

            <dl class="mission-facts" style="margin-bottom: 2rem">
              <div>
                <dt>{{ t('mission.vehicle') }}</dt>
                <dd>{{ selectedMission.vehicle || t('mission.tbd') }}</dd>
              </div>
              <div>
                <dt>{{ t('mission.launchSite') }}</dt>
                <dd>{{ selectedMission.launchSite || t('mission.tbd') }}</dd>
              </div>
              <div>
                <dt>{{ t('mission.returnSite') }}</dt>
                <dd>{{ selectedMission.returnSite || t('mission.tbd') }}</dd>
              </div>
            </dl>

            <!-- Dynamic Asynchronous Details -->
            <div v-if="loadingDetails" class="selected-details-loading">
              <p>{{ t('mission.detailsLoading') }}</p>
            </div>
            
            <div v-else-if="details" class="selected-details-loaded">
              <div v-if="details.summary" style="margin-bottom: 2rem">
                <div class="mission-details-heading" style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem">
                  {{ t('mission.detailsHeading') }}
                </div>
                <p class="selected-mission-summary" style="line-height: 1.6; color: var(--text-secondary)">
                  {{ details.summary }}
                </p>
              </div>
              
              <!-- Countdown / Countdown Timeline -->
              <div v-if="details.timelines?.preLaunch?.entries?.length" class="selected-timeline" style="margin-bottom: 2rem">
                <h3 style="font-size: 1.1rem; margin-bottom: 1rem">{{ t('mission.preLaunchTimeline') }}</h3>
                <p v-if="details.timelines.preLaunch.disclaimer" class="selected-timeline-disclaimer" style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem">
                  {{ details.timelines.preLaunch.disclaimer }}
                </p>
                <ol class="selected-timeline-list">
                  <li v-for="(entry, index) in details.timelines.preLaunch.entries" :key="index">
                    <span>{{ entry.time }}</span>
                    <strong>{{ entry.description }}</strong>
                  </li>
                </ol>
              </div>

              <!-- Post-launch sequence timeline -->
              <div v-if="details.timelines?.postLaunch?.entries?.length" class="selected-timeline" style="margin-bottom: 2rem">
                <h3 style="font-size: 1.1rem; margin-bottom: 1rem">{{ t('mission.postLaunchTimeline') }}</h3>
                <p v-if="details.timelines.postLaunch.disclaimer" class="selected-timeline-disclaimer" style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem">
                  {{ details.timelines.postLaunch.disclaimer }}
                </p>
                <ol class="selected-timeline-list">
                  <li v-for="(entry, index) in details.timelines.postLaunch.entries" :key="index">
                    <span>{{ entry.time }}</span>
                    <strong>{{ entry.description }}</strong>
                  </li>
                </ol>
              </div>

              <!-- Actions/Media Webcasts -->
              <div class="selected-mission-actions" style="display: flex; gap: 1rem; flex-wrap: wrap">
                <a 
                  v-for="webcast in details.webcasts" 
                  :key="webcast.id" 
                  :href="webcast.url"
                  target="_blank"
                  rel="noreferrer"
                  class="subscribe-link selected-mission-link"
                  style="margin: 0; padding: 0.6rem 1.2rem; font-size: 0.9rem"
                >
                  {{ webcast.title || t('mission.watchLive') }}
                </a>
                <a 
                  v-if="details.media?.infographicDesktop?.url" 
                  :href="details.media.infographicDesktop.url" 
                  target="_blank" 
                  rel="noreferrer"
                  class="subscribe-link selected-mission-link"
                  style="margin: 0; padding: 0.6rem 1.2rem; font-size: 0.9rem"
                >
                  {{ t('mission.infographicLink') }}
                </a>
              </div>
            </div>
            
            <div v-else-if="!loadingDetails" class="selected-details-unavailable" style="color: var(--text-muted)">
              <p>{{ t('mission.detailsUnavailable') }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Beautiful FAQ accordion at the bottom for SEO optimization -->
      <section class="panel faq-panel" style="margin-top: 3rem; padding: 2rem">
        <div class="panel-header" style="margin-bottom: 2rem">
          <p class="eyebrow">FAQ & Guides</p>
          <h2 style="font-size: 2rem; background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent">
            常见问题与日历指南
          </h2>
        </div>
        
        <div class="faq-accordion" style="display: flex; flex-direction: column; gap: 1rem">
          <details class="faq-item" style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem; cursor: pointer; transition: all 0.3s ease" v-for="i in [1, 2, 3, 4]" :key="i">
            <summary style="font-weight: 600; font-size: 1.1rem; color: var(--accent); outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center">
              <span>{{ getFaqQuestion(i) }}</span>
              <span class="faq-icon">&darr;</span>
            </summary>
            <p style="margin-top: 1rem; line-height: 1.6; color: var(--text-secondary); cursor: default" v-html="getFaqAnswer(i)"></p>
          </details>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useHead, useFetch } from '#app'
import { useI18n } from '~/composables/useI18n'

const { t, activeLocale, supportedLocales, setLocale } = useI18n()

// Fetch landing page launch and history payload on Server Side
const { data: upcomingPayload } = await useFetch<any>('/api/launches')
const { data: historyPayload } = await useFetch<any>('/api/history-launches')

// Dynamic JSON-LD injection for Google SEO
const nextLaunch = computed(() => upcomingPayload.value?.nextLaunch)

const heroStyle = computed(() => {
  if (nextLaunch.value?.image) {
    return {
      backgroundImage: `radial-gradient(circle at top, var(--hero-glow), transparent 34%), url("${nextLaunch.value.image}")`
    }
  }
  return {}
})

useHead({
  title: computed(() => {
    if (nextLaunch.value) {
      const formattedDate = nextLaunch.value.launchAt
        ? new Date(nextLaunch.value.launchAt).toLocaleDateString(activeLocale.value, { month: 'short', day: 'numeric' })
        : ''
      return `${t('meta.title')} | ${t('hero.meta.nextLaunch')}: ${nextLaunch.value.title} (${formattedDate})`
    }
    return t('meta.title')
  }),
  meta: [
    { name: 'description', content: t('meta.description') },
    { property: 'og:title', content: t('meta.title') },
    { property: 'og:description', content: t('meta.description') },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: '/icon-512.png' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: t('meta.title') },
    { name: 'twitter:description', content: t('meta.description') },
    { name: 'twitter:image', content: '/icon-512.png' }
  ],
  script: [
    {
      type: 'application/ld+json',
      children: computed(() => JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": "https://spacexcalendar.mou7s.com/#website",
            "url": "https://spacexcalendar.mou7s.com/",
            "name": t('meta.title'),
            "description": t('meta.description')
          },
          {
            "@type": "SoftwareApplication",
            "@id": "https://spacexcalendar.mou7s.com/#software",
            "name": "SpaceX Calendar PWA",
            "operatingSystem": "All",
            "applicationCategory": "UtilitiesApplication",
            "offers": {
              "@type": "Offer",
              "price": "0.00",
              "priceCurrency": "USD"
            }
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
      }))
    }
  ]
})

// Domain Subscription Links
const webcalSubscriptionLink = computed(() => {
  if (import.meta.client) {
    const httpUrl = new URL("/spacex.ics", window.location.href)
    return `webcal://${httpUrl.host}${httpUrl.pathname}`
  }
  return 'webcal://spacexcalendar.mou7s.com/spacex.ics'
})

const icsSubscriptionLink = computed(() => {
  if (import.meta.client) {
    return new URL("/spacex.ics", window.location.href).toString()
  }
  return 'https://spacexcalendar.mou7s.com/spacex.ics'
})

// Timezone Configurations
const TIMEZONE_OPTIONS = [
  { key: "local", tz: null },
  { key: "utc",   tz: "UTC" },
  { key: "et",    tz: "America/New_York" },
  { key: "ct",    tz: "America/Chicago" },
  { key: "pt",    tz: "America/Los_Angeles" },
]
const activeTimezone = ref<string | null>(null)

const activeTimezoneDisplay = computed(() => {
  if (activeTimezone.value) {
    return activeTimezone.value.split("/").pop()?.replace(/_/g, " ") || activeTimezone.value
  }
  if (import.meta.client) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  return "UTC"
})

const setTimezone = (tz: string | null) => {
  activeTimezone.value = tz
}

// DateTime formatting helper
const getDateTimeFormatter = (withZone = true, timeZoneOverride?: string | null) => {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }

  if (withZone) {
    options.timeZoneName = "short"
  }

  const tz = timeZoneOverride !== undefined ? timeZoneOverride : activeTimezone.value
  if (tz) {
    options.timeZone = tz
  }

  return new Intl.DateTimeFormat(activeLocale.value, options)
}

const formatDateTime = (iso: string, withZone = true) => {
  if (!iso) return t("mission.tbd")
  return getDateTimeFormatter(withZone).format(new Date(iso))
}

const formatDateTimeUtc = (iso: string) => {
  if (!iso) return t("mission.tbd")
  return getDateTimeFormatter(true, "UTC").format(new Date(iso))
}

// Next Launch Details
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
    launchSite: mission.launchSite || t("mission.tbd"),
    returnSite: mission.returnSite || t("mission.tbd")
  })
})

const nextLaunchTimeFormatted = computed(() => {
  const mission = nextLaunch.value
  if (!mission?.launchAt) {
    return t("hero.pending")
  }
  return formatDateTime(mission.launchAt)
})

// Live Countdown ticking
const countdown = ref({ days: "00", hours: "00", minutes: "00", seconds: "00" })
let timerId: any = null

const updateCountdown = () => {
  const mission = nextLaunch.value
  if (!mission?.launchAt) {
    countdown.value = { days: "00", hours: "00", minutes: "00", seconds: "00" }
    return
  }

  const diffMs = Date.parse(mission.launchAt) - Date.now()

  if (diffMs <= 0) {
    countdown.value = { days: "00", hours: "00", minutes: "00", seconds: "00" }
    return
  }

  const secs = Math.floor(diffMs / 1000)
  const days = Math.floor(secs / 86400)
  const hours = Math.floor((secs % 86400) / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  const remainingSecs = secs % 60

  countdown.value = {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(mins).padStart(2, "0"),
    seconds: String(remainingSecs).padStart(2, "0")
  }
}

// Cadence Month Strip Summary
const monthSummary = computed(() => upcomingPayload.value?.monthSummary || [])

const formatMonthPillLabel = (item: any) => {
  if (item.isoMonth) {
    return new Intl.DateTimeFormat(activeLocale.value, {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${item.isoMonth}-01T00:00:00.000Z`))
  }
  return item.label
}

// Tracker Computes
const timedWindowsCount = computed(() => {
  const missions = upcomingPayload.value?.missions || []
  return missions.filter((m: any) => m.launchAt).length
})

const liveCount = computed(() => {
  const missions = upcomingPayload.value?.missions || []
  return missions.filter((m: any) => m.isLive).length
})

// Calendar missions integration (Upcoming & History)
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
  
  return new Intl.DateTimeFormat(activeLocale.value, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-01T00:00:00.000Z`))
})

// Current month's missions list
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

// Grid Days calculation for active month
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

  // Create set of event dates for faster lookup
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

// Selection actions
const selectedMission = ref<any>(null)
const selectedMissionKey = computed(() => selectedMission.value?.key || null)

const loadingDetails = ref(false)
const details = ref<any>(null)

const selectMission = async (mission: any) => {
  selectedMission.value = mission
  focusedDateIso.value = mission.launchAt?.slice(0, 10) || null
  
  if (mission.slug) {
    loadingDetails.value = true
    details.value = null
    try {
      const res: any = await $fetch(`/api/launches/${mission.slug}`)
      if (res?.details) {
        details.value = res.details
      }
    } catch (e) {
      console.error(e)
    } finally {
      loadingDetails.value = false
    }
  } else {
    details.value = null
  }

  // Scroll into selected mission detail view on mobile
  if (import.meta.client) {
    setTimeout(() => {
      const panel = document.querySelector('.selected-mission-panel')
      panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }
}

const focusDate = (isoDate: string) => {
  selectedDateIso.value = isoDate
  
  // Find first event on this day and trigger select
  const firstOnDay = monthMissions.value.find((m: any) => m.launchAt.slice(0, 10) === isoDate)
  if (firstOnDay) {
    selectMission(firstOnDay)
  }
}

// Static format timing copy helpers
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

const formatEventMonth = (iso: string) => {
  const dateObj = new Date(iso)
  return new Intl.DateTimeFormat(activeLocale.value, { month: "short", timeZone: "UTC" }).format(dateObj)
}

const formatEventDay = (iso: string) => {
  return new Date(iso).getUTCDate()
}

const formatEventTime = (iso: string) => {
  return new Intl.DateTimeFormat(activeLocale.value, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso))
}

const titleCase = (value: string) => {
  return value
    ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : t("mission.unspecified")
}

// FAQ dynamic localized keys for SEO
const getFaqQuestion = (num: number) => {
  if (num === 1) return activeLocale.value === 'zh-CN' ? '如何将 SpaceX 发射日程订阅导入到 Google 日历 / 苹果日历？' : 'How do I add the SpaceX launch schedule to Google Calendar or Apple Calendar?'
  if (num === 2) return activeLocale.value === 'zh-CN' ? '这个日历的更新频率是怎样的？' : 'How often is this launch calendar updated?'
  if (num === 3) return activeLocale.value === 'zh-CN' ? '它追踪了哪些运载火箭和发射基地？' : 'What launch vehicles and launch sites are tracked?'
  if (num === 4) return activeLocale.value === 'zh-CN' ? '我可以在日历中直接观看发射直播吗？' : 'Can I watch launch live streams directly from the calendar?'
  return ''
}

const getFaqAnswer = (num: number) => {
  if (num === 1) return activeLocale.value === 'zh-CN' 
    ? '非常简单！你只需点击上方页面顶部的“<b>订阅在线日历</b>”按钮。在 iPhone 或 Mac 上它会直接触发日历添加请求；在谷歌日历（Google Calendar）中，复制 <code>' + webcalSubscriptionLink.value + '</code> 链接，在电脑网页端点击左侧“其他日历 &rarr; 通过 URL 添加”，粘贴链接订阅即可同步。'
    : 'Extremely easy! Simply click the "<b>Subscribe to Calendar</b>" button. On iOS or macOS devices, it automatically prompts you to subscribe. On Google Calendar, copy the <code>' + webcalSubscriptionLink.value + '</code> link, navigate to Calendar Web &rarr; Other Calendars &rarr; Add by URL, and paste the address.'
  if (num === 2) return activeLocale.value === 'zh-CN'
    ? '数据是<b>实时维护更新</b>的。我们的服务器边缘节点通过 Cloudflare KV 每 5 分钟与 SpaceX 官网数据同步一次，自动解析调整窗口，并实时刷新你日历应用里的时间安排。'
    : 'The schedules are <b>automatically kept updated</b>. The server-side edge engine queries official SpaceX APIs every 5 minutes and caches the latest queues inside Cloudflare KV, updating countdowns and calendar feeds in real-time.'
  if (num === 3) return activeLocale.value === 'zh-CN'
    ? '该日历全方位覆盖 SpaceX 当前运行的所有运载火箭。包括<b>猎鹰九号 (Falcon 9)</b>、<b>重型猎鹰 (Falcon Heavy)</b> 以及目前正在进行试飞与重大任务的<b>星舰 (Starship)</b>。发射地点则全面追踪卡纳维拉尔角 (Cape Canaveral)、范登堡太空军基地 (Vandenberg SFB) 和博卡奇卡星基地 (Starbase Boca Chica)。'
    : 'The calendar tracks all active SpaceX launch systems, including <b>Falcon 9</b>, <b>Falcon Heavy</b>, and the deep-space <b>Starship</b> vehicle. Pad locations cover all commercial pads at Cape Canaveral Space Force Station (Florida), Vandenberg Space Force Base (California), and Boca Chica Starbase (Texas).'
  if (num === 4) return activeLocale.value === 'zh-CN'
    ? '是的。当发射事件临近且 SpaceX 公布了直播视频流后，你在日历事件中或者该落地页详情面板中，都可以直接获取到官方的直播通道（例如 YouTube 或 X.com 现场直播），一键触达直播现场。'
    : 'Yes. Once SpaceX publishes the official webcast media links, our SWR cache automatically matches details and appends the streaming webcast URLs (such as YouTube or X.com live broads) inside the calendar description and page details panel.'
  return ''
}

// Client theme handling
const theme = ref('dark')
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  if (import.meta.client) {
    localStorage.setItem('spacex_calendar_theme', theme.value)
    document.documentElement.className = theme.value
  }
}

onMounted(() => {
  // Theme check
  const storedTheme = localStorage.getItem('spacex_calendar_theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  theme.value = storedTheme || (prefersDark ? 'dark' : 'light')
  document.documentElement.className = theme.value
  document.documentElement.lang = activeLocale.value

  // Start countdown ticker
  updateCountdown()
  timerId = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
})
</script>

<style>
/* Adjust standard Nuxt container wrapper styles for custom raw layout */
body {
  margin: 0;
  padding: 0;
}
.lang-selector select {
  background: var(--surface-secondary);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
}
.faq-accordion details[open] summary .faq-icon {
  transform: rotate(180deg);
}
.faq-icon {
  transition: transform 0.3s ease;
}
</style>
