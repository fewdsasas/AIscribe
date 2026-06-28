import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'path'
import { createMockRegistry } from '../helpers/mock-registry'

const mockHandlers = new Map<string, Function>()
const mockIpcMain = {
  handle: (channel: string, handler: Function) => {
    mockHandlers.set(channel, handler)
  }
}

function getRegisteredHandler(channel: string): Function {
  const handler = mockHandlers.get(channel)
  if (!handler) throw new Error(`handler ${channel} not registered`)
  return handler
}

vi.mock('electron', () => ({
  app: {
    getPath: () => path.join(__dirname, '../../temp'),
    on: () => {}
  }
}))

import { registerMonitorHandlers } from '../../../src/main/ipc/monitor.ipc'

describe('Monitor IPC Handlers', () => {
  beforeEach(() => {
    mockHandlers.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should register monitor:memory-usage handler', () => {
    const registry = createMockRegistry()
    registerMonitorHandlers(mockIpcMain as any, registry)
    const handler = getRegisteredHandler('monitor:memory-usage')
    expect(handler).toBeDefined()
  })

  it('should return memory usage metrics', async () => {
    const registry = createMockRegistry()
    registerMonitorHandlers(mockIpcMain as any, registry)
    const handler = getRegisteredHandler('monitor:memory-usage')

    const result = await handler(null)

    expect(result).toHaveProperty('rss')
    expect(result).toHaveProperty('heapTotal')
    expect(result).toHaveProperty('heapUsed')
    expect(result).toHaveProperty('external')
    expect(result).toHaveProperty('arrayBuffers')
    expect(result).toHaveProperty('dbSize')
    expect(result).toHaveProperty('timestamp')
    expect(typeof result.timestamp).toBe('number')
  })

  it('should handle fs.stat errors gracefully', async () => {
    vi.spyOn(require('fs'), 'existsSync').mockReturnValue(true)
    vi.spyOn(require('fs'), 'statSync').mockImplementation(() => {
      throw new Error('stat failed')
    })

    const registry = createMockRegistry()
    registerMonitorHandlers(mockIpcMain as any, registry)
    const handler = getRegisteredHandler('monitor:memory-usage')

    const result = await handler(null)
    expect(result.dbSize).toBe(0)
  })

  it('should return dbSize 0 when database file does not exist', async () => {
    vi.spyOn(require('fs'), 'existsSync').mockReturnValue(false)

    const registry = createMockRegistry()
    registerMonitorHandlers(mockIpcMain as any, registry)
    const handler = getRegisteredHandler('monitor:memory-usage')

    const result = await handler(null)
    expect(result.dbSize).toBe(0)
  })

  it('should clear existing monitor timer on re-registration', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    const registry = createMockRegistry()
    registerMonitorHandlers(mockIpcMain as any, registry)
    registerMonitorHandlers(mockIpcMain as any, registry)

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('should warn when heap usage exceeds threshold', async () => {
    const { logger } = await import('../../../src/main/utils/logger')
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    const memoryUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 0,
      heapTotal: 0,
      heapUsed: 600 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0
    } as NodeJS.MemoryUsage)

    const registry = createMockRegistry()
    registerMonitorHandlers(mockIpcMain as any, registry)

    vi.advanceTimersByTime(60_000)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('exceeded threshold'))

    warnSpy.mockRestore()
    memoryUsageSpy.mockRestore()
    vi.useRealTimers()
  })
})
