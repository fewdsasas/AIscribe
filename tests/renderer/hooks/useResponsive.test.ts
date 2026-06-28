// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyBreakpoint, useResponsive } from '@renderer/hooks/useResponsive'

describe('classifyBreakpoint', () => {
  it('should classify mobile width (< 768)', () => {
    const result = classifyBreakpoint(500)
    expect(result.isMobile).toBe(true)
    expect(result.isTablet).toBe(false)
    expect(result.isDesktop).toBe(false)
    expect(result.isSmall).toBe(true)
    expect(result.isLarge).toBe(false)
  })

  it('should classify tablet width (768-1023)', () => {
    const result = classifyBreakpoint(900)
    expect(result.isMobile).toBe(false)
    expect(result.isTablet).toBe(true)
    expect(result.isDesktop).toBe(false)
    expect(result.isLarge).toBe(false)
  })

  it('should classify desktop width (>= 1024)', () => {
    const result = classifyBreakpoint(1200)
    expect(result.isMobile).toBe(false)
    expect(result.isTablet).toBe(false)
    expect(result.isDesktop).toBe(true)
    expect(result.isLarge).toBe(false)
  })

  it('should classify large width (>= 1280)', () => {
    const result = classifyBreakpoint(1400)
    expect(result.isDesktop).toBe(true)
    expect(result.isLarge).toBe(true)
  })

  it('should classify small width (< 640)', () => {
    const result = classifyBreakpoint(300)
    expect(result.isSmall).toBe(true)
    expect(result.isMobile).toBe(true)
  })

  it('should handle exact boundary values', () => {
    expect(classifyBreakpoint(640).isSmall).toBe(false)
    expect(classifyBreakpoint(639).isSmall).toBe(true)
    expect(classifyBreakpoint(768).isMobile).toBe(false)
    expect(classifyBreakpoint(767).isMobile).toBe(true)
    expect(classifyBreakpoint(1024).isDesktop).toBe(true)
    expect(classifyBreakpoint(1023).isDesktop).toBe(false)
    expect(classifyBreakpoint(1280).isLarge).toBe(true)
    expect(classifyBreakpoint(1279).isLarge).toBe(false)
  })
})

describe('useResponsive', () => {
  let rafCallbacks: Array<FrameRequestCallback> = []
  let rafId = 0

  beforeEach(() => {
    rafCallbacks = []
    rafId = 0

    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      rafCallbacks.push(callback)
      return ++rafId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
      rafCallbacks = rafCallbacks.filter((_, index) => index + 1 !== id)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function flushRaf() {
    const callbacks = [...rafCallbacks]
    rafCallbacks = []
    callbacks.forEach(cb => cb(performance.now()))
  }

  it('should initialize with current window size', () => {
    const { result } = renderHook(() => useResponsive())

    expect(result.current.width).toBe(1200)
    expect(result.current.height).toBe(800)
    expect(result.current.isDesktop).toBe(true)
  })

  it('should update state on window resize', () => {
    const { result } = renderHook(() => useResponsive())

    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)

    act(() => {
      window.dispatchEvent(new Event('resize'))
      flushRaf()
    })

    expect(result.current.width).toBe(500)
    expect(result.current.height).toBe(600)
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isSmall).toBe(true)
  })

  it('should throttle resize with requestAnimationFrame', () => {
    renderHook(() => useResponsive())

    act(() => {
      window.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new Event('resize'))
    })

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it('should remove listener and cancel raf on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useResponsive())

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })
})
