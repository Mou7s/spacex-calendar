<template>
  <section
    class="hero relative min-h-[50vh] flex items-end overflow-hidden p-8 sm:p-12 border border-neutral-800 rounded-3xl shadow-2xl mb-8 transition-all duration-500"
    id="hero" :style="heroStyle">
    <!-- Dark gradient scrim -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent pointer-events-none z-0">
    </div>

    <div class="hero-copy relative z-10 w-full max-w-4xl">
      <p class="text-[10px] uppercase tracking-[0.25em] text-neutral-300 font-bold mb-2">{{ t('hero.eyebrow') }}</p>
      <h1
        class="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight uppercase leading-none mb-4 font-mono">
        {{ nextLaunchTitle }}
      </h1>
      <p class="text-sm sm:text-base text-neutral-300 mb-8 max-w-2xl leading-relaxed">
        {{ nextLaunchDescription }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Next Launch Target Time -->
        <UCard class="bg-neutral-950/60 border-neutral-800/40 backdrop-blur-md ring-0 rounded-2xl">
          <span class="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">{{ t('hero.meta.nextLaunch')
          }}</span>
          <strong class="block text-lg sm:text-xl font-bold text-white mt-2 font-mono">{{ nextLaunchTimeFormatted
          }}</strong>
        </UCard>

        <!-- Countdown Timer -->
        <UCard class="bg-neutral-950/60 border-neutral-800/40 backdrop-blur-md ring-0 rounded-2xl">
          <span class="text-[10px] uppercase tracking-wider text-neutral-400 font-bold mb-2 block">{{
            t('hero.meta.countdown') }}</span>

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

      <div class="mt-6" v-if="nextLaunch?.slug">
        <UButton color="neutral" variant="solid" size="sm"
          class="rounded-full font-bold uppercase tracking-wider text-[10px] px-6 py-2.5 shadow-lg"
          @click="$emit('select-mission', nextLaunch)" icon="i-heroicons-information-circle">
          {{ t('history.detailsLink') }}
        </UButton>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'

const { t } = useI18n()

defineProps<{
  nextLaunch: any
  countdown: { days: string; hours: string; minutes: string; seconds: string }
  heroStyle: CSSProperties
  nextLaunchTitle: string
  nextLaunchDescription: string
  nextLaunchTimeFormatted: string
}>()

defineEmits<{
  'select-mission': [mission: any]
}>()
</script>
