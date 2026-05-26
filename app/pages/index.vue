<template>
  <div class="page-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-neutral-200 dark:border-neutral-800/80 pb-6 mb-8">
      <div class="brand flex gap-3 items-baseline">
        <span class="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-mono">SPACEX</span>
        <span class="text-[10px] tracking-[0.3em] text-neutral-500 dark:text-neutral-400 font-bold uppercase">CALENDAR</span>
      </div>
      <div class="flex items-center gap-4 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
        <p class="text-xs text-neutral-500 dark:text-neutral-400 hidden lg:block mr-2">{{ t('header.copy') }}</p>
        
        <!-- Language Selector -->
        <USelect
          v-model="activeLocaleModel"
          :items="localeItems"
          size="sm"
          color="neutral"
          variant="subtle"
          aria-label="Change language"
          class="min-w-[120px]"
        />

        <!-- Theme Toggle -->
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
          color="neutral"
          variant="subtle"
          class="rounded-full"
          @click="toggleTheme"
          :aria-label="t('header.themeToggleAria')"
        />

        <!-- GitHub Link -->
        <UButton
          icon="i-simple-icons-github"
          color="neutral"
          variant="outline"
          class="rounded-full font-semibold uppercase tracking-wider text-[10px]"
          to="https://github.com/Mou7s/spacex-calendar"
          target="_blank"
          aria-label="GitHub Repository"
        >
          GitHub
        </UButton>
      </div>
    </header>

    <main>
      <!-- Subscribe Panel -->
      <section class="mb-8">
        <UCard class="bg-white/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800/80 ring-0 rounded-3xl backdrop-blur-md">
          <div class="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
            <div>
              <p class="text-[10px] uppercase tracking-widest text-primary-600 dark:text-primary-400 font-bold mb-1">{{ t('subscribe.eyebrow') }}</p>
              <h2 class="text-2xl font-bold text-neutral-900 dark:text-white uppercase tracking-tight mb-2">{{ t('subscribe.title') }}</h2>
              <p class="text-sm text-neutral-500 dark:text-neutral-400 max-w-3xl leading-relaxed">{{ t('subscribe.copy') }}</p>
            </div>
            <div class="flex flex-col gap-3 w-full lg:max-w-md shrink-0">
              <UButton
                :to="webcalSubscriptionLink"
                color="primary"
                size="md"
                block
                class="rounded-2xl font-bold uppercase tracking-wider text-xs py-3"
                icon="i-heroicons-calendar-days"
              >
                {{ t('subscribe.subscribeLink') }}
              </UButton>
              <div class="flex flex-col gap-2">
                <code class="text-[11px] bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-3 text-neutral-800 dark:text-neutral-300 overflow-x-auto block font-mono">
                  {{ icsSubscriptionLink }}
                </code>
              </div>
            </div>
          </div>
        </UCard>
      </section>

      <!-- Hero / Next Launch Section -->
      <section 
        class="hero relative min-h-[50vh] flex items-end overflow-hidden p-8 sm:p-12 border border-neutral-800 rounded-3xl shadow-2xl mb-8 transition-all duration-500"
        id="hero"
        :style="heroStyle"
      >
        <!-- Dark gradient scrim -->
        <div class="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent pointer-events-none z-0"></div>

        <div class="hero-copy relative z-10 w-full max-w-4xl">
          <p class="text-[10px] uppercase tracking-[0.25em] text-neutral-300 font-bold mb-2">{{ t('hero.eyebrow') }}</p>
          <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight uppercase leading-none mb-4 font-mono">
            {{ nextLaunchTitle }}
          </h1>
          <p class="text-sm sm:text-base text-neutral-300 mb-8 max-w-2xl leading-relaxed">
            {{ nextLaunchDescription }}
          </p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Next Launch Target Time -->
            <UCard class="bg-neutral-950/60 border-neutral-800/40 backdrop-blur-md ring-0 rounded-2xl">
              <span class="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">{{ t('hero.meta.nextLaunch') }}</span>
              <strong class="block text-lg sm:text-xl font-bold text-white mt-2 font-mono">{{ nextLaunchTimeFormatted }}</strong>
            </UCard>

            <!-- Countdown Timer -->
            <UCard class="bg-neutral-950/60 border-neutral-800/40 backdrop-blur-md ring-0 rounded-2xl">
              <span class="text-[10px] uppercase tracking-wider text-neutral-400 font-bold mb-2 block">{{ t('hero.meta.countdown') }}</span>
              
              <div class="flex gap-5 items-center">
                <div v-for="unit in ['days', 'hours', 'minutes', 'seconds']" :key="unit" class="flex flex-col items-center">
                  <div class="text-xl sm:text-2xl font-bold text-white font-mono leading-none relative">
                    {{ countdown[unit as keyof typeof countdown] }}
                  </div>
                  <div class="text-[9px] uppercase tracking-wider text-neutral-400 mt-1.5 font-bold">
                    {{ t(`countdown.units.${unit}`) }}
                  </div>
                </div>
              </div>
            </UCard>
          </div>
          
          <div class="mt-6" v-if="upcomingPayload?.nextLaunch?.slug">
            <UButton
              color="neutral"
              variant="solid"
              size="sm"
              class="rounded-full font-bold uppercase tracking-wider text-[10px] px-6 py-2.5 shadow-lg"
              @click="selectMission(upcomingPayload.nextLaunch)"
              icon="i-heroicons-information-circle"
            >
              {{ t('history.detailsLink') }}
            </UButton>
          </div>
        </div>
      </section>

      <!-- Overview Grid (Month Strip & Tracker) -->
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Near Cadence Count Summary -->
        <UCard class="lg:col-span-2 bg-white/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800/80 ring-0 rounded-3xl backdrop-blur-md">
          <template #header>
            <div class="pb-1">
              <p class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold mb-0.5">{{ t('overview.cadenceEyebrow') }}</p>
              <h3 class="text-base font-bold text-neutral-900 dark:text-white uppercase">{{ t('overview.cadenceTitle') }}</h3>
            </div>
          </template>
          
          <div class="flex flex-wrap gap-3">
            <p v-if="!monthSummary.length" class="text-neutral-500 dark:text-neutral-400 text-sm">{{ t('overview.noLaunchWindows') }}</p>
            <div 
              v-for="item in monthSummary" 
              :key="item.isoMonth || item.label" 
              class="bg-neutral-50 dark:bg-neutral-950/80 border border-neutral-200 dark:border-neutral-800/80 px-4 py-3 rounded-2xl flex flex-col items-center min-w-[90px] text-center"
            >
              <strong class="text-xl font-bold text-neutral-900 dark:text-white font-mono">{{ item.count }}</strong>
              <span class="text-[9px] text-neutral-500 dark:text-neutral-400 uppercase font-bold mt-1.5">{{ formatMonthPillLabel(item) }}</span>
            </div>
          </div>
        </UCard>

        <!-- Stats Tracker -->
        <UCard class="bg-white/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800/80 ring-0 rounded-3xl backdrop-blur-md">
          <template #header>
            <div class="pb-1">
              <p class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold mb-0.5">{{ t('overview.statusEyebrow') }}</p>
              <h3 class="text-base font-bold text-neutral-900 dark:text-white uppercase">{{ t('overview.statusTitle') }}</h3>
            </div>
          </template>
          
          <div class="flex flex-col gap-2.5">
            <div class="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800/30 pb-2 text-xs">
              <span class="text-neutral-500 dark:text-neutral-400">{{ t('overview.tracker.missionsLoaded') }}</span>
              <strong class="text-neutral-900 dark:text-white font-mono text-sm">{{ upcomingPayload?.missions?.length || 0 }}</strong>
            </div>
            <div class="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800/30 pb-2 text-xs">
              <span class="text-neutral-500 dark:text-neutral-400">{{ t('overview.tracker.timedWindows') }}</span>
              <strong class="text-neutral-900 dark:text-white font-mono text-sm">{{ timedWindowsCount }}</strong>
            </div>
            <div class="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800/30 pb-2 text-xs">
              <span class="text-neutral-500 dark:text-neutral-400">{{ t('overview.tracker.liveNow') }}</span>
              <strong class="text-neutral-900 dark:text-white font-mono text-sm">{{ liveCount }}</strong>
            </div>
            <div class="flex justify-between items-center pb-1 text-xs">
              <span class="text-neutral-500 dark:text-neutral-400">{{ t('overview.tracker.viewerTimezone') }}</span>
              <strong class="text-neutral-900 dark:text-white text-[11px] font-mono">{{ activeTimezoneDisplay }}</strong>
            </div>
          </div>
          
          <!-- Timezone Toggles -->
          <div class="flex flex-wrap gap-1 mt-4" role="group" aria-label="Display timezone">
            <UButton
              v-for="opt in TIMEZONE_OPTIONS" 
              :key="opt.key"
              size="xs"
              class="rounded-lg font-bold uppercase text-[9px] tracking-wide"
              :color="activeTimezone === opt.tz ? 'primary' : 'neutral'"
              :variant="activeTimezone === opt.tz ? 'solid' : 'subtle'"
              @click="setTimezone(opt.tz)"
            >
              {{ t(`timezone.${opt.key}`) }}
            </UButton>
          </div>
        </UCard>
      </section>

      <!-- Calendar Sidebar Layout Section -->
      <section class="mb-8" aria-live="polite">
        <UCard class="bg-white/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800/80 ring-0 rounded-3xl backdrop-blur-md">
          <div class="flex flex-col lg:flex-row gap-8">
            <!-- Calendar Navigation & Mini Grid -->
            <div class="w-full lg:w-[320px] flex flex-col gap-5 shrink-0">
              <div class="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800/50 pb-3">
                <div>
                  <p class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold mb-0.5">{{ t('calendar.eyebrow') }}</p>
                  <h3 class="text-base font-bold text-neutral-900 dark:text-white uppercase">{{ t('calendar.title') }}</h3>
                </div>
                
                <div class="flex items-center gap-1.5">
                  <UButton
                    icon="i-heroicons-chevron-left"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    class="rounded-lg"
                    :disabled="activeMonthIndex === 0"
                    @click="activeMonthIndex = Math.max(0, activeMonthIndex - 1)"
                    aria-label="Previous month"
                  />
                  <strong class="text-[10px] uppercase tracking-wider text-neutral-900 dark:text-white min-w-[70px] text-center font-bold font-mono">
                    {{ activeMonthLabel }}
                  </strong>
                  <UButton
                    icon="i-heroicons-chevron-right"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    class="rounded-lg"
                    :disabled="activeMonthIndex === monthKeys.length - 1"
                    @click="activeMonthIndex = Math.min(monthKeys.length - 1, activeMonthIndex + 1)"
                    aria-label="Next month"
                  />
                </div>
              </div>

              <!-- Mini Grid -->
              <div class="grid grid-cols-7 gap-1 text-center text-xs">
                <div v-for="dayLabel in t('calendar.weekdayShort')" :key="dayLabel" class="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase py-1">
                  {{ dayLabel }}
                </div>
                
                <!-- Grid Days -->
                <button
                  v-for="day in gridDays"
                  :key="day.isoDate"
                  type="button"
                  class="h-9 w-9 rounded-xl flex items-center justify-center relative transition-all duration-150 cursor-pointer"
                  :class="{
                    'text-neutral-600': !day.isCurrentMonth,
                    'text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800': day.isCurrentMonth,
                    'bg-primary-500 text-neutral-950 font-bold': day.isoDate === todayIso,
                    'ring-2 ring-neutral-900 dark:ring-white font-bold': day.isoDate === selectedDateIso,
                    'ring-1 ring-neutral-500': day.isoDate === focusedDateIso && day.isoDate !== selectedDateIso
                  }"
                  :disabled="!day.hasEvents"
                  @click="day.hasEvents ? focusDate(day.isoDate) : null"
                >
                  <span class="text-xs">{{ day.dayNumber }}</span>
                  <!-- Launch Dot -->
                  <span v-if="day.hasEvents" class="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400"></span>
                </button>
              </div>
            </div>

            <!-- Calendar Events List -->
            <div class="flex-1 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-neutral-800/80 pt-6 lg:pt-0 lg:pl-8 max-h-[380px] overflow-y-auto pr-2">
              <div class="flex flex-col gap-2.5">
                <p v-if="!monthMissions.length" class="text-neutral-500 dark:text-neutral-400 text-sm py-4">{{ t('calendar.noLaunches') }}</p>
                
                <UButton
                  v-for="mission in monthMissions"
                  :key="mission.key"
                  :id="`mission-card-${mission.key}`"
                  color="neutral"
                  variant="ghost"
                  class="flex items-center gap-4 text-left p-4 rounded-2xl w-full border border-neutral-200/60 dark:border-neutral-800/20"
                  :class="{
                    'bg-neutral-100 dark:bg-neutral-800/40 border-neutral-300 dark:border-neutral-700/60 shadow-md': mission.key === selectedMissionKey
                  }"
                  @click="selectMission(mission)"
                >
                  <div class="flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950/80 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-center min-w-[50px] leading-none shrink-0">
                    <span class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">{{ formatEventMonth(mission.launchAt) }}</span>
                    <strong class="text-lg font-bold text-neutral-900 dark:text-white mt-1">{{ formatEventDay(mission.launchAt) }}</strong>
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-sm truncate text-neutral-900 dark:text-white uppercase">{{ mission.title }}</div>
                    <div class="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
                      <span v-if="mission.calendarGroup === 'history'" class="text-emerald-400 font-bold uppercase">
                        {{ t(`history.status.${mission.success === true ? 'success' : mission.success === false ? 'failure' : 'unknown'}`) }}
                      </span>
                      <span v-else-if="mission.isLive" class="text-red-400 font-bold uppercase tracking-wider">
                        {{ t('mission.live') }}
                      </span>
                      <span v-else-if="mission.launchAt">
                        {{ formatEventTime(mission.launchAt) }}
                      </span>
                      <span v-else>
                        {{ t('calendar.untimed') }}
                      </span>

                      <span>•</span>
                      <span>{{ t(`mission.types.${mission.missionType?.toLowerCase()}`) || titleCase(mission.missionType) }}</span>
                    </div>
                  </div>
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </section>

      <!-- Selected Mission Panel (Full Dynamic Details) -->
      <section class="mb-8 selected-mission-panel" id="selected-mission-panel" aria-live="polite">
        <!-- Empty State -->
        <UCard v-if="!selectedMission" class="bg-white/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800/80 ring-0 rounded-3xl p-6 text-center">
          <p class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold mb-1">{{ t('mission.selectionEyebrow') }}</p>
          <h3 class="text-2xl font-bold text-neutral-900 dark:text-white uppercase mb-2">{{ t('mission.selectionTitle') }}</h3>
          <p class="text-neutral-500 dark:text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed">{{ t('mission.selectionCopy') }}</p>
        </UCard>
        
        <!-- Detailed Card -->
        <div v-else class="bg-white/80 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-5 min-h-[420px] backdrop-blur-md">
          <!-- Left Column: Mission High-Res Background Image -->
          <div 
            class="md:col-span-2 min-h-[260px] md:min-h-full bg-center bg-cover bg-no-repeat bg-neutral-50 dark:bg-neutral-950 transition-all duration-300 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800/80"
            :style="selectedMission.image ? { backgroundImage: `url(${selectedMission.image})` } : {}"
          ></div>
          
          <!-- Right Column: Mission Content Details -->
          <div class="md:col-span-3 p-8 sm:p-10 flex flex-col justify-between">
            <div>
              <!-- Back button inside content -->
              <UButton
                icon="i-heroicons-arrow-left"
                size="xs"
                color="neutral"
                variant="subtle"
                class="mb-6 rounded-lg uppercase tracking-wider text-[9px]"
                @click="selectedMission = null"
              >
                {{ t('calendar.title') }}
              </UButton>

              <h2 class="text-2xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white uppercase tracking-tight mb-3">
                {{ selectedMission.title }}
              </h2>
              
              <div class="flex items-center gap-2 mb-4">
                <span 
                  class="px-2 py-0.5 rounded text-[9px] uppercase font-extrabold text-neutral-950" 
                  :class="{ 
                    'bg-red-400 animate-pulse': selectedMission.isLive,
                    'bg-emerald-400': selectedMission.calendarGroup === 'history' && selectedMission.success === true,
                    'bg-rose-400': selectedMission.calendarGroup === 'history' && selectedMission.success === false,
                    'bg-neutral-400': selectedMission.calendarGroup !== 'history' && !selectedMission.isLive
                  }"
                >
                  <template v-if="selectedMission.calendarGroup === 'history'">
                    {{ t(`history.status.${selectedMission.success === true ? 'success' : selectedMission.success === false ? 'failure' : 'unknown'}`) }}
                  </template>
                  <template v-else>
                    {{ selectedMission.isLive ? t('mission.live') : t(`status.${selectedMission.status?.toLowerCase()}`) || titleCase(selectedMission.status) }}
                  </template>
                </span>
                <span class="text-xs text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">
                  {{ t(`mission.types.${selectedMission.missionType?.toLowerCase()}`) || titleCase(selectedMission.missionType) }}
                </span>
              </div>
              
              <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-6 leading-relaxed">
                {{ getMissionWindowCopy(selectedMission) }}
              </p>

              <!-- Mission Facts List -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-b border-neutral-200 dark:border-neutral-800/40 py-6 mb-6">
                <div>
                  <div class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold mb-1">{{ t('mission.vehicle') }}</div>
                  <div class="text-sm font-bold text-neutral-900 dark:text-white font-mono">{{ selectedMission.vehicle || t('mission.tbd') }}</div>
                </div>
                <div>
                  <div class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold mb-1">{{ t('mission.launchSite') }}</div>
                  <div class="text-sm font-bold text-neutral-900 dark:text-white">{{ selectedMission.launchSite || t('mission.tbd') }}</div>
                </div>
                <div>
                  <div class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold mb-1">{{ t('mission.returnSite') }}</div>
                  <div class="text-sm font-bold text-neutral-900 dark:text-white">{{ selectedMission.returnSite || t('mission.tbd') }}</div>
                </div>
              </div>

              <!-- Dynamic Details Loading -->
              <div v-if="loadingDetails" class="py-4 text-center">
                <span class="text-neutral-500 dark:text-neutral-400 text-sm animate-pulse">{{ t('mission.detailsLoading') }}</span>
              </div>
              
              <div v-else-if="details" class="flex flex-col gap-6">
                <div v-if="details.summary">
                  <div class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold mb-2">
                    {{ t('mission.detailsHeading') }}
                  </div>
                  <p class="text-neutral-800 dark:text-neutral-300 text-sm leading-relaxed font-light">
                    {{ details.summary }}
                  </p>
                </div>
                
                <!-- Timelines Grid -->
                <div 
                  v-if="details.timelines?.preLaunch?.entries?.length || details.timelines?.postLaunch?.entries?.length"
                  class="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <!-- Pre-Launch Timeline -->
                  <div v-if="details.timelines?.preLaunch?.entries?.length" class="bg-neutral-50/80 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800/60 p-5 rounded-2xl">
                    <h4 class="text-xs uppercase tracking-widest text-primary-600 dark:text-primary-400 font-bold mb-3">{{ t('mission.preLaunchTimeline') }}</h4>
                    <p v-if="details.timelines.preLaunch.disclaimer" class="text-[10px] text-neutral-500 dark:text-neutral-400 mb-2 italic">
                      {{ details.timelines.preLaunch.disclaimer }}
                    </p>
                    <ol class="flex flex-col gap-2 text-xs">
                      <li v-for="(entry, index) in details.timelines.preLaunch.entries" :key="index" class="flex gap-3 justify-between">
                        <span class="font-mono text-neutral-500">{{ entry.time }}</span>
                        <strong class="text-neutral-800 dark:text-neutral-300 font-normal text-right">{{ entry.description }}</strong>
                      </li>
                    </ol>
                  </div>

                  <!-- Post-Launch Timeline -->
                  <div v-if="details.timelines?.postLaunch?.entries?.length" class="bg-neutral-50/80 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800/60 p-5 rounded-2xl">
                    <h4 class="text-xs uppercase tracking-widest text-primary-600 dark:text-primary-400 font-bold mb-3">{{ t('mission.postLaunchTimeline') }}</h4>
                    <p v-if="details.timelines.postLaunch.disclaimer" class="text-[10px] text-neutral-500 dark:text-neutral-400 mb-2 italic">
                      {{ details.timelines.postLaunch.disclaimer }}
                    </p>
                    <ol class="flex flex-col gap-2 text-xs">
                      <li v-for="(entry, index) in details.timelines.postLaunch.entries" :key="index" class="flex gap-3 justify-between">
                        <span class="font-mono text-neutral-500">{{ entry.time }}</span>
                        <strong class="text-neutral-800 dark:text-neutral-300 font-normal text-right">{{ entry.description }}</strong>
                      </li>
                    </ol>
                  </div>
                </div>

                <!-- Infographic Preview Box -->
                <div v-if="details.media?.infographicDesktop?.url" class="mt-6">
                  <div class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold mb-2">
                    {{ locale === 'zh-CN' ? '任务发射图解' : 'Mission Infographic' }}
                  </div>
                  
                  <div 
                    class="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950/40 cursor-pointer group shadow-lg transition-all duration-300 hover:border-neutral-400 dark:hover:border-neutral-700 max-h-[300px] flex justify-center items-center"
                    @click="isInfographicOpen = true"
                  >
                    <!-- Preview Image -->
                    <img
                      :src="details.media.infographicDesktop.originalUrl || details.media.infographicDesktop.url"
                      :alt="selectedMission?.title"
                      class="max-w-full max-h-[300px] object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out select-none opacity-85 group-hover:opacity-100"
                    />
                    
                    <!-- Premium Glass Hover Scrim -->
                    <div class="absolute inset-0 bg-neutral-950/30 group-hover:bg-neutral-950/50 backdrop-blur-[1px] group-hover:backdrop-blur-[2px] transition-all duration-300 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100">
                      <div class="bg-neutral-900/90 border border-neutral-700 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider shadow-2xl backdrop-blur-md transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <span class="iconify i-heroicons-magnifying-glass-plus size-4 text-primary-400 animate-pulse"></span>
                        <span>{{ locale === 'zh-CN' ? '点击查看超清互动图解' : 'Click to View Full Infographic' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Media / Webcast links -->
            <div v-if="details?.webcasts?.length || details?.media?.infographicDesktop?.url" class="flex flex-wrap gap-3 mt-8 border-t border-neutral-200/60 dark:border-neutral-800/20 pt-6">
              <UButton
                v-for="webcast in details.webcasts"
                :key="webcast.id"
                :to="webcast.url"
                target="_blank"
                color="primary"
                variant="subtle"
                size="sm"
                class="rounded-xl font-bold uppercase text-xs px-4"
                icon="i-heroicons-play-circle"
              >
                {{ webcast.title || t('mission.watchLive') }}
              </UButton>
              <UButton
                v-if="details.media?.infographicDesktop?.url"
                @click="isInfographicOpen = true"
                color="neutral"
                variant="subtle"
                size="sm"
                class="rounded-xl font-bold uppercase text-xs px-4"
                icon="i-heroicons-photo"
              >
                {{ t('mission.infographicLink') }}
              </UButton>
            </div>
          </div>
        </div>
      </section>

      <!-- Localized FAQ Accordion using UAccordion -->
      <section class="mt-8">
        <UCard class="bg-white/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800/80 ring-0 rounded-3xl backdrop-blur-md p-2">
          <template #header>
            <div class="pb-1">
              <p class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold mb-0.5">FAQ & Guides</p>
              <h3 class="text-base font-bold text-neutral-900 dark:text-white uppercase">{{ locale === 'zh-CN' ? '常见问题与日历指南' : 'Frequently Asked Questions' }}</h3>
            </div>
          </template>
          
          <UAccordion
            :items="faqItems"
            multiple
            variant="ghost"
            color="neutral"
            class="mt-2"
          >
            <template #body="{ item }">
              <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-light p-4 pt-0" v-html="item.content"></p>
            </template>
          </UAccordion>
        </UCard>
      </section>

      <!-- Infographic Lightbox Modal -->
      <UModal
        v-if="details?.media?.infographicDesktop?.url"
        v-model:open="isInfographicOpen"
        :ui="{ content: 'max-w-5xl sm:max-w-6xl lg:max-w-7xl xl:max-w-[95vw] w-full' }"
      >
        <template #content>
          <div class="relative bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden p-2 flex flex-col items-center w-full max-h-[90vh] shadow-2xl backdrop-blur-md">
            <!-- Header -->
            <div class="w-full flex justify-between items-center px-4 py-3 border-b border-neutral-800/80 shrink-0">
              <strong class="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                {{ selectedMission?.title }} Infographic
              </strong>
              
              <div class="flex items-center gap-2">
                <!-- Click-to-Zoom Hint Badge -->
                <span class="text-[9px] uppercase tracking-wider bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-mono hidden sm:inline-block">
                  {{ isZoomed ? (locale === 'zh-CN' ? '点击缩小' : 'Click to Shrink') : (locale === 'zh-CN' ? '点击原图大小' : 'Click to Zoom') }}
                </span>
                
                <!-- View original high-res image button -->
                <UButton
                  :to="details.media.infographicDesktop.originalUrl || details.media.infographicDesktop.url"
                  target="_blank"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  class="rounded-lg text-[10px] font-mono"
                  icon="i-heroicons-arrow-top-right-on-square"
                >
                  {{ locale === 'zh-CN' ? '在新标签页打开原图' : 'View Original' }}
                </UButton>
                
                <UButton
                  icon="i-heroicons-x-mark"
                  color="neutral"
                  variant="ghost"
                  class="rounded-lg text-neutral-400 hover:text-white"
                  @click="isInfographicOpen = false"
                  aria-label="Close"
                />
              </div>
            </div>
            
            <!-- Interactive Image Container with click-to-zoom -->
            <div 
              class="w-full flex-1 min-h-0 p-2 bg-neutral-950 rounded-2xl transition-all duration-300"
              :class="isZoomed ? 'overflow-auto flex justify-start items-start' : 'overflow-y-auto flex justify-center items-center'"
            >
              <img
                :src="details.media.infographicDesktop.originalUrl || details.media.infographicDesktop.url"
                :alt="selectedMission?.title"
                class="rounded-xl select-none transition-all duration-300"
                :class="isZoomed ? 'max-w-[200%] w-[180%] h-auto cursor-zoom-out' : 'max-w-full h-auto object-contain cursor-zoom-in'"
                draggable="false"
                @click="isZoomed = !isZoomed"
              />
            </div>
          </div>
        </template>
      </UModal>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useHead, useFetch } from '#app'

const { t, locale, locales, setLocale } = useI18n()

const activeLocaleModel = computed({
  get: () => locale.value,
  set: (val) => setLocale(val)
})

// Color Mode & Theme Switcher
const colorMode = useColorMode()
const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Locale Items mapping for USelect options
const localeItems = computed(() => locales.value.map(lang => ({
  value: typeof lang === 'string' ? lang : lang.code,
  label: typeof lang === 'string' ? lang : lang.name
})))

// Fetch landing page launch and history payload on Server Side
const { data: upcomingPayload } = await useFetch<any>('/api/launches')
const { data: historyPayload } = await useFetch<any>('/api/history-launches')

// Dynamic JSON-LD injection for Google SEO
const nextLaunch = computed(() => upcomingPayload.value?.nextLaunch)

useHead({
  title: computed(() => {
    if (nextLaunch.value) {
      const formattedDate = nextLaunch.value.launchAt
        ? new Date(nextLaunch.value.launchAt).toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
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

  return new Intl.DateTimeFormat(locale.value, options)
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
    return new Intl.DateTimeFormat(locale.value, {
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
  
  return new Intl.DateTimeFormat(locale.value, {
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
const isInfographicOpen = ref(false)
const isZoomed = ref(false)

watch(isInfographicOpen, (val) => {
  if (!val) {
    isZoomed.value = false
  }
})

const selectMission = async (mission: any, scrollPage = true) => {
  selectedMission.value = mission
  focusedDateIso.value = mission.launchAt?.slice(0, 10) || null
  isInfographicOpen.value = false // Reset modal on new selection
  isZoomed.value = false // Reset zoom state

  // Scroll into selected mission detail view immediately for instant visual feedback
  if (import.meta.client && scrollPage) {
    setTimeout(() => {
      const panel = document.querySelector('.selected-mission-panel')
      panel?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }
  
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
}

const focusDate = (isoDate: string) => {
  selectedDateIso.value = isoDate
  
  // Find first event on this day and trigger select
  const firstOnDay = monthMissions.value.find((m: any) => m.launchAt.slice(0, 10) === isoDate)
  if (firstOnDay) {
    // Select it but DO NOT scroll the page down to details yet
    selectMission(firstOnDay, false)
    
    // Smoothly scroll the right-side event list container to show this card
    if (import.meta.client) {
      setTimeout(() => {
        const missionEl = document.getElementById(`mission-card-${firstOnDay.key}`)
        missionEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
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
  return new Intl.DateTimeFormat(locale.value, { month: "short", timeZone: "UTC" }).format(dateObj)
}

const formatEventDay = (iso: string) => {
  return new Date(iso).getUTCDate()
}

const formatEventTime = (iso: string) => {
  return new Intl.DateTimeFormat(locale.value, {
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

// FAQ dynamic localized keys for SEO Accordion
const getFaqQuestion = (num: number) => {
  if (num === 1) return locale.value === 'zh-CN' ? '如何将 SpaceX 发发射日程订阅导入到 Google 日历 / 苹果日历？' : 'How do I add the SpaceX launch schedule to Google Calendar or Apple Calendar?'
  if (num === 2) return locale.value === 'zh-CN' ? '这个日历的更新频率是怎样的？' : 'How often is this launch calendar updated?'
  if (num === 3) return locale.value === 'zh-CN' ? '它追踪了哪些运载火箭 and 发射基地？' : 'What launch vehicles and launch sites are tracked?'
  if (num === 4) return locale.value === 'zh-CN' ? '我可以在日历中直接观看发射直播吗？' : 'Can I watch launch live streams directly from the calendar?'
  return ''
}

const getFaqAnswer = (num: number) => {
  if (num === 1) return locale.value === 'zh-CN' 
    ? '非常简单！你只需点击上方页面顶部的“<b>订阅在线日历</b>”按钮。在 iPhone 或 Mac 上它会直接触发日历添加请求；在谷歌日历（Google Calendar）中，复制 <code>' + webcalSubscriptionLink.value + '</code> 链接，在电脑网页端点击左侧“其他日历 &rarr; 通过 URL 添加”，粘贴链接订阅即可同步。'
    : 'Extremely easy! Simply click the "<b>Subscribe to Calendar</b>" button. On iOS or macOS devices, it automatically prompts you to subscribe. On Google Calendar, copy the <code>' + webcalSubscriptionLink.value + '</code> link, navigate to Calendar Web &rarr; Other Calendars &rarr; Add by URL, and paste the address.'
  if (num === 2) return locale.value === 'zh-CN'
    ? '数据是<b>实时维护更新</b>的。我们的服务器边缘节点通过 Cloudflare KV 每 5 分钟与 SpaceX 官网数据同步一次，自动解析调整窗口，并实时刷新你日历应用里的时间安排。'
    : 'The schedules are <b>automatically kept updated</b>. The server-side edge engine queries official SpaceX APIs every 5 minutes and caches the latest queues inside Cloudflare KV, updating countdowns and calendar feeds in real-time.'
  if (num === 3) return locale.value === 'zh-CN'
    ? '该日历全方位覆盖 SpaceX 当前运行的所有运载火箭。包括<b>猎鹰九号 (Falcon 9)</b>、<b>重型猎鹰 (Falcon Heavy)</b> 以及目前正在进行试飞与重大任务的<b>星舰 (Starship)</b>。发射地点则全面追踪卡纳维拉尔角 (Cape Canaveral)、范登堡太空军基地 (Vandenberg SFB) 和博卡奇卡星基地 (Starbase Boca Chica)。'
    : 'The calendar tracks all active SpaceX launch systems, including <b>Falcon 9</b>, <b>Falcon Heavy</b>, and the deep-space <b>Starship</b> vehicle. Pad locations cover all commercial pads at Cape Canaveral Space Force Station (Florida), Vandenberg Space Force Base (California), and Boca Chica Starbase (Texas).'
  if (num === 4) return locale.value === 'zh-CN'
    ? '是的。当发射事件临近且 SpaceX 公布了直播视频流后，你在日历事件中或者该落地页详情面板中，都可以直接获取到官方的直播通道（例如 YouTube 或 X.com 现场直播），一键触达直播现场。'
    : 'Yes. Once SpaceX publishes the official webcast media links, our SWR cache automatically matches details and appends the streaming webcast URLs (such as YouTube or X.com live broads) inside the calendar description and page details panel.'
  return ''
}

// UAccordion item format mapping
const faqItems = computed(() => [
  { label: getFaqQuestion(1), content: getFaqAnswer(1) },
  { label: getFaqQuestion(2), content: getFaqAnswer(2) },
  { label: getFaqQuestion(3), content: getFaqAnswer(3) },
  { label: getFaqQuestion(4), content: getFaqAnswer(4) }
])

const heroStyle = computed(() => {
  if (nextLaunch.value?.image) {
    return {
      backgroundImage: `radial-gradient(circle at top, var(--hero-glow), transparent 34%), url("${nextLaunch.value.image}")`
    }
  }
  return {}
})

onMounted(() => {
  // Start countdown ticker
  updateCountdown()
  timerId = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
})
</script>

<style>
/* Custom global adjustments */
body {
  margin: 0;
  padding: 0;
}
</style>
