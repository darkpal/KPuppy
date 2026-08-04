import type { Subtitle } from '../api/kinopub'

const SUBTITLE_LANG_NAMES: Record<string, string> = {
  rus: 'Русский', ru: 'Русский',
  eng: 'English', en: 'English',
  ukr: 'Українська', uk: 'Українська',
  tur: 'Türkçe', tr: 'Türkçe',
  deu: 'Deutsch', de: 'Deutsch', ger: 'Deutsch',
  fra: 'Français', fr: 'Français',
}

/** Human-readable language label for a subtitle track. */
export function subtitleLanguageLabel(lang: string, forced = false): string {
  const raw = (lang || '').toLowerCase().replace(/-forced$/, '')
  const name = SUBTITLE_LANG_NAMES[raw] || (lang ? lang.toUpperCase() : 'SUB')
  return forced ? `${name} Forced` : name
}

/**
 * Collapse duplicate language codes for item metadata, e.g.
 * RUS RUS RUS ENG ENG → "Русский ×3 · English ×2"
 */
export function summarizeSubtitleTracks(subs: Subtitle[]): string {
  const counts = new Map<string, number>()
  for (const sub of subs) {
    const label = subtitleLanguageLabel(sub.lang, sub.forced)
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, count]) => (count > 1 ? `${label} ×${count}` : label))
    .join(' · ')
}

/** Convert remote SRT (or plain text) to a blob: URL for <track src>. ValeraGin-style lazy convert. */
export async function convertSrtUrlToVtt(src: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(src, signal ? { signal } : undefined)
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    let text = new TextDecoder('utf-8').decode(buffer)
    if (text.includes('�')) {
      try {
        text = new TextDecoder('windows-1251').decode(buffer)
      } catch {
        // keep utf-8
      }
    }

    const trimmed = text.trimStart()
    const vttBody = trimmed.startsWith('WEBVTT')
      ? text
      : srtToVtt(text)

    const blob = new Blob([vttBody], { type: 'text/vtt' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export function srtToVtt(srt: string): string {
  let vtt = 'WEBVTT\n\n'
  const lines = srt.trim().split(/\r?\n/)
  let i = 0

  while (i < lines.length) {
    if (/^\d+$/.test(lines[i]?.trim())) {
      i++
    }

    if (lines[i] && lines[i].includes('-->')) {
      const timestamp = lines[i].replace(/,/g, '.')
      vtt += timestamp + '\n'
      i++

      while (i < lines.length && lines[i]?.trim() !== '') {
        vtt += lines[i] + '\n'
        i++
      }
      vtt += '\n'
    }
    i++
  }

  return vtt
}

export function isSrtUrl(url: string, file?: string): boolean {
  const target = `${file || ''} ${url}`.toLowerCase()
  return target.includes('.srt')
}
