// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'

const serviceModules = [
  '@renderer/services/chapterService',
  '@renderer/services/characterService',
  '@renderer/services/checkpointService',
  '@renderer/services/exportService',
  '@renderer/services/learningService',
  '@renderer/services/llmService',
  '@renderer/services/novelService',
  '@renderer/services/outlineService',
  '@renderer/services/plotStructureService',
  '@renderer/services/projectService',
  '@renderer/services/skillService',
  '@renderer/services/storageService',
  '@renderer/services/worldService'
]

describe('Service availability', () => {
  it('should throw when window.aiscribe is unavailable', async () => {
    const original = window.aiscribe
    Object.defineProperty(window, 'aiscribe', {
      value: undefined,
      configurable: true,
      writable: true
    })

    for (const modulePath of serviceModules) {
      vi.resetModules()
      await expect(import(modulePath)).rejects.toThrow('window.aiscribe is not available')
    }

    Object.defineProperty(window, 'aiscribe', {
      value: original,
      configurable: true,
      writable: true
    })
  })

  it('should load memoryService with stub when window.aiscribe is unavailable', async () => {
    const original = window.aiscribe
    Object.defineProperty(window, 'aiscribe', {
      value: undefined,
      configurable: true,
      writable: true
    })

    vi.resetModules()
    const mod = await import('@renderer/services/memoryService')
    expect(mod.memoryService).toBeDefined()
    expect(mod.memoryService.getMemoryUsage).toBeInstanceOf(Function)

    Object.defineProperty(window, 'aiscribe', {
      value: original,
      configurable: true,
      writable: true
    })
  })
})
