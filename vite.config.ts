import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { copyFileSync, mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

function copyWebosMetaPlugin() {
  return {
    name: 'copy-webos-meta',
    closeBundle() {
      const srcDir = 'webos-meta'
      const destDir = 'dist'
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true })
      }
      for (const file of readdirSync(srcDir)) {
        copyFileSync(join(srcDir, file), join(destDir, file))
      }

      const htmlPath = join(destDir, 'index.html')
      let html = readFileSync(htmlPath, 'utf-8')
      html = html.replace(' type="module"', '')
      html = html.replace(' crossorigin', '')
      html = html.replace('<script src=', '<script defer src=')
      writeFileSync(htmlPath, html)
    }
  }
}

export default defineConfig({
  plugins: [preact(), copyWebosMetaPlugin()],
  base: './',
  build: {
    target: 'es2015',
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
