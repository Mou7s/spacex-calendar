<template>
  <section class="mt-8">
    <UCard class="bg-white/80 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800/80 ring-0 rounded-3xl backdrop-blur-md p-2">
      <template #header>
        <div class="pb-1">
          <p class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold mb-0.5">FAQ &amp; Guides</p>
          <h3 class="text-base font-bold text-neutral-900 dark:text-white uppercase">{{ locale === 'zh-CN' ? '常见问题与日历指南' : 'Frequently Asked Questions' }}</h3>
        </div>
      </template>
      
      <UAccordion
        :items="items"
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
</template>

<script setup lang="ts">
const { locale } = useI18n()

defineProps<{
  items: { label: string; content: string }[]
}>()
</script>
