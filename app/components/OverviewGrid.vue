<template>
  <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    <!-- Near Cadence Count Summary -->
    <UCard class="bg-white/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800/80 ring-0 rounded-3xl backdrop-blur-md">
      <template #header>
        <div class="pb-1">
          <p class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold mb-0.5">{{ t('overview.cadenceEyebrow') }}</p>
          <h3 class="text-base font-bold text-neutral-900 dark:text-white uppercase">{{ t('overview.cadenceTitle') }}</h3>
        </div>
      </template>
      
      <div class="flex flex-wrap gap-4">
        <p v-if="!monthSummary.length" class="text-neutral-500 dark:text-neutral-400 text-sm">{{ t('overview.noLaunchWindows') }}</p>
        <div 
          v-for="item in monthSummary" 
          :key="item.isoMonth || item.label" 
          class="flex-1 min-w-[120px] max-w-[200px] bg-neutral-50/50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800/80 px-6 py-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-[1.02] hover:border-primary-500/50 shadow-sm"
        >
          <span class="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider mb-2">{{ formatMonthPillLabel(item) }}</span>
          <strong class="text-3xl font-extrabold text-neutral-900 dark:text-white font-mono leading-none">{{ item.count }}</strong>
          <span class="text-[9px] text-primary-600 dark:text-primary-400 uppercase font-bold mt-2.5 tracking-widest">{{ locale === 'zh-CN' ? '次发射' : 'Launches' }}</span>
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
          <strong class="text-neutral-900 dark:text-white font-mono text-sm">{{ missionsCount }}</strong>
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
          v-for="opt in timezoneOptions" 
          :key="opt.key"
          size="xs"
          class="rounded-lg font-bold uppercase text-[9px] tracking-wide"
          :color="activeTimezone === opt.tz ? 'primary' : 'neutral'"
          :variant="activeTimezone === opt.tz ? 'solid' : 'subtle'"
          @click="$emit('set-timezone', opt.tz)"
        >
          {{ t(`timezone.${opt.key}`) }}
        </UButton>
      </div>
    </UCard>
  </section>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

defineProps<{
  monthSummary: any[]
  timedWindowsCount: number
  liveCount: number
  missionsCount: number
  activeTimezone: string | null
  activeTimezoneDisplay: string
  timezoneOptions: { key: string; tz: string | null }[]
  formatMonthPillLabel: (item: any) => string
}>()

defineEmits<{
  'set-timezone': [tz: string | null]
}>()
</script>
