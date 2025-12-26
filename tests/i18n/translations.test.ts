import { describe, it, expect } from 'vitest'
import { translations, getTranslations, LANGUAGES, Language, Translations } from '../../src/i18n/translations'

describe('translations', () => {
  const allLanguages: Language[] = ['en', 'ru', 'de']
  const englishKeys = Object.keys(translations.en) as (keyof Translations)[]

  describe('all languages have all keys', () => {
    allLanguages.forEach(lang => {
      it(`${lang} has all translation keys`, () => {
        const langKeys = Object.keys(translations[lang]) as (keyof Translations)[]

        englishKeys.forEach(key => {
          expect(langKeys).toContain(key)
          expect(translations[lang][key]).toBeDefined()
          expect(typeof translations[lang][key]).toBe('string')
        })
      })
    })
  })

  describe('no extra keys in non-English translations', () => {
    allLanguages.filter(l => l !== 'en').forEach(lang => {
      it(`${lang} has no extra keys`, () => {
        const langKeys = Object.keys(translations[lang]) as (keyof Translations)[]

        langKeys.forEach(key => {
          expect(englishKeys).toContain(key)
        })
      })
    })
  })

  describe('no empty translations', () => {
    allLanguages.forEach(lang => {
      it(`${lang} has no empty strings`, () => {
        const langTranslations = translations[lang]

        Object.entries(langTranslations).forEach(([key, value]) => {
          expect(value.length, `${lang}.${key} should not be empty`).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('LANGUAGES constant', () => {
    it('includes all supported languages', () => {
      expect(LANGUAGES).toHaveLength(3)
      expect(LANGUAGES.map(l => l.id)).toEqual(['en', 'ru', 'de'])
    })

    it('has labels for all languages', () => {
      LANGUAGES.forEach(lang => {
        expect(lang.label).toBeDefined()
        expect(lang.label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getTranslations', () => {
    it('returns English translations for en', () => {
      const t = getTranslations('en')
      expect(t).toBe(translations.en)
    })

    it('returns Russian translations for ru', () => {
      const t = getTranslations('ru')
      expect(t).toBe(translations.ru)
    })

    it('returns German translations for de', () => {
      const t = getTranslations('de')
      expect(t).toBe(translations.de)
    })

    it('returns English translations for unknown language', () => {
      const t = getTranslations('unknown' as Language)
      expect(t).toBe(translations.en)
    })
  })

  describe('specific translations exist', () => {
    it('has app name in all languages', () => {
      allLanguages.forEach(lang => {
        expect(translations[lang].appName).toBe('KPuppy')
      })
    })

    it('has menu items in all languages', () => {
      allLanguages.forEach(lang => {
        expect(translations[lang].menuHome).toBeDefined()
        expect(translations[lang].menuSearch).toBeDefined()
        expect(translations[lang].menuSettings).toBeDefined()
        expect(translations[lang].menuProfile).toBeDefined()
      })
    })

    it('has player options in all languages', () => {
      allLanguages.forEach(lang => {
        expect(translations[lang].player).toBeDefined()
        expect(translations[lang].playerNative).toBeDefined()
        expect(translations[lang].playerBuiltin).toBeDefined()
      })
    })

    it('has quality options in all languages', () => {
      allLanguages.forEach(lang => {
        expect(translations[lang].quality).toBeDefined()
        expect(translations[lang].qualityAuto).toBeDefined()
        expect(translations[lang].quality4k).toBeDefined()
        expect(translations[lang].quality1080p).toBeDefined()
        expect(translations[lang].quality720p).toBeDefined()
        expect(translations[lang].quality480p).toBeDefined()
      })
    })
  })

  describe('translation key count', () => {
    it('has the expected number of translation keys', () => {
      const keyCount = englishKeys.length
      expect(keyCount).toBeGreaterThan(70)

      allLanguages.forEach(lang => {
        expect(Object.keys(translations[lang]).length).toBe(keyCount)
      })
    })
  })
})
