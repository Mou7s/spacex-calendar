import { ref, computed } from 'vue'

/** Timezone option for the selector buttons */
export interface TimezoneOption {
  key: string
  tz: string | null
}

/** Static timezone presets */
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { key: 'local', tz: null },
  { key: 'utc',   tz: 'UTC' },
  { key: 'et',    tz: 'America/New_York' },
  { key: 'ct',    tz: 'America/Chicago' },
  { key: 'pt',    tz: 'America/Los_Angeles' },
]

export function useTimezone() {
  const { t, locale } = useI18n()

  const activeTimezone = ref<string | null>(null)

  const activeTimezoneDisplay = computed(() => {
    if (activeTimezone.value) {
      return activeTimezone.value.split('/').pop()?.replace(/_/g, ' ') || activeTimezone.value
    }
    if (import.meta.client) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    return 'UTC'
  })

  const setTimezone = (tz: string | null) => {
    activeTimezone.value = tz
  }

  // DateTime formatting helpers
  const getDateTimeFormatter = (withZone = true, timeZoneOverride?: string | null) => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }

    if (withZone) {
      options.timeZoneName = 'short'
    }

    const tz = timeZoneOverride !== undefined ? timeZoneOverride : activeTimezone.value
    if (tz) {
      options.timeZone = tz
    }

    return new Intl.DateTimeFormat(locale.value, options)
  }

  const formatDateTime = (iso: string, withZone = true) => {
    if (!iso) return t('mission.tbd')
    return getDateTimeFormatter(withZone).format(new Date(iso))
  }

  const formatDateTimeUtc = (iso: string) => {
    if (!iso) return t('mission.tbd')
    return getDateTimeFormatter(true, 'UTC').format(new Date(iso))
  }

  const formatEventMonth = (iso: string) => {
    const dateObj = new Date(iso)
    return new Intl.DateTimeFormat(locale.value, { month: 'short', timeZone: 'UTC' }).format(dateObj)
  }

  const formatEventDay = (iso: string) => {
    return new Date(iso).getUTCDate()
  }

  const formatEventTime = (iso: string) => {
    return new Intl.DateTimeFormat(locale.value, {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(iso))
  }

  const titleCase = (value: string) => {
    return value
      ? value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
      : t('mission.unspecified')
  }

  const formatMonthPillLabel = (item: any) => {
    if (item.isoMonth) {
      return new Intl.DateTimeFormat(locale.value, {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${item.isoMonth}-01T00:00:00.000Z`))
    }
    return item.label
  }

  return {
    activeTimezone,
    activeTimezoneDisplay,
    setTimezone,
    formatDateTime,
    formatDateTimeUtc,
    formatEventMonth,
    formatEventDay,
    formatEventTime,
    titleCase,
    formatMonthPillLabel,
  }
}
