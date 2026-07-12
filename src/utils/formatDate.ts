/** Locale for date formatting from app language code. */
function dateLocale(language: string): string {
  if (language === 'ru') return 'ru-RU'
  if (language === 'de') return 'de-DE'
  return 'en-US'
}

/** Numeric fallback when Intl timezone data is missing (common on LG webOS). */
function formatDateNumeric(date: Date, language: string): string {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  if (language === 'en') return `${month}/${day}/${year}`
  return `${day}.${month}.${year}`
}

/**
 * Format a unix-seconds timestamp for display.
 * webOS Chromium often throws `RangeError: Unsupported time zone specified undefined`
 * for toLocaleDateString with month/day options unless timeZone is set — and may still
 * fail if ICU tz data is absent, so we always have a numeric fallback.
 */
export function formatUnixDate(timestamp: number, language: string): string {
  if (!timestamp) return 'Unknown'
  const date = new Date(timestamp * 1000)
  try {
    return date.toLocaleDateString(dateLocale(language), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    })
  } catch {
    return formatDateNumeric(date, language)
  }
}
