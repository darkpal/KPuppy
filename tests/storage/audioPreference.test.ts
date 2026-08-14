import { describe, it, expect, beforeEach } from 'vitest'
import { getAudioTrackName, saveAudioPreference, getSavedAudioPreference, findAudioIndex } from '../../src/storage'

describe('audio preference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('formats audio labels like ValeraGin', () => {
    expect(getAudioTrackName({
      lang: 'rus',
      type: { title: 'Многоголосый' },
      author: { title: 'Jask' }
    })).toBe('Многоголосый, Jask (RUS)')

    expect(getAudioTrackName({
      lang: 'eng',
      type: { title: 'Оригинал' },
      author: null
    })).toBe('Оригинал (ENG)')
  })

  it('appends non-default codecs only (hide AAC like Kinopub web)', () => {
    expect(getAudioTrackName({
      lang: 'rus',
      codec: 'aac',
      type: { title: 'Дубляж' },
      author: null
    })).toBe('Дубляж (RUS)')

    expect(getAudioTrackName({
      lang: 'rus',
      codec: 'ac3',
      type: { title: 'Дубляж' },
      author: null
    })).toBe('Дубляж (RUS) AC3')
  })

  it('matches prefs saved with an AAC suffix from older builds', () => {
    const audios = [
      { id: 1, lang: 'eng', codec: 'aac', type: { title: 'Original' }, author: null },
      { id: 7, lang: 'rus', codec: 'aac', type: { title: 'Дубляж' }, author: null }
    ]
    expect(findAudioIndex(audios, { id: 999, name: 'Дубляж (RUS) AAC' })).toBe(1)
  })

  it('saves and restores audio preference by item id', () => {
    saveAudioPreference(42, {
      id: 7,
      lang: 'rus',
      type: { title: 'Дубляж' },
      author: { title: 'LostFilm' }
    })

    const saved = getSavedAudioPreference(42)
    expect(saved?.id).toBe(7)
    expect(saved?.name).toContain('LostFilm')
  })

  it('finds audio index by saved id or name', () => {
    const audios = [
      { id: 1, lang: 'eng', type: { title: 'Original' }, author: null },
      { id: 7, lang: 'rus', type: { title: 'Дубляж' }, author: { title: 'LostFilm' } }
    ]
    expect(findAudioIndex(audios, { id: 7, name: getAudioTrackName(audios[1]) })).toBe(1)
    expect(findAudioIndex(audios, { id: 999, name: getAudioTrackName(audios[1]) })).toBe(1)
    expect(findAudioIndex(audios, null)).toBe(0)
  })

  it('matches the same track name across episodes with different track ids', () => {
    saveAudioPreference(100, {
      id: 11,
      lang: 'rus',
      type: { title: 'Дубляж' },
      author: { title: 'LostFilm' }
    })
    const saved = getSavedAudioPreference(100)
    const nextEpisodeAudios = [
      { id: 50, lang: 'eng', type: { title: 'Original' }, author: null },
      { id: 99, lang: 'rus', type: { title: 'Дубляж' }, author: { title: 'LostFilm' } }
    ]
    expect(findAudioIndex(nextEpisodeAudios, saved)).toBe(1)
  })
})
