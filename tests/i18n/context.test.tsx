import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/preact'
import { h } from 'preact'
import { I18nProvider, useI18n } from '../../src/i18n/context'
import { translations } from '../../src/i18n/translations'

const STORAGE_KEY = 'kpuppy_language'

function TestComponent() {
  const { language, t, setLanguage, languages } = useI18n()
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="app-name">{t.appName}</span>
      <span data-testid="menu-home">{t.menuHome}</span>
      <span data-testid="languages-count">{languages.length}</span>
      <button data-testid="set-ru" onClick={() => setLanguage('ru')}>Set RU</button>
      <button data-testid="set-de" onClick={() => setLanguage('de')}>Set DE</button>
      <button data-testid="set-en" onClick={() => setLanguage('en')}>Set EN</button>
    </div>
  )
}

describe('I18nContext', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('kpuppy_device_defaults_applied')
    vi.stubGlobal('navigator', {
      language: 'en-US',
      languages: ['en-US'],
    })
  })

  describe('I18nProvider', () => {
    it('uses system language when no stored preference', () => {
      vi.stubGlobal('navigator', { language: 'de-DE', languages: ['de-DE'] })

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      expect(screen.getByTestId('language').textContent).toBe('de')
      expect(screen.getByTestId('menu-home').textContent).toBe('Startseite')
    })

    it('loads stored language preference over system', () => {
      localStorage.setItem(STORAGE_KEY, 'ru')

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      expect(screen.getByTestId('language').textContent).toBe('ru')
      expect(screen.getByTestId('menu-home').textContent).toBe('Главная')
    })

    it('provides languages list', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      expect(screen.getByTestId('languages-count').textContent).toBe('3')
    })

    it('falls back to system language for invalid stored language', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid')
      vi.stubGlobal('navigator', { language: 'ru-RU', languages: ['ru-RU'] })

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      expect(screen.getByTestId('language').textContent).toBe('ru')
    })
  })

  describe('setLanguage', () => {
    it('changes language to Russian', async () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      screen.getByTestId('set-ru').click()

      await waitFor(() => {
        expect(screen.getByTestId('language').textContent).toBe('ru')
        expect(screen.getByTestId('menu-home').textContent).toBe('Главная')
      })
    })

    it('changes language to German', async () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      screen.getByTestId('set-de').click()

      await waitFor(() => {
        expect(screen.getByTestId('language').textContent).toBe('de')
        expect(screen.getByTestId('menu-home').textContent).toBe('Startseite')
      })
    })

    it('persists language change to localStorage', async () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      screen.getByTestId('set-ru').click()

      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_KEY)).toBe('ru')
      })
    })

    it('can change back to English', async () => {
      localStorage.setItem(STORAGE_KEY, 'ru')

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      expect(screen.getByTestId('language').textContent).toBe('ru')

      screen.getByTestId('set-en').click()

      await waitFor(() => {
        expect(screen.getByTestId('language').textContent).toBe('en')
        expect(screen.getByTestId('menu-home').textContent).toBe('Home')
      })
    })
  })

  describe('useI18n hook', () => {
    it('throws error when used outside I18nProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useI18n must be used within I18nProvider')

      consoleError.mockRestore()
    })

    it('provides all expected properties', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      expect(screen.getByTestId('language')).toBeDefined()
      expect(screen.getByTestId('app-name')).toBeDefined()
      expect(screen.getByTestId('languages-count')).toBeDefined()
    })
  })

  describe('translations are correct', () => {
    it('provides correct Russian translations', () => {
      localStorage.setItem(STORAGE_KEY, 'ru')

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      expect(screen.getByTestId('app-name').textContent).toBe(translations.ru.appName)
      expect(screen.getByTestId('menu-home').textContent).toBe(translations.ru.menuHome)
    })

    it('provides correct German translations', () => {
      localStorage.setItem(STORAGE_KEY, 'de')

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      )

      expect(screen.getByTestId('app-name').textContent).toBe(translations.de.appName)
      expect(screen.getByTestId('menu-home').textContent).toBe(translations.de.menuHome)
    })
  })
})
