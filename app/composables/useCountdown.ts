import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

interface CountdownValues {
  days: string
  hours: string
  minutes: string
  seconds: string
}

/**
 * Reactive countdown timer that ticks every second toward a target ISO date.
 *
 * @param targetIso – A reactive ref to the target ISO datetime string (e.g. nextLaunch.launchAt)
 */
export function useCountdown(targetIso: Ref<string | null | undefined>) {
  const countdown = ref<CountdownValues>({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  })

  let timerId: ReturnType<typeof setInterval> | null = null

  const update = () => {
    const target = targetIso.value
    if (!target) {
      countdown.value = { days: '00', hours: '00', minutes: '00', seconds: '00' }
      return
    }

    const diffMs = Date.parse(target) - Date.now()

    if (diffMs <= 0) {
      countdown.value = { days: '00', hours: '00', minutes: '00', seconds: '00' }
      return
    }

    const secs = Math.floor(diffMs / 1000)
    const days = Math.floor(secs / 86400)
    const hours = Math.floor((secs % 86400) / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    const remainingSecs = secs % 60

    countdown.value = {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(mins).padStart(2, '0'),
      seconds: String(remainingSecs).padStart(2, '0'),
    }
  }

  onMounted(() => {
    update()
    timerId = setInterval(update, 1000)
  })

  onUnmounted(() => {
    if (timerId) clearInterval(timerId)
  })

  return { countdown }
}
