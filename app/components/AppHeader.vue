<template>
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
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue'

const { t, locale, locales, setLocale } = useI18n()
const colorMode = useColorMode()

const activeLocaleModel = computed({
  get: () => locale.value,
  set: (val) => setLocale(val)
})

const localeItems = computed(() => locales.value.map(lang => ({
  value: typeof lang === 'string' ? lang : lang.code,
  label: typeof lang === 'string' ? lang : lang.name
})))

const toggleTheme = (event: MouseEvent) => {
  const isAppearanceTransition = (document as any).startViewTransition
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!isAppearanceTransition) {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    return
  }

  const x = event.clientX ?? window.innerWidth / 2
  const y = event.clientY ?? window.innerHeight / 2
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )

  document.documentElement.classList.add('view-transitioning')

  const transition = (document as any).startViewTransition(async () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    await nextTick()
  })

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ]
    document.documentElement.animate(
      {
        clipPath: clipPath,
      },
      {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })

  transition.finished.then(() => {
    document.documentElement.classList.remove('view-transitioning')
  })
}
</script>
