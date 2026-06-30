// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMemoryMonitor } from '@renderer/hooks/useMemoryMonitor'
import { memoryService } from '@renderer/services/memoryService'

vi.mock('@renderer/services/memoryService', () => ({
  memoryService: {
    getMemoryUsage: vi.fn()
  }
}))

vi.mock('@renderer/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn()
  }
}))

const mockedMemoryService = vi.mocked(memoryService)

describe('useMemoryMonitor', () => {
  const originalPerformanceMemory = (performance as unknown as { memory?: object }).memory

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      },
      configurable: true
    })
    mockedMemoryService.getMemoryUsage.mockResolvedValue({
      rss: 30 * 1024 * 1024,
      heapTotal: 20 * 1024 * 1024,
      heapUsed: 10 * 1024 * 1024,
      external: 5 * 1024 * 1024,
      arrayBuffers: 0,
      dbSize: 1 * 1024 * 1024,
      timestamp: Date.now()
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    Object.defineProperty(performance, 'memory', {
      value: originalPerformanceMemory,
      configurable: true
    })
  })

  it('should take mount snapshot and start interval', async () => {
    renderHook(() => useMemoryMonitor('TestView'))

    await vi.advanceTimersByTimeAsync(100)
    expect(mockedMemoryService.getMemoryUsage).toHaveBeenCalled()
  })

  it('should take periodic samples', async () => {
    renderHook(() => useMemoryMonitor('TestView'))

    await vi.advanceTimersByTimeAsync(100)
    const callCountAfterMount = mockedMemoryService.getMemoryUsage.mock.calls.length

    await vi.advanceTimersByTimeAsync(3100)
    expect(mockedMemoryService.getMemoryUsage.mock.calls.length).toBeGreaterThan(callCountAfterMount)
  })

  it('should handle IPC failures gracefully', async () => {
    mockedMemoryService.getMemoryUsage.mockRejectedValue(new Error('IPC unavailable'))

    renderHook(() => useMemoryMonitor('TestView'))

    await vi.advanceTimersByTimeAsync(100)
    expect(mockedMemoryService.getMemoryUsage).toHaveBeenCalled()
  })

  it('should handle missing performance.memory', async () => {
    Object.defineProperty(performance, 'memory', {
      value: undefined,
      configurable: true
    })

    renderHook(() => useMemoryMonitor('TestView'))

    await vi.advanceTimersByTimeAsync(100)
    expect(mockedMemoryService.getMemoryUsage).toHaveBeenCalled()
  })

  it('should clean up interval on unmount', async () => {
    const { unmount } = renderHook(() => useMemoryMonitor('TestView'))

    await vi.advanceTimersByTimeAsync(100)
    unmount()

    const callCountAfterUnmount = mockedMemoryService.getMemoryUsage.mock.calls.length
    await vi.advanceTimersByTimeAsync(3100)
    expect(mockedMemoryService.getMemoryUsage.mock.calls.length).toBe(callCountAfterUnmount)
  })

  it('should detect memory leak on unmount', async () => {
    const { logger } = await import('@renderer/utils/logger')

    // Mount with low heap
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 20 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      },
      configurable: true
    })

    const { unmount } = renderHook(() => useMemoryMonitor('LeakView'))
    await vi.advanceTimersByTimeAsync(100)

    // Simulate heap growth before unmount
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 20 * 1024 * 1024,
        totalJSHeapSize: 30 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      },
      configurable: true
    })

    unmount()
    await vi.advanceTimersByTimeAsync(100)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('should report normal memory release on unmount', async () => {
    const { logger } = await import('@renderer/utils/logger')

    const { unmount } = renderHook(() => useMemoryMonitor('NormalView'))
    await vi.advanceTimersByTimeAsync(100)
    unmount()

    await vi.advanceTimersByTimeAsync(100)
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('内存释放正常'))
  })
})
