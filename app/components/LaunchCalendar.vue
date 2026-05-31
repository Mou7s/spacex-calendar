<template>
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
                @click="$emit('update:activeMonthIndex', Math.max(0, activeMonthIndex - 1))"
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
                @click="$emit('update:activeMonthIndex', Math.min(monthKeys.length - 1, activeMonthIndex + 1))"
                aria-label="Next month"
              />
            </div>
          </div>

          <!-- Mini Grid -->
          <div class="grid grid-cols-7 gap-1 text-center text-xs">
            <div v-for="dayLabel in weekdays" :key="dayLabel" class="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase py-1">
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
              @click="day.hasEvents ? $emit('focus-date', day.isoDate) : null"
            >
              <span class="text-xs">{{ day.dayNumber }}</span>
              <!-- Launch Dot -->
              <span v-if="day.hasEvents" class="absolute bottom-1 w-1 h-1 rounded-full bg-primary-500 dark:bg-primary-400"></span>
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
              @click="$emit('select-mission', mission)"
            >
              <div class="flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950/80 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-center min-w-[50px] leading-none shrink-0">
                <span class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">{{ formatEventMonth(mission.launchAt) }}</span>
                <strong class="text-lg font-bold text-neutral-900 dark:text-white mt-1">{{ formatEventDay(mission.launchAt) }}</strong>
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="font-bold text-sm truncate text-neutral-900 dark:text-white uppercase">{{ mission.title }}</div>
                <div class="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
                  <span v-if="mission.calendarGroup === 'history'" class="text-primary-600 dark:text-primary-400 font-bold uppercase">
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
                  <span>{{ te(`mission.types.${mission.missionType?.toLowerCase()}`) ? t(`mission.types.${mission.missionType?.toLowerCase()}`) : titleCase(mission.missionType) }}</span>
                </div>
              </div>
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { t, tm, rt, te } = useI18n()

const weekdays = computed(() => {
  const days = tm('calendar.weekdayShort')
  return Array.isArray(days) ? days.map(day => rt(day)) : []
})

defineProps<{
  gridDays: { isoDate: string; dayNumber: number; isCurrentMonth: boolean; hasEvents: boolean }[]
  monthMissions: any[]
  monthKeys: string[]
  activeMonthIndex: number
  activeMonthLabel: string
  todayIso: string
  selectedDateIso: string | null
  focusedDateIso: string | null
  selectedMissionKey: string | null
  formatEventMonth: (iso: string) => string
  formatEventDay: (iso: string) => number
  formatEventTime: (iso: string) => string
  titleCase: (value: string) => string
}>()

defineEmits<{
  'update:activeMonthIndex': [index: number]
  'focus-date': [isoDate: string]
  'select-mission': [mission: any]
}>()
</script>
