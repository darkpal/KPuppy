import { describe, it, expect } from 'vitest'
import { subtitleLanguageLabel, summarizeSubtitleTracks } from '../../src/utils/subtitles'

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

describe('summarizeSubtitleTracks', () => {
  it('collapses duplicate languages', () => {
    expect(summarizeSubtitleTracks([
      { lang: 'rus', shift: 0, embed: false, forced: false, file: 'a', url: 'a' },
      { lang: 'RUS', shift: 0, embed: false, forced: false, file: 'b', url: 'b' },
      { lang: 'eng', shift: 0, embed: false, forced: true, file: 'c', url: 'c' },
    ])).toBe('Русский ×2 · English Forced')
  })
})
