import * as Sentry from '@sentry/browser'
import { render } from 'preact'
import { App } from './app'
import { I18nProvider } from './i18n'

declare global {
  interface Window {
    __earlyErrors?: Array<{ msg: string; url: string; line: number; col: number; err?: Error }>
  }
}

const DSN = import.meta.env.VITE_SENTRY_DSN || ''
const dsnMatch = DSN.match(/^https?:\/\/([^@]+)@([^/]+)\/(.+)$/)
const sentryKey = dsnMatch?.[1] || ''
const sentryHost = dsnMatch?.[2] || ''
const sentryProject = dsnMatch?.[3] || ''

function customTransport() {
  return {
    send(envelope: unknown) {
      return new Promise<{ statusCode: number }>((resolve) => {
        const [, items] = envelope as [unknown, Array<[unknown, unknown]>]

        for (const item of items) {
          const [, payload] = item
          if (typeof payload === 'object') {
            const xhr = new XMLHttpRequest()
            const url = `https://${sentryHost}/api/${sentryProject}/store/?sentry_key=${sentryKey}`
            xhr.open('POST', url)
            xhr.setRequestHeader('Content-Type', 'application/json')
            xhr.onload = () => resolve({ statusCode: xhr.status })
            xhr.onerror = () => resolve({ statusCode: 0 })
            xhr.send(JSON.stringify(payload))
          }
        }
      })
    },
    flush() { return Promise.resolve(true) }
  }
}

Sentry.init({
  dsn: DSN,
  enabled: import.meta.env.PROD,
  transport: customTransport,
})

if (window.__earlyErrors?.length) {
  window.__earlyErrors.forEach(({ msg, err }) => {
    Sentry.captureException(err || new Error(String(msg)))
  })
  window.__earlyErrors = []
  Sentry.flush(2000)
}

render(
  <I18nProvider>
    <App />
  </I18nProvider>,
  document.getElementById('app')!
)
