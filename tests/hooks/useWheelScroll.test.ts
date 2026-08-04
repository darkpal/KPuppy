import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/preact'
import { useWheelScroll } from '../../src/hooks/useWheelScroll'

describe('useWheelScroll', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    Object.defineProperty(container, 'scrollWidth', { configurable: true, value: 2000 })
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 800 })
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 2000 })
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 800 })
    container.scrollLeft = 0
    container.scrollTop = 0
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('does not steal vertical mouse-wheel for horizontal containers', () => {
    const ref = { current: container }
    renderHook(() => useWheelScroll({ containerRef: ref, direction: 'horizontal' }))

    const event = new WheelEvent('wheel', { deltaX: 0, deltaY: 120, bubbles: true, cancelable: true })
    const prevented = !container.dispatchEvent(event)

    expect(prevented).toBe(false)
    expect(container.scrollLeft).toBe(0)
  })

  it('scrolls horizontally on horizontal delta', () => {
    const ref = { current: container }
    renderHook(() => useWheelScroll({ containerRef: ref, direction: 'horizontal' }))

    const event = new WheelEvent('wheel', { deltaX: 80, deltaY: 0, bubbles: true, cancelable: true })
    container.dispatchEvent(event)

    expect(container.scrollLeft).toBe(80)
  })

  it('scrolls vertical containers with deltaY', () => {
    const ref = { current: container }
    renderHook(() => useWheelScroll({ containerRef: ref, direction: 'vertical' }))

    const event = new WheelEvent('wheel', { deltaX: 0, deltaY: 100, bubbles: true, cancelable: true })
    container.dispatchEvent(event)

    expect(container.scrollTop).toBe(100)
  })
})
