<template>
  <section class="mb-8">
    <UCard
      class="bg-white/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800/80 ring-0 rounded-3xl backdrop-blur-md">
      <div class="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
        <div>
          <p class="text-[10px] uppercase tracking-widest text-primary-600 dark:text-primary-400 font-bold mb-1">{{
            t('subscribe.eyebrow') }}</p>
          <h2 class="text-2xl font-bold text-neutral-900 dark:text-white uppercase tracking-tight mb-2">{{
            t('subscribe.title') }}</h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 max-w-3xl leading-relaxed">{{ t('subscribe.copy') }}
          </p>
        </div>
        <div class="flex flex-col gap-3 w-full lg:max-w-md shrink-0">
          <UButton id="subscribe-btn" :to="webcalLink" color="primary" size="md" block
            class="rounded-2xl font-bold uppercase tracking-wider text-xs py-3 transition-all duration-300 hover:scale-[1.02] hover:brightness-110 hover:shadow-lg hover:shadow-primary-500/20 active:scale-[0.98] cursor-pointer"
            icon="i-heroicons-calendar-days">
            {{ t('subscribe.subscribeLink') }}
          </UButton>
          <div class="flex flex-col gap-2">
            <code
              class="text-[11px] bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-3 text-neutral-800 dark:text-neutral-300 overflow-x-auto block font-mono">
              {{ icsLink }}
            </code>
          </div>
        </div>
      </div>
    </UCard>
  </section>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  webcalLink: string
  icsLink: string
}>()
</script>
