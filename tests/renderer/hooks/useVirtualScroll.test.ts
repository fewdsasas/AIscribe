import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import { computeVisibleRange, useVirtualScroll } from '@renderer/hooks/useVirtualScroll'

describe('computeVisibleRange', () => {
  it('should compute range at scroll position 0', () => {
    const result = computeVisibleRange(0, 400, 100, 50, 5)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(13)
    expect(result.totalHeight).toBe(5000)
    expect(result.topOffset).toBe(0)
  })

  it('should compute range at mid-scroll', () => {
    const result = computeVisibleRange(500, 400, 100, 50, 5)
    expect(result.startIndex).toBe(5)
    expect(result.endIndex).toBe(23)
    expect(result.topOffset).toBe(250)
  })

  it('should handle small item count', () => {
    const result = computeVisibleRange(0, 400, 5, 50, 5)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(4)
    expect(result.totalHeight).toBe(250)
  })

  it('should handle zero items', () => {
    const result = computeVisibleRange(0, 400, 0, 50, 5)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(-1)
    expect(result.totalHeight).toBe(0)
  })

  it('should respect overscan', () => {
    const noOverscan = computeVisibleRange(200, 400, 100, 50, 0)
    expect(noOverscan.startIndex).toBe(4)
    expect(noOverscan.endIndex).toBe(12)

    const largeOverscan = computeVisibleRange(200, 400, 100, 50, 10)
    expect(largeOverscan.startIndex).toBe(0)
    expect(largeOverscan.endIndex).toBe(22)
  })

  it('should not go below startIndex 0', () => {
    const result = computeVisibleRange(100, 400, 100, 50, 10)
    expect(result.startIndex).toBe(0)
  })
})

describe('useVirtualScroll', () => {
  let resizeObserverMock: {
    observe: Mock<(element: Element) => void>
    disconnect: Mock<() => void>
    trigger: (height: number) => void
  } | null = null

  beforeEach(() => {
    resizeObserverMock = {
      observe: vi.fn<(element: Element) => void>(),
      disconnect: vi.fn<() => void>(),
      trigger: () => {}
    }

    class MockResizeObserver {
      callback: (entries: { contentRect: { height: number } }[]) => void

      constructor(callback: (entries: { contentRect: { height: number } }[]) => void) {
        this.callback = callback
        if (resizeObserverMock) {
          resizeObserverMock.trigger = (height: number) => {
            this.callback([{ contentRect: { height } }])
          }
        }
      }

      observe(element: Element) {
        resizeObserverMock?.observe(element)
      }

      disconnect() {
        resizeObserverMock?.disconnect()
      }
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return initial range and container props', () => {
    const { result } = renderHook(() => useVirtualScroll(100, { itemHeight: 50 }))

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(13)
    expect(result.current.totalHeight).toBe(5000)
    expect(result.current.topOffset).toBe(0)
    expect(result.current.visibleHeight).toBe(400)
    expect(result.current.containerProps.style).toEqual({ overflow: 'auto', height: '100%' })
  })

  it('should use provided container height and skip ResizeObserver', () => {
    const { result } = renderHook(() => useVirtualScroll(100, { itemHeight: 50, containerHeight: 300 }))

    expect(result.current.visibleHeight).toBe(300)
    expect(result.current.containerProps.style).toEqual({ overflow: 'auto', height: 300 })
    expect(resizeObserverMock?.observe).not.toHaveBeenCalled()
  })

  it('should update scrollTop on scroll', () => {
    const { result } = renderHook(() => useVirtualScroll(100, { itemHeight: 50 }))

    act(() => {
      result.current.containerProps.onScroll?.({
        currentTarget: { scrollTop: 250 }
      } as unknown as React.UIEvent<HTMLDivElement>)
    })

    expect(result.current.startIndex).toBe(0)
    expect(result.current.topOffset).toBe(0)
  })

  it('should observe container via ResizeObserver when no containerHeight is provided', () => {
    function TestComponent() {
      const { containerProps } = useVirtualScroll(100, { itemHeight: 50 })
      return React.createElement('div', {
        'data-testid': 'scroll-container',
        ...containerProps,
        style: { height: 400 }
      })
    }

    render(React.createElement(TestComponent))

    expect(resizeObserverMock?.observe).toHaveBeenCalled()
  })

  it('should disconnect ResizeObserver on unmount', () => {
    const { unmount } = renderHook(() => useVirtualScroll(100, { itemHeight: 50 }))

    unmount()

    expect(resizeObserverMock?.disconnect).toHaveBeenCalled()
  })

  it('should update visibleHeight when ResizeObserver fires', () => {
    function TestComponent() {
      const { containerProps, visibleHeight } = useVirtualScroll(100, { itemHeight: 50 })
      return React.createElement(
        'div',
        {
          'data-testid': 'scroll-container',
          ...containerProps,
          style: { height: 400 }
        },
        visibleHeight
      )
    }

    render(React.createElement(TestComponent))

    expect(resizeObserverMock?.observe).toHaveBeenCalled()

    act(() => {
      resizeObserverMock?.trigger(600)
    })

    expect(screen.getByTestId('scroll-container').textContent).toBe('600')
  })
})
