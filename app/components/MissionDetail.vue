<template>
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
        :style="details?.media?.imageDesktop?.originalUrl || details?.media?.imageDesktop?.url || selectedMission.image ? { backgroundImage: `url(${details?.media?.imageDesktop?.originalUrl || details?.media?.imageDesktop?.url || selectedMission.image})` } : {}"
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
            @click="$emit('close')"
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
            {{ missionWindowCopy }}
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
                @click="$emit('update:isInfographicOpen', true)"
              >
                <!-- Preview Image -->
                <img
                  :src="details.media.infographicDesktop.originalUrl || details.media.infographicDesktop.url"
                  :alt="selectedMission?.title"
                  loading="lazy"
                  class="max-w-full max-h-[300px] object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out select-none opacity-85 group-hover:opacity-100"
                  draggable="false"
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
            @click="$emit('update:isInfographicOpen', true)"
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

    <!-- Infographic Lightbox Modal -->
    <UModal
      v-if="details?.media?.infographicDesktop?.url"
      :open="isInfographicOpen"
      @update:open="$emit('update:isInfographicOpen', $event)"
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
                @click="$emit('update:isInfographicOpen', false)"
                aria-label="Close"
              />
            </div>
          </div>
          
          <!-- Interactive Image Container with click-to-zoom -->
          <div 
            class="w-full flex-1 min-h-0 p-2 bg-neutral-950 rounded-2xl transition-all duration-300"
            :class="isZoomed ? 'overflow-auto block' : 'overflow-hidden flex justify-center items-center'"
          >
            <img
              :src="details.media.infographicDesktop.originalUrl || details.media.infographicDesktop.url"
              :alt="selectedMission?.title"
              class="rounded-xl select-none transition-all duration-300"
              :class="isZoomed ? 'w-[150%] sm:w-[130%] md:w-[115%] lg:w-full max-w-none h-auto cursor-zoom-out mx-auto block' : 'max-w-full max-h-[70vh] object-contain cursor-zoom-in'"
              draggable="false"
              @click="$emit('update:isZoomed', !isZoomed)"
            />
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

defineProps<{
  selectedMission: any
  loadingDetails: boolean
  details: any
  isInfographicOpen: boolean
  isZoomed: boolean
  missionWindowCopy: string
  titleCase: (value: string) => string
}>()

defineEmits<{
  'close': []
  'update:isInfographicOpen': [value: boolean]
  'update:isZoomed': [value: boolean]
}>()
</script>
