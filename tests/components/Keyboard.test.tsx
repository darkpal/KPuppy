import { describe, it, expect } from 'vitest'
import {
  handleSpecialKey,
  KEY_BACKSPACE,
  KEY_CLEAR,
  KEY_SEARCH,
  KEY_SPACE,
  KEY_VOICE,
  KEYBOARD_ROWS_WITH_SEARCH
} from '../../src/components/Keyboard'

describe('handleSpecialKey', () => {
  it('appends regular characters', () => {
    expect(handleSpecialKey('A', 'te')).toEqual({ text: 'teA' })
  })

  it('handles backspace without unicode glyph', () => {
    expect(handleSpecialKey(KEY_BACKSPACE, 'ab')).toEqual({ text: 'a' })
  })

  it('handles clear, space, search, voice', () => {
    expect(handleSpecialKey(KEY_CLEAR, 'ab')).toEqual({ text: '' })
    expect(handleSpecialKey(KEY_SPACE, 'ab')).toEqual({ text: 'ab ' })
    expect(handleSpecialKey(KEY_SEARCH, 'ab')).toEqual({ text: 'ab', action: 'search' })
    expect(handleSpecialKey(KEY_VOICE, 'ab')).toEqual({ text: 'ab', action: 'voice' })
  })

  it('includes voice key on search keyboard', () => {
    const lastRow = KEYBOARD_ROWS_WITH_SEARCH[KEYBOARD_ROWS_WITH_SEARCH.length - 1]
    expect(lastRow).toContain(KEY_VOICE)
    expect(lastRow).toContain(KEY_BACKSPACE)
    expect(lastRow).not.toContain('⌫')
  })
})
