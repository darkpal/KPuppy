import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { RemoteDebugOverlay } from '../../src/components/RemoteDebugOverlay'
import { KEY_CODES } from '../../src/hooks/useKeyboardNavigation'

describe('RemoteDebugOverlay', () => {
  let keydownHandler: (e: KeyboardEvent) => void
  let dispatchedEvents: KeyboardEvent[] = []

  beforeEach(() => {
    dispatchedEvents = []
    keydownHandler = (e: KeyboardEvent) => {
      dispatchedEvents.push(e)
    }
    document.addEventListener('keydown', keydownHandler)
  })

  afterEach(() => {
    document.removeEventListener('keydown', keydownHandler)
    cleanup()
  })

  it('renders the overlay in DEV mode', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)
    expect(getByTestId('remote-debug-overlay')).toBeTruthy()
  })

  it('renders all d-pad buttons', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    expect(getByTestId(`remote-btn-${KEY_CODES.UP}`)).toBeTruthy()
    expect(getByTestId(`remote-btn-${KEY_CODES.DOWN}`)).toBeTruthy()
    expect(getByTestId(`remote-btn-${KEY_CODES.LEFT}`)).toBeTruthy()
    expect(getByTestId(`remote-btn-${KEY_CODES.RIGHT}`)).toBeTruthy()
    expect(getByTestId(`remote-btn-${KEY_CODES.ENTER}`)).toBeTruthy()
  })

  it('renders the back button', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)
    expect(getByTestId(`remote-btn-${KEY_CODES.BACK}`)).toBeTruthy()
  })

  it('renders all color buttons', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    expect(getByTestId(`remote-btn-${KEY_CODES.RED}`)).toBeTruthy()
    expect(getByTestId(`remote-btn-${KEY_CODES.GREEN}`)).toBeTruthy()
    expect(getByTestId(`remote-btn-${KEY_CODES.YELLOW}`)).toBeTruthy()
    expect(getByTestId(`remote-btn-${KEY_CODES.BLUE}`)).toBeTruthy()
  })

  it('dispatches UP key event when up button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.UP}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.UP)
  })

  it('dispatches DOWN key event when down button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.DOWN}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.DOWN)
  })

  it('dispatches LEFT key event when left button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.LEFT}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.LEFT)
  })

  it('dispatches RIGHT key event when right button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.RIGHT}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.RIGHT)
  })

  it('dispatches ENTER key event when OK button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.ENTER}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.ENTER)
  })

  it('dispatches BACK key event when back button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.BACK}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.BACK)
  })

  it('dispatches RED key event when red button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.RED}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.RED)
  })

  it('dispatches GREEN key event when green button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.GREEN}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.GREEN)
  })

  it('dispatches YELLOW key event when yellow button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.YELLOW}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.YELLOW)
  })

  it('dispatches BLUE key event when blue button is clicked', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.BLUE}`))

    expect(dispatchedEvents.length).toBe(1)
    expect(dispatchedEvents[0].keyCode).toBe(KEY_CODES.BLUE)
  })

  it('can be hidden by clicking close button', () => {
    const { getByTitle, queryByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTitle('Hide'))

    expect(queryByTestId('remote-debug-overlay')).toBeNull()
  })

  it('shows toggle button when hidden', () => {
    const { getByTitle } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTitle('Hide'))

    expect(getByTitle('Show remote debug overlay')).toBeTruthy()
  })

  it('can be shown again after hiding', () => {
    const { getByTitle, queryByTestId, getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTitle('Hide'))
    expect(queryByTestId('remote-debug-overlay')).toBeNull()

    fireEvent.click(getByTitle('Show remote debug overlay'))
    expect(getByTestId('remote-debug-overlay')).toBeTruthy()
  })

  it('can be minimized', () => {
    const { getByTitle, getByTestId, queryByTestId } = render(<RemoteDebugOverlay />)

    expect(getByTestId(`remote-btn-${KEY_CODES.UP}`)).toBeTruthy()

    fireEvent.click(getByTitle('Minimize'))

    expect(getByTestId('remote-debug-overlay').className).toContain('minimized')
    expect(queryByTestId(`remote-btn-${KEY_CODES.UP}`)).toBeNull()
  })

  it('can be expanded after minimizing', () => {
    const { getByTitle, getByTestId, queryByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTitle('Minimize'))
    expect(queryByTestId(`remote-btn-${KEY_CODES.UP}`)).toBeNull()

    fireEvent.click(getByTitle('Expand'))
    expect(getByTestId(`remote-btn-${KEY_CODES.UP}`)).toBeTruthy()
  })

  it('dispatches keyboard event with correct properties', () => {
    const { getByTestId } = render(<RemoteDebugOverlay />)

    fireEvent.click(getByTestId(`remote-btn-${KEY_CODES.ENTER}`))

    const event = dispatchedEvents[0]
    expect(event.keyCode).toBe(KEY_CODES.ENTER)
    expect(event.which).toBe(KEY_CODES.ENTER)
    expect(event.bubbles).toBe(true)
    expect(event.cancelable).toBe(true)
  })
})
