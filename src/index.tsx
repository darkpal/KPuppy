import * as Sentry from '@sentry/browser'
import { render } from 'preact'
import { App } from './app'
import { I18nProvider } from './i18n'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD,
})

render(
  <I18nProvider>
    <App />
  </I18nProvider>,
  document.getElementById('app')!
)
