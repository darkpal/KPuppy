import { Language } from './translations'
import { lunaRequest, isWebOS } from '../webos/service'

/** Map BCP-47 / webOS locale tags (ru-RU, de_DE, en) to app languages. */
export function mapLocaleToLanguage(locale: string | null | undefined): Language | null {
  if (!locale) return null
  const primary = locale.trim().toLowerCase().replace('_', '-').split('-')[0]
  if (primary === 'ru') return 'ru'
  if (primary === 'de') return 'de'
  if (primary === 'en') return 'en'
  return null
}

function languageFromPalmSystem(): Language | null {
  try {
    const raw = (window as unknown as { PalmSystem?: { deviceInfo?: string } }).PalmSystem?.deviceInfo
    if (!raw) return null
    const info = JSON.parse(raw) as { locale?: string; language?: string }
    return mapLocaleToLanguage(info.locale || info.language)
  } catch {
    return null
  }
}

function languageFromNavigator(): Language | null {
  if (typeof navigator === 'undefined') return null
  const candidates = [navigator.language, ...(navigator.languages || [])]
  for (const candidate of candidates) {
    const mapped = mapLocaleToLanguage(candidate)
    if (mapped) return mapped
  }
  return null
}

/** Sync best-effort: PalmSystem → navigator → English. */
export function detectSystemLanguage(): Language {
  return languageFromPalmSystem() || languageFromNavigator() || 'en'
}

interface LocaleSettingsResponse {
  returnValue: boolean
  settings?: {
    localeInfo?: {
      locales?: {
        UI?: string
        TV?: string
      }
    }
  }
  [key: string]: unknown
}

/** Async webOS TV UI language from Settings Service. */
export async function fetchWebOSUiLanguage(): Promise<Language | null> {
  if (!isWebOS()) return null
  try {
    const response = await lunaRequest<LocaleSettingsResponse>(
      'luna://com.webos.settingsservice',
      'getSystemSettings',
      { keys: ['localeInfo'] }
    )
    const locales = response.settings?.localeInfo?.locales
    return mapLocaleToLanguage(locales?.UI || locales?.TV)
  } catch {
    return null
  }
}
