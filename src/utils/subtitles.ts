import type { Subtitle } from '../api/kinopub'

const SUBTITLE_LANG_NAMES: Record<string, string> = {
  rus: 'Русский', ru: 'Русский',
  eng: 'English', en: 'English',
  ukr: 'Українська', uk: 'Українська',
  bel: 'Беларуская', be: 'Беларуская',
  tur: 'Türkçe', tr: 'Türkçe',
  deu: 'Deutsch', de: 'Deutsch', ger: 'Deutsch',
  fra: 'Français', fr: 'Français', fre: 'Français',
  spa: 'Español', es: 'Español',
  por: 'Português', pt: 'Português',
  ita: 'Italiano', it: 'Italiano',
  pol: 'Polski', pl: 'Polski',
  ces: 'Čeština', cs: 'Čeština', cze: 'Čeština',
  slk: 'Slovenčina', sk: 'Slovenčina', slo: 'Slovenčina',
  slv: 'Slovenščina', sl: 'Slovenščina',
  hun: 'Magyar', hu: 'Magyar',
  ron: 'Română', ro: 'Română', rum: 'Română',
  bul: 'Български', bg: 'Български',
  hrv: 'Hrvatski', hr: 'Hrvatski',
  srp: 'Srpski', sr: 'Srpski',
  bos: 'Bosanski', bs: 'Bosanski',
  mkd: 'Македонски', mk: 'Македонски', mac: 'Македонски',
  dut: 'Nederlands', nld: 'Nederlands', nl: 'Nederlands',
  nor: 'Norsk', no: 'Norsk', nob: 'Norsk', nno: 'Norsk',
  swe: 'Svenska', sv: 'Svenska',
  dan: 'Dansk', da: 'Dansk',
  fin: 'Suomi', fi: 'Suomi',
  est: 'Eesti', et: 'Eesti',
  lav: 'Latviešu', lv: 'Latviešu',
  lit: 'Lietuvių', lt: 'Lietuvių',
  ice: 'Icelandic', isl: 'Icelandic', is: 'Icelandic',
  ell: 'Greek', el: 'Greek', gre: 'Greek',
  cat: 'Català', ca: 'Català',
  tha: 'Thai', th: 'Thai',
  chi: 'Chinese', zho: 'Chinese', zh: 'Chinese', cmn: 'Chinese',
  kor: 'Korean', ko: 'Korean',
  jpn: 'Japanese', ja: 'Japanese',
  vie: 'Vietnamese', vi: 'Vietnamese',
  ind: 'Indonesia', id: 'Indonesia',
  msa: 'Melayu', may: 'Melayu', ms: 'Melayu',
  fil: 'Filipino', tl: 'Filipino', tgl: 'Filipino',
  ara: 'Arabic', ar: 'Arabic',
  heb: 'Hebrew', he: 'Hebrew',
  fas: 'Persian', fa: 'Persian', per: 'Persian',
  hin: 'Hindi', hi: 'Hindi',
  kaz: 'Қазақша', kk: 'Қазақша',
  aze: 'Azərbaycan', az: 'Azərbaycan',
  uzb: 'Oʻzbek', uz: 'Oʻzbek',
  geo: 'Georgian', kat: 'Georgian', ka: 'Georgian',
  arm: 'Armenian', hye: 'Armenian', hy: 'Armenian',
  mon: 'Монгол', mn: 'Монгол',
}

function normalizeSubtitleLang(lang: string): string {
  return (lang || '')
    .trim()
    .toLowerCase()
    .replace(/[_/]/g, '-')
    .replace(/-forced$/, '')
    .split('-')[0]
}

/** Human-readable language label for a subtitle track. */
export function subtitleLanguageLabel(lang: string, forced = false): string {
  const code = normalizeSubtitleLang(lang)
  const name = SUBTITLE_LANG_NAMES[code] || (code ? code.toUpperCase() : 'SUB')
  return forced || /-forced$/i.test(lang || '') ? `${name} Forced` : name
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
