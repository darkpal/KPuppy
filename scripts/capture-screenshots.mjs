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
const BASE_URL = process.env.KPUPPY_BASE_URL || 'http://127.0.0.1:4173'
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

function startPreviewServer() {
  if (process.env.KPUPPY_BASE_URL) return null
  const hasDist = existsSync(resolve(ROOT, 'dist/index.html'))
  const start = () => {
    console.log('Starting vite preview (no debug REMOTE overlay)…')
    const child = spawn(
      'npm',
      ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'],
      {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      }
    )
    child.stdout.on('data', (d) => {
      if (process.env.DEBUG) process.stdout.write(d)
    })
    child.stderr.on('data', (d) => {
      if (process.env.DEBUG) process.stderr.write(d)
    })
    return child
  }
  if (hasDist && process.env.KPUPPY_FORCE_BUILD !== '1') {
    console.log('Using existing dist/ for screenshots')
    return Promise.resolve(start())
  }
  console.log('Building production bundle for screenshots…')
  const build = spawn('npm', ['run', 'build'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  })
  return new Promise((resolve, reject) => {
    build.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`npm run build failed with ${code}`))
        return
      }
      resolve(start())
    })
  })
}

async function injectAuth(page, tokens) {
  await page.addInitScript((tok) => {
    localStorage.setItem('kpuppy_tokens', JSON.stringify(tok))
    localStorage.setItem('kpuppy_language', 'ru')
    localStorage.setItem('kpuppy_device_defaults_applied', '1')
    localStorage.setItem(
      'kpuppy_settings',
      JSON.stringify({
        // Desktop Chromium often cannot decode 4K/HEVC — prefer 720p for captures.
        defaultQuality: '720p',
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

async function openTitleCard(page) {
  // Prefer popular row over "continue watching".
  const popular = page.locator('.movie-row').nth(1).locator('.movie-card').first()
  if (await popular.count()) {
    await popular.click()
  } else {
    await page.locator('.movie-row .movie-card').first().click()
  }
  await page.waitForSelector('.item-summary .item-button-primary', { timeout: 30_000 })
  await page.waitForSelector('.item-scroll-hint', { timeout: 15_000 })
  // Full details + Similar grid (README screen2).
  await page.locator('.item-scroll-hint').click()
  await page.waitForSelector('.item-content.details-expanded', { timeout: 15_000 })
  await sleep(1500)
  const similarSection = page.locator('.item-similar')
  try {
    await similarSection.waitFor({ state: 'visible', timeout: 20_000 })
    await similarSection.scrollIntoViewIfNeeded()
    await sleep(600)
    // Frame: plot/meta above + similar posters below.
    await page.evaluate(() => {
      const pageEl = document.querySelector('.item-details-page')
      const similar = document.querySelector('.item-similar')
      if (pageEl && similar) {
        const top = Math.max(0, similar.offsetTop - 280)
        pageEl.scrollTop = top
      }
    })
    await sleep(1200)
  } catch {
    await sleep(1000)
  }
}

async function goHome(page) {
  await goMenu(page, 'home')
  await waitForHome(page)
}

async function capturePlayer(page) {
  async function backToMoviesGrid() {
    for (let n = 0; n < 4; n++) {
      if ((await page.locator('.category-grid .movie-card').count()) >= 2) return
      await page.keyboard.press('Backspace')
      await sleep(500)
    }
    await goMenu(page, 'movies')
    await page.waitForSelector('.category-grid .movie-card, .movie-card img.movie-card-image', {
      timeout: 45_000,
    })
    await sleep(1000)
  }

  await backToMoviesGrid()
  const card = page.locator('.category-grid .movie-card, .movie-card').first()
  await card.click()
  await page.waitForSelector('.item-button-primary', { timeout: 20_000 })
  await sleep(900)
  await page.locator('.item-button-primary').first().click()
  await page.waitForSelector('.player-screen', { timeout: 20_000 })
  await sleep(2500)

  // Desktop Chromium often cannot decode the stream — hide the error overlay for README shots.
  await page.addStyleTag({
    content: '.player-error, .player-error-title, .player-error-message, .player-error-url { display: none !important; }',
  })
  await page.keyboard.press('ArrowUp')
  await sleep(800)
  await capture(page, 'screen4.png')
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
  const items = page.locator('.side-menu-items > .side-menu-item')
  await items.nth(index).click()
  await sleep(1500)
}

async function run() {
  const tokens = await ensureTokens()
  const server = await startPreviewServer()
  try {
    await waitForServer(BASE_URL)
    const browser = await chromium.launch({
      headless: true,
      args: ['--autoplay-policy=no-user-gesture-required'],
    })
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await injectAuth(page, tokens)
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await waitForHome(page)

    const only = (process.env.KPUPPY_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean)
    const want = (n) => only.length === 0 || only.includes(String(n))

    if (want(1)) {
      await capture(page, 'screen1.png')
    }

    if (want(2)) {
      await openTitleCard(page)
      await capture(page, 'screen2.png')
    }

    if (want(3) || want(4)) {
      if (want(2) || !want(1)) {
        // may already be on an item card
      }
      await goHome(page)
      await goMenu(page, 'movies')
      await page.waitForSelector('.movie-card img.movie-card-image', { timeout: 45_000 })
      await sleep(1500)
      if (want(3)) await capture(page, 'screen3.png')
    }

    if (want(4)) {
      await capturePlayer(page)
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
