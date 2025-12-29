import '../styles/keyboard.css'

export const KEYBOARD_ROWS = [
  ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'],
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '⌫', '✕'],
]

export const KEYBOARD_ROWS_WITH_SEARCH = [
  ...KEYBOARD_ROWS.slice(0, 2),
  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '⌫', '✕', '→'],
]

export const SPECIAL_KEYS: Record<string, string> = {
  '⌫': 'backspace',
  '✕': 'clear',
  '→': 'search',
  ' ': 'space',
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
                class={`keyboard-key ${isSpecial ? 'keyboard-key-special' : ''} ${isKeyFocused ? 'focused' : ''}`}
                onClick={() => onKeyPress(key)}
              >
                {key}
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
  }

  return { text: text + key }
}
