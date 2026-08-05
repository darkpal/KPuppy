import { describe, it, expect } from 'vitest'
import { subtitleLanguageLabel, summarizeSubtitleTracks, sortSubtitleTracks } from '../../src/utils/subtitles'

describe('subtitleLanguageLabel', () => {
  it('maps ISO codes from Kinopub to readable names', () => {
    expect(subtitleLanguageLabel('ron')).toBe('Română')
    expect(subtitleLanguageLabel('CHI')).toBe('Chinese')
    expect(subtitleLanguageLabel('spa')).toBe('Español')
    expect(subtitleLanguageLabel('FRE')).toBe('Français')
    expect(subtitleLanguageLabel('dut')).toBe('Nederlands')
    expect(subtitleLanguageLabel('tha')).toBe('Thai')
  })

  it('keeps forced tracks distinct', () => {
    expect(subtitleLanguageLabel('eng', true)).toBe('English Forced')
    expect(subtitleLanguageLabel('rus-forced')).toBe('Русский Forced')
  })
})

describe('sortSubtitleTracks', () => {
  it('puts Russian, Ukrainian and English first, then A–Z', () => {
    const sorted = sortSubtitleTracks([
      { lang: 'spa', forced: false },
      { lang: 'eng', forced: true },
      { lang: 'ron', forced: false },
      { lang: 'ukr', forced: false },
      { lang: 'rus', forced: false },
      { lang: 'deu', forced: false },
      { lang: 'rus', forced: true },
    ])
    expect(sorted.map(sub => `${sub.lang}${sub.forced ? '-forced' : ''}`)).toEqual([
      'rus',
      'rus-forced',
      'ukr',
      'eng-forced',
      'deu',
      'spa',
      'ron',
    ])
  })
})

describe('summarizeSubtitleTracks', () => {
  it('collapses duplicate languages', () => {
    expect(summarizeSubtitleTracks([
      { lang: 'rus', shift: 0, embed: false, forced: false, file: 'a', url: 'a' },
      { lang: 'RUS', shift: 0, embed: false, forced: false, file: 'b', url: 'b' },
      { lang: 'eng', shift: 0, embed: false, forced: true, file: 'c', url: 'c' },
    ])).toBe('Русский ×2 · English Forced')
  })
})
