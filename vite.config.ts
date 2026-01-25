import { defineConfig, loadEnv } from 'vite'
import preact from '@preact/preset-vite'
import { copyFileSync, mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import pkg from './package.json'

function copyWebosMetaPlugin() {
  let sentryKey = ''
  let sentryHost = ''
  let sentryProject = ''

  return {
    name: 'copy-webos-meta',
    configResolved(config: { mode: string }) {
      const env = loadEnv(config.mode, process.cwd(), '')
      const dsn = env.VITE_SENTRY_DSN || ''
      const dsnMatch = dsn.match(/^https?:\/\/([^@]+)@([^/]+)\/(.+)$/)
      sentryKey = dsnMatch?.[1] || ''
      sentryHost = dsnMatch?.[2] || ''
      sentryProject = dsnMatch?.[3] || ''
    },
    closeBundle() {
      const srcDir = 'webos-meta'
      const destDir = 'dist'
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true })
      }
      for (const file of readdirSync(srcDir)) {
        const srcPath = join(srcDir, file)
        const destPath = join(destDir, file)
        if (file === 'appinfo.json') {
          const appinfo = JSON.parse(readFileSync(srcPath, 'utf-8'))
          appinfo.version = pkg.version
          writeFileSync(destPath, JSON.stringify(appinfo, null, 2))
        } else {
          copyFileSync(srcPath, destPath)
        }
      }

      const htmlPath = join(destDir, 'index.html')
      let html = readFileSync(htmlPath, 'utf-8')
      html = html.replace(' type="module"', '')
      html = html.replace(' crossorigin', '')
      html = html.replace('<script src=', '<script defer src=')
      html = html.replace('__SENTRY_KEY__', sentryKey)
      html = html.replace('__SENTRY_HOST__', sentryHost)
      html = html.replace('__SENTRY_PROJECT__', sentryProject)
      writeFileSync(htmlPath, html)
    }
  }
}

export default defineConfig({
  plugins: [preact(), copyWebosMetaPlugin()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    target: 'chrome53',
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        format: 'iife'
      }
    }
  }
})
