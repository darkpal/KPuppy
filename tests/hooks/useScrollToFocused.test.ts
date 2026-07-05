import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/preact'
import { useScrollToFocused } from '../../src/hooks/useScrollToFocused'

interface MockContainer {
  clientHeight: number
  clientWidth: number
  scrollTop: number
  scrollLeft: number
  getBoundingClientRect: () => { top: number; left: number }
  querySelectorAll: ReturnType<typeof vi.fn>
}

function createMockContainer(options: {
  clientHeight?: number
  clientWidth?: number
  scrollTop?: number
  scrollLeft?: number
}): MockContainer {
  return {
    clientHeight: options.clientHeight ?? 500,
    clientWidth: options.clientWidth ?? 800,
    scrollTop: options.scrollTop ?? 0,
    scrollLeft: options.scrollLeft ?? 0,
    getBoundingClientRect: () => ({ top: 0, left: 0 }),
    querySelectorAll: vi.fn()
  }
}

function createMockItem(container: MockContainer, options: {
  offsetTop?: number
  offsetLeft?: number
  clientHeight?: number
  clientWidth?: number
}) {
  return {
    getBoundingClientRect: () => ({
      top: (options.offsetTop ?? 0) - container.scrollTop,
      left: (options.offsetLeft ?? 0) - container.scrollLeft,
      height: options.clientHeight ?? 100,
      width: options.clientWidth ?? 200
    })
  }
}

describe('useScrollToFocused', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('vertical scrolling', () => {
    it('centers focused item vertically when center is true', () => {
      const container = createMockContainer({ clientHeight: 500, scrollTop: 0 })
      const items = [
        createMockItem(container, { offsetTop: 0 }),
        createMockItem(container, { offsetTop: 100 }),
        createMockItem(container, { offsetTop: 200 }),
        createMockItem(container, { offsetTop: 300 }),
        createMockItem(container, { offsetTop: 400 })
      ]
      container.querySelectorAll.mockReturnValue(items)

      const ref = { current: container as unknown as HTMLElement }

      renderHook(() => useScrollToFocused({
        containerRef: ref,
        focusedIndex: 3,
        itemSelector: '.item',
        direction: 'vertical',
        center: true
      }))

      expect(container.scrollTop).toBe(300 - 250 + 50)
    })

    it('scrolls up when item is above viewport (center false)', () => {
      const container = createMockContainer({ clientHeight: 500, scrollTop: 300 })
      const items = [
        createMockItem(container, { offsetTop: 0 }),
        createMockItem(container, { offsetTop: 100 }),
        createMockItem(container, { offsetTop: 200 })
      ]
      container.querySelectorAll.mockReturnValue(items)

      const ref = { current: container as unknown as HTMLElement }

      renderHook(() => useScrollToFocused({
        containerRef: ref,
        focusedIndex: 1,
        itemSelector: '.item',
        direction: 'vertical',
        center: false
      }))

      expect(container.scrollTop).toBe(100)
    })

    it('scrolls down when item is below viewport (center false)', () => {
      const container = createMockContainer({ clientHeight: 500, scrollTop: 0 })
      const items = [
        createMockItem(container, { offsetTop: 0 }),
        createMockItem(container, { offsetTop: 100 }),
        createMockItem(container, { offsetTop: 600, clientHeight: 100 })
      ]
      container.querySelectorAll.mockReturnValue(items)

      const ref = { current: container as unknown as HTMLElement }

      renderHook(() => useScrollToFocused({
        containerRef: ref,
        focusedIndex: 2,
        itemSelector: '.item',
        direction: 'vertical',
        center: false
      }))

      expect(container.scrollTop).toBe(700 - 500)
    })

    it('does not scroll when item is already visible (center false)', () => {
      const container = createMockContainer({ clientHeight: 500, scrollTop: 50 })
      const items = [
        createMockItem(container, { offsetTop: 0 }),
        createMockItem(container, { offsetTop: 100, clientHeight: 100 }),
        createMockItem(container, { offsetTop: 200 })
      ]
      container.querySelectorAll.mockReturnValue(items)

      const ref = { current: container as unknown as HTMLElement }

      renderHook(() => useScrollToFocused({
        containerRef: ref,
        focusedIndex: 1,
        itemSelector: '.item',
        direction: 'vertical',
        center: false
      }))

      expect(container.scrollTop).toBe(50)
    })
  })

  describe('horizontal scrolling', () => {
    it('centers focused item horizontally when center is true', () => {
      const container = createMockContainer({ clientWidth: 800, scrollLeft: 0 })
      const items = [
        createMockItem(container, { offsetLeft: 0, clientWidth: 200 }),
        createMockItem(container, { offsetLeft: 200, clientWidth: 200 }),
        createMockItem(container, { offsetLeft: 400, clientWidth: 200 }),
        createMockItem(container, { offsetLeft: 600, clientWidth: 200 })
      ]
      container.querySelectorAll.mockReturnValue(items)

      const ref = { current: container as unknown as HTMLElement }

      renderHook(() => useScrollToFocused({
        containerRef: ref,
        focusedIndex: 2,
        itemSelector: '.item',
        direction: 'horizontal',
        center: true
      }))

      expect(container.scrollLeft).toBe(400 - 400 + 100)
    })

    it('scrolls left when item is before viewport (center false)', () => {
      const container = createMockContainer({ clientWidth: 800, scrollLeft: 400 })
      const items = [
        createMockItem(container, { offsetLeft: 0, clientWidth: 200 }),
        createMockItem(container, { offsetLeft: 200, clientWidth: 200 }),
        createMockItem(container, { offsetLeft: 400, clientWidth: 200 })
      ]
      container.querySelectorAll.mockReturnValue(items)

      const ref = { current: container as unknown as HTMLElement }

      renderHook(() => useScrollToFocused({
        containerRef: ref,
        focusedIndex: 0,
        itemSelector: '.item',
        direction: 'horizontal',
        center: false
      }))

      expect(container.scrollLeft).toBe(0)
    })

    it('scrolls right when item is after viewport (center false)', () => {
      const container = createMockContainer({ clientWidth: 800, scrollLeft: 0 })
      const items = [
        createMockItem(container, { offsetLeft: 0, clientWidth: 200 }),
        createMockItem(container, { offsetLeft: 200, clientWidth: 200 }),
        createMockItem(container, { offsetLeft: 900, clientWidth: 200 })
      ]
      container.querySelectorAll.mockReturnValue(items)

      const ref = { current: container as unknown as HTMLElement }

      renderHook(() => useScrollToFocused({
        containerRef: ref,
        focusedIndex: 2,
        itemSelector: '.item',
        direction: 'horizontal',
        center: false
      }))

      expect(container.scrollLeft).toBe(1100 - 800)
    })
  })

  describe('edge cases', () => {
    it('does nothing when container ref is null', () => {
      const ref = { current: null }

      expect(() => {
        renderHook(() => useScrollToFocused({
          containerRef: ref,
          focusedIndex: 0,
          itemSelector: '.item'
        }))
      }).not.toThrow()
    })

    it('does nothing when focused index is null', () => {
      const container = createMockContainer({})
      container.querySelectorAll.mockReturnValue([])

      const ref = { current: container as unknown as HTMLElement }

      expect(() => {
        renderHook(() => useScrollToFocused({
          containerRef: ref,
          focusedIndex: null,
          itemSelector: '.item'
        }))
      }).not.toThrow()
      expect(container.querySelectorAll).not.toHaveBeenCalled()
    })

    it('does nothing when focused item does not exist', () => {
      const container = createMockContainer({})
      container.querySelectorAll.mockReturnValue([])

      const ref = { current: container as unknown as HTMLElement }

      expect(() => {
        renderHook(() => useScrollToFocused({
          containerRef: ref,
          focusedIndex: 5,
          itemSelector: '.item'
        }))
      }).not.toThrow()
    })

    it('uses default direction (vertical) when not specified', () => {
      const container = createMockContainer({ clientHeight: 500 })
      const items = [createMockItem(container, { offsetTop: 300 })]
      container.querySelectorAll.mockReturnValue(items)

      const ref = { current: container as unknown as HTMLElement }

      renderHook(() => useScrollToFocused({
        containerRef: ref,
        focusedIndex: 0,
        itemSelector: '.item'
      }))

      expect(container.scrollTop).toBe(300 - 250 + 50)
    })

    it('uses default center (true) when not specified', () => {
      const container = createMockContainer({ clientHeight: 500 })
      const items = [createMockItem(container, { offsetTop: 300 })]
      container.querySelectorAll.mockReturnValue(items)

      const ref = { current: container as unknown as HTMLElement }

      renderHook(() => useScrollToFocused({
        containerRef: ref,
        focusedIndex: 0,
        itemSelector: '.item'
      }))

      expect(container.scrollTop).toBe(300 - 250 + 50)
    })
  })
})
