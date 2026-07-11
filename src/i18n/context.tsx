import { createContext } from 'preact'
import { useContext, useState, useCallback } from 'preact/hooks'
import { Language, Translations, getTranslations, LANGUAGES } from './translations'

interface I18nContextValue {
  language: Language
  t: Translations
  setLanguage: (lang: Language) => void
  languages: typeof LANGUAGES
}

const STORAGE_KEY = 'kpuppy_language'

const DEFAULT_LANGUAGE: Language = 'ru'

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && ['en', 'ru', 'de'].includes(stored)) {
      return stored as Language
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Failed to read stored language:', err)
  }
  return DEFAULT_LANGUAGE
}

function storeLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Failed to store language:', err)
  }
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: preact.ComponentChildren }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage)

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    storeLanguage(lang)
  }, [])

  const value: I18nContextValue = {
    language,
    t: getTranslations(language),
    setLanguage,
    languages: LANGUAGES,
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
