import { describe, it, expect } from 'vitest'
import { mapLocaleToLanguage, detectSystemLanguage } from '../../src/i18n/systemLanguage'

describe('systemLanguage', () => {
  it('maps locale tags to app languages', () => {
    expect(mapLocaleToLanguage('ru-RU')).toBe('ru')
    expect(mapLocaleToLanguage('de_DE')).toBe('de')
    expect(mapLocaleToLanguage('en')).toBe('en')
    expect(mapLocaleToLanguage('fr-FR')).toBeNull()
    expect(mapLocaleToLanguage(undefined)).toBeNull()
  })

  it('detects language from navigator', () => {
    const original = navigator.language
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'ru-RU' })
    Object.defineProperty(navigator, 'languages', { configurable: true, get: () => ['ru-RU'] })
    expect(detectSystemLanguage()).toBe('ru')
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => original })
  })
})
