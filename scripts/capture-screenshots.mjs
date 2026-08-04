#!/usr/bin/env node
/**
 * Capture GitHub README screenshots via Playwright (1920×1080).
 *
 * Auth:
 *   - Reuses .kpuppy-tokens.json if still valid, or
 *   - Device-code login (prints user code; authorize at kinopub.online), then saves tokens.
 *
 * Usage:
 *   npm run capture:screenshots
 *   KPUPPY_BASE_URL=http://127.0.0.1:5173 npm run capture:screenshots
 */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, '.github/screenshots')
const TOKENS_PATH = resolve(ROOT, '.kpuppy-tokens.json')
const BASE_URL = process.env.KPUPPY_BASE_URL || 'http://127.0.0.1:5173'
const VIEWPORT = { width: 1920, height: 1080 }
const API = 'https://api.service-kp.com'
const CLIENT_ID = 'xbmc'

function loadClientSecret() {
  try {
    const env = readFileSync(resolve(ROOT, '.env'), 'utf8')
    const m = env.match(/^VITE_CLIENT_SECRET=(.+)$/m)
    if (m) return m[1].trim().replace(/^['"]|['"]$/g, '')
  } catch {
    /* ignore */
  }
  return process.env.VITE_CLIENT_SECRET || 'cgg3gtifu46urtfp2zp1nqtba0k2ezxh'
}

const CLIENT_SECRET = loadClientSecret()

function loadSavedTokens() {
  if (!existsSync(TOKENS_PATH)) return null
  try {
    const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'))
    if (!tokens?.access || !tokens?.refresh || !tokens?.expiresAt) return null
    // Allow 2 minutes of skew; refresh later if near expiry
    if (tokens.expiresAt < Date.now() + 120_000) return tokens
    return tokens
  } catch {
    return null
  }
}

function saveTokens(tokens) {
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2) + '\n')
  console.log(`Saved tokens → ${TOKENS_PATH} (gitignored)`)
}

async function refreshTokens(refreshToken) {
  const body = `grant_type=refresh_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${encodeURIComponent(refreshToken)}`
  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`refresh failed: ${res.status}`)
  const data = await res.json()
  return {
    access: data.access_token,
    refresh: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

async function deviceCodeLogin() {
  const body = `grant_type=device_code&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
  const res = await fetch(`${API}/oauth2/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`device code request failed: ${res.status}`)
  const data = await res.json()
  const code = data.code
  const userCode = data.user_code
  const uri = data.verification_uri || 'https://kino.pub/device'
  const interval = (data.interval || 5) * 1000
  const expiresAt = Date.now() + (data.expires_in || 300) * 1000

  console.log('\n========================================')
  console.log('Authorize KPuppy for screenshots:')
  console.log(`  1. Open: ${uri}`)
  console.log(`  2. Enter code: ${userCode}`)
  console.log('========================================\n')

  while (Date.now() < expiresAt) {
    await sleep(interval)
    const pollBody = `grant_type=device_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${code}`
    const poll = await fetch(`${API}/oauth2/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: pollBody,
    })
    if (poll.status === 400) {
      const err = await poll.json().catch(() => ({}))
      if (err.error === 'authorization_pending') {
        process.stdout.write('.')
        continue
      }
      if (err.error === 'slow_down') {
        await sleep(interval)
        continue
      }
      throw new Error(`device poll error: ${err.error || poll.status}`)
    }
    if (!poll.ok) throw new Error(`device poll failed: ${poll.status}`)
    const tok = await poll.json()
    console.log('\nAuthorized.')
    return {
      access: tok.access_token,
      refresh: tok.refresh_token,
      expiresAt: Date.now() + tok.expires_in * 1000,
    }
  }
  throw new Error('Device code expired before authorization')
}

async function ensureTokens() {
  let tokens = loadSavedTokens()
  if (tokens) {
    if (tokens.expiresAt < Date.now() + 300_000) {
      try {
        tokens = await refreshTokens(tokens.refresh)
        saveTokens(tokens)
      } catch (err) {
        console.warn('Token refresh failed, re-auth:', err.message)
        tokens = null
      }
    } else {
      console.log('Using saved .kpuppy-tokens.json')
    }
  }
  if (!tokens) {
    tokens = await deviceCodeLogin()
    saveTokens(tokens)
  }
  return tokens
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 304) return
    } catch {
      /* retry */
    }
    await sleep(400)
  }
  throw new Error(`Server not ready: ${url}`)
}

function startDevServer() {
  if (process.env.KPUPPY_BASE_URL) return null
  console.log('Starting vite dev server…')
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  })
  child.stdout.on('data', (d) => {
    if (process.env.DEBUG) process.stdout.write(d)
  })
  child.stderr.on('data', (d) => {
    if (process.env.DEBUG) process.stderr.write(d)
  })
  return child
}

async function injectAuth(page, tokens) {
  await page.addInitScript((tok) => {
    localStorage.setItem('kpuppy_tokens', JSON.stringify(tok))
    localStorage.setItem('kpuppy_language', 'ru')
    localStorage.setItem('kpuppy_device_defaults_applied', '1')
    localStorage.setItem(
      'kpuppy_settings',
      JSON.stringify({
        defaultQuality: 'auto',
        playerType: 'builtin',
        showContinueWatching: true,
        pinSideMenu: false,
      })
    )
  }, tokens)
}

async function waitForHome(page) {
  await page.waitForSelector('.movie-card img.movie-card-image', { timeout: 90_000 })
  // Wait until at least one poster has a real src (not empty)
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('.movie-card img.movie-card-image')]
    return imgs.some((img) => img.complete && img.naturalWidth > 40 && img.src && !img.src.endsWith('/'))
  }, { timeout: 90_000 })
  await sleep(1500)
}

async function capture(page, name) {
  mkdirSync(OUT_DIR, { recursive: true })
  const path = resolve(OUT_DIR, name)
  await page.screenshot({ path, type: 'png' })
  console.log(`Wrote ${path}`)
}

async function openFirstMovie(page) {
  const card = page.locator('.movie-row .movie-card').first()
  await card.click()
  await page.waitForSelector('.item-screen, .item-details, .item-button-primary', { timeout: 30_000 })
  await sleep(2000)
}

async function expandDetailsAndScrollSimilar(page) {
  // Open "full info" if present, then scroll toward similar grid
  const detailsBtn = page.locator('button, .item-button').filter({ hasText: /подробн|details|info|информация/i }).first()
  if (await detailsBtn.count()) {
    try {
      await detailsBtn.click({ timeout: 2000 })
      await sleep(800)
    } catch {
      /* optional */
    }
  }
  const similar = page.locator('.item-similar-grid, [data-similar-index]').first()
  if (await similar.count()) {
    await similar.scrollIntoViewIfNeeded()
    await sleep(800)
  } else {
    // Scroll the item screen down a bit to show plot / similar
    await page.evaluate(() => {
      const el = document.querySelector('.item-screen, .screen-content, main') || document.scrollingElement
      if (el) el.scrollTop = Math.min(el.scrollHeight, 600)
    })
    await sleep(500)
  }
}

/** Indices match SideMenu MENU_ITEM_CONFIGS order. */
const MENU_INDEX = {
  home: 0,
  search: 1,
  history: 2,
  movies: 3,
  series: 4,
  livetv: 9,
  collections: 10,
}

async function goMenu(page, menuId) {
  const index = MENU_INDEX[menuId]
  if (index == null) throw new Error(`Unknown menu: ${menuId}`)
  // Hover expands labels; click works on icons even when collapsed.
  const items = page.locator('.side-menu-items > .side-menu-item')
  await items.nth(index).click()
  await sleep(1500)
}

async function run() {
  const tokens = await ensureTokens()
  const server = startDevServer()
  try {
    await waitForServer(BASE_URL)
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await injectAuth(page, tokens)
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 })
    await waitForHome(page)

    // screen1 — Home
    await capture(page, 'screen1.png')

    // screen2 — Item details (+ similar if available)
    await openFirstMovie(page)
    await expandDetailsAndScrollSimilar(page)
    await capture(page, 'screen2.png')

    // Back to home then movies catalog
    await page.keyboard.press('Escape')
    await sleep(800)
    await page.keyboard.press('Backspace')
    await sleep(500)
    // Prefer clicking home then movies via menu
    const backOrHome = page.locator('.side-menu-item').first()
    if (await page.locator('.item-button-primary, .item-screen').count()) {
      await page.keyboard.press('Escape')
      await sleep(600)
    }

    // screen3 — Movies category or Search
    try {
      await goMenu(page, 'movies')
      await page.waitForSelector('.movie-card img.movie-card-image', { timeout: 45_000 })
      await sleep(1500)
      await capture(page, 'screen3.png')
    } catch {
      await goMenu(page, 'search')
      await sleep(2000)
      await capture(page, 'screen3.png')
    }

    // screen4 — Player: open first card from current grid/home and play
    try {
      const card = page.locator('.movie-card').first()
      await card.click()
      await page.waitForSelector('.item-button-primary', { timeout: 30_000 })
      await sleep(1200)
      await page.locator('.item-button-primary').first().click()
      await page.waitForSelector('video, .player-screen, .player-controls', { timeout: 45_000 })
      await sleep(3500)
      // Nudge controls visible
      await page.keyboard.press('ArrowUp')
      await sleep(800)
      await capture(page, 'screen4.png')
    } catch (err) {
      console.warn('Player capture failed, retrying from home:', err.message)
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      await waitForHome(page)
      await openFirstMovie(page)
      await page.locator('.item-button-primary').first().click()
      await sleep(4000)
      await page.keyboard.press('ArrowUp')
      await sleep(500)
      await capture(page, 'screen4.png')
    }

    await browser.close()
    console.log('Done.')
  } finally {
    if (server) {
      server.kill('SIGTERM')
    }
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
