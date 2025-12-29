import { useState, useCallback } from 'preact/hooks'
import { KEY_CODES } from '../hooks/useKeyboardNavigation'
import '../styles/remote-debug.css'

interface RemoteButton {
  label: string
  keyCode: number
  className?: string
}

const DPAD_BUTTONS: RemoteButton[] = [
  { label: '▲', keyCode: KEY_CODES.UP, className: 'remote-btn-up' },
  { label: '◀', keyCode: KEY_CODES.LEFT, className: 'remote-btn-left' },
  { label: 'OK', keyCode: KEY_CODES.ENTER, className: 'remote-btn-ok' },
  { label: '▶', keyCode: KEY_CODES.RIGHT, className: 'remote-btn-right' },
  { label: '▼', keyCode: KEY_CODES.DOWN, className: 'remote-btn-down' },
]

const ACTION_BUTTONS: RemoteButton[] = [
  { label: '← Back', keyCode: KEY_CODES.BACK, className: 'remote-btn-back' },
]

const COLOR_BUTTONS: RemoteButton[] = [
  { label: 'R', keyCode: KEY_CODES.RED, className: 'remote-btn-red' },
  { label: 'G', keyCode: KEY_CODES.GREEN, className: 'remote-btn-green' },
  { label: 'Y', keyCode: KEY_CODES.YELLOW, className: 'remote-btn-yellow' },
  { label: 'B', keyCode: KEY_CODES.BLUE, className: 'remote-btn-blue' },
]

function dispatchKeyEvent(keyCode: number) {
  const event = new KeyboardEvent('keydown', {
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
  })
  document.dispatchEvent(event)
}

export function RemoteDebugOverlay() {
  const [visible, setVisible] = useState(true)
  const [minimized, setMinimized] = useState(false)

  const handleButtonClick = useCallback((keyCode: number) => {
    dispatchKeyEvent(keyCode)
  }, [])

  if (!import.meta.env.DEV) {
    return null
  }

  if (!visible) {
    return (
      <button
        class="remote-debug-show"
        onClick={() => setVisible(true)}
        title="Show remote debug overlay"
      >
        📺
      </button>
    )
  }

  return (
    <div class={`remote-debug-overlay ${minimized ? 'minimized' : ''}`} data-testid="remote-debug-overlay">
      <div class="remote-debug-header">
        <span class="remote-debug-title">Remote</span>
        <div class="remote-debug-controls">
          <button
            class="remote-debug-minimize"
            onClick={() => setMinimized(!minimized)}
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '□' : '−'}
          </button>
          <button
            class="remote-debug-close"
            onClick={() => setVisible(false)}
            title="Hide"
          >
            ×
          </button>
        </div>
      </div>

      {!minimized && (
        <div class="remote-debug-body">
          <div class="remote-debug-dpad">
            {DPAD_BUTTONS.map(btn => (
              <button
                key={btn.keyCode}
                class={`remote-btn ${btn.className || ''}`}
                onClick={() => handleButtonClick(btn.keyCode)}
                data-testid={`remote-btn-${btn.keyCode}`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div class="remote-debug-actions">
            {ACTION_BUTTONS.map(btn => (
              <button
                key={btn.keyCode}
                class={`remote-btn ${btn.className || ''}`}
                onClick={() => handleButtonClick(btn.keyCode)}
                data-testid={`remote-btn-${btn.keyCode}`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div class="remote-debug-colors">
            {COLOR_BUTTONS.map(btn => (
              <button
                key={btn.keyCode}
                class={`remote-btn ${btn.className || ''}`}
                onClick={() => handleButtonClick(btn.keyCode)}
                data-testid={`remote-btn-${btn.keyCode}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
