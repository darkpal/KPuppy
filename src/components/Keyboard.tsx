import '../styles/keyboard.css'

/** Stable key ids — avoid unicode symbols that webOS fonts render as □ */
export const KEY_SPACE = 'space'
export const KEY_BACKSPACE = 'backspace'
export const KEY_CLEAR = 'clear'
export const KEY_SEARCH = 'search'
export const KEY_VOICE = 'voice'

export const SPECIAL_KEYS: Record<string, string> = {
  [KEY_BACKSPACE]: 'backspace',
  [KEY_CLEAR]: 'clear',
  [KEY_SEARCH]: 'search',
  [KEY_SPACE]: 'space',
  [KEY_VOICE]: 'voice'
}

/** Visible labels for special keys (ASCII / simple glyphs that render on webOS). */
export const KEY_LABELS: Record<string, string> = {
  [KEY_BACKSPACE]: '←',
  [KEY_CLEAR]: 'C',
  [KEY_SEARCH]: '→',
  [KEY_SPACE]: '␣',
  [KEY_VOICE]: '' // rendered as SVG
}

export const KEYBOARD_ROWS = [
  ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'],
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', KEY_SPACE, KEY_BACKSPACE, KEY_CLEAR],
]

export const KEYBOARD_ROWS_WITH_SEARCH = [
  ...KEYBOARD_ROWS.slice(0, 2),
  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', KEY_SPACE, KEY_BACKSPACE, KEY_CLEAR, KEY_VOICE, KEY_SEARCH],
]

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )
}

function keyLabel(key: string) {
  if (key === KEY_VOICE) return <MicIcon />
  if (key in KEY_LABELS) return KEY_LABELS[key]
  return key
}

interface KeyboardProps {
  rows?: string[][]
  focusedRow: number
  focusedCol: number
  isFocused: boolean
  onKeyPress: (key: string) => void
  className?: string
}

export function Keyboard({
  rows = KEYBOARD_ROWS,
  focusedRow,
  focusedCol,
  isFocused,
  onKeyPress,
  className = ''
}: KeyboardProps) {
  return (
    <div class={`keyboard ${className}`}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} class="keyboard-row">
          {row.map((key, colIndex) => {
            const isSpecial = key in SPECIAL_KEYS
            const isKeyFocused = isFocused && focusedRow === rowIndex && focusedCol === colIndex
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                class={`keyboard-key ${isSpecial ? 'keyboard-key-special' : ''} ${isKeyFocused ? 'focused' : ''}`}
                onClick={() => onKeyPress(key)}
              >
                {keyLabel(key)}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function getKeyboardRows(includeSearch: boolean = false): string[][] {
  return includeSearch ? KEYBOARD_ROWS_WITH_SEARCH : KEYBOARD_ROWS
}

export function handleSpecialKey(key: string, text: string): { text: string; action?: string } {
  const specialAction = SPECIAL_KEYS[key]

  if (specialAction === 'backspace') {
    return { text: text.slice(0, -1) }
  } else if (specialAction === 'clear') {
    return { text: '' }
  } else if (specialAction === 'space') {
    return { text: text + ' ' }
  } else if (specialAction === 'search') {
    return { text, action: 'search' }
  } else if (specialAction === 'voice') {
    return { text, action: 'voice' }
  }

  return { text: text + key }
}
