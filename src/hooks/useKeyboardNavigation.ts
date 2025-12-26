import { useCallback } from 'preact/hooks'
import { useEventListener } from './useEventListener'

export const KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  BACK: 461,
  BACKSPACE: 8,
  SEARCH: 83,
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,
} as const

export interface KeyboardHandlers {
  onUp?: () => void
  onDown?: () => void
  onLeft?: () => void
  onRight?: () => void
  onEnter?: () => void
  onBack?: () => void
  onRed?: () => void
  onGreen?: () => void
  onYellow?: () => void
  onBlue?: () => void
}

export function useKeyboardNavigation(
  handlers: KeyboardHandlers,
  enabled: boolean = true
): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { onUp, onDown, onLeft, onRight, onEnter, onBack, onRed, onGreen, onYellow, onBlue } = handlers

    switch (event.keyCode) {
      case KEY_CODES.UP:
        if (onUp) {
          onUp()
          event.preventDefault()
        }
        break

      case KEY_CODES.DOWN:
        if (onDown) {
          onDown()
          event.preventDefault()
        }
        break

      case KEY_CODES.LEFT:
        if (onLeft) {
          onLeft()
          event.preventDefault()
        }
        break

      case KEY_CODES.RIGHT:
        if (onRight) {
          onRight()
          event.preventDefault()
        }
        break

      case KEY_CODES.ENTER:
        if (onEnter) {
          onEnter()
          event.preventDefault()
        }
        break

      case KEY_CODES.BACK:
      case KEY_CODES.BACKSPACE:
        if (onBack) {
          onBack()
          event.preventDefault()
        }
        break

      case KEY_CODES.RED:
        if (onRed) {
          onRed()
          event.preventDefault()
        }
        break

      case KEY_CODES.GREEN:
        if (onGreen) {
          onGreen()
          event.preventDefault()
        }
        break

      case KEY_CODES.YELLOW:
        if (onYellow) {
          onYellow()
          event.preventDefault()
        }
        break

      case KEY_CODES.BLUE:
        if (onBlue) {
          onBlue()
          event.preventDefault()
        }
        break
    }
  }, [handlers])

  useEventListener('keydown', handleKeyDown, enabled)
}
