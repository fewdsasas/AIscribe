import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'path'
import { registerStorageHandlers } from '../../../src/main/ipc/storage.ipc'
import { SecureConfig } from '../../../src/main/secure-config'
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
    getPath: () => path.join(__dirname, '../../temp/storage-test'),
    on: () => {}
  }
}))

let mockData: Record<string, unknown> = {}
vi.mock('../../../src/main/secure-config', () => ({
  SecureConfig: {
    load: vi.fn(() => ({ ...mockData })),
    save: vi.fn((data: Record<string, unknown>) => {
      mockData = { ...data }
    }),
    exists: vi.fn(() => true),
    clear: vi.fn()
  },
  SecureLLMConfig: {
    save: vi.fn(),
    load: vi.fn(),
    exists: vi.fn(() => true),
    clear: vi.fn()
  },
  generalStore: { exists: vi.fn(() => false) },
  llmStore: { exists: vi.fn(() => true) },
  isLLMConfigKey: vi.fn((key: string) =>
    ['provider', 'apiKey', 'model', 'baseUrl', 'temperature', 'maxTokens'].includes(key)
  )
}))

vi.mock('../../../src/main/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

describe('Storage IPC Handlers', () => {
  beforeAll(() => {
    registerStorageHandlers(mockIpcMain as any, createMockRegistry())
  })

  beforeEach(() => {
    mockData = {}
    vi.clearAllMocks()
  })

  describe('storage:encryptSet', () => {
    it('should encrypt and store a value', async () => {
      const handler = getRegisteredHandler('storage:encryptSet')
      const result = await handler(null, 'testKey', 'testValue')

      expect(result).toBe(true)
      expect(SecureConfig.save).toHaveBeenCalled()
    })

    it('should reject LLM config keys', async () => {
      const handler = getRegisteredHandler('storage:encryptSet')
      await expect(handler(null, 'apiKey', 'sk-test123')).rejects.toThrow('不允许通过通用存储设置 LLM 配置')
    })

    it('should reject invalid key names', async () => {
      const handler = getRegisteredHandler('storage:encryptSet')
      await expect(handler(null, '123invalid', 'test')).rejects.toThrow()
    })

    it('should reject empty key', async () => {
      const handler = getRegisteredHandler('storage:encryptSet')
      await expect(handler(null, '', 'test')).rejects.toThrow()
    })
  })

  describe('storage:encryptGet', () => {
    it('should retrieve a stored value', async () => {
      mockData = { testKey: 'testValue' }
      const handler = getRegisteredHandler('storage:encryptGet')
      const result = await handler(null, 'testKey')

      expect(result).toBe('testValue')
    })

    it('should return null for non-existent key', async () => {
      mockData = {}
      const handler = getRegisteredHandler('storage:encryptGet')
      const result = await handler(null, 'nonExistent')

      expect(result).toBeNull()
    })

    it('should return null when data is not an object', async () => {
      vi.mocked(SecureConfig.load).mockReturnValueOnce('invalid' as any)
      const handler = getRegisteredHandler('storage:encryptGet')
      const result = await handler(null, 'testKey')

      expect(result).toBeNull()
    })

    it('should reject LLM config keys', async () => {
      const handler = getRegisteredHandler('storage:encryptGet')
      await expect(handler(null, 'apiKey')).rejects.toThrow('不允许通过通用存储读取 LLM 配置')
    })
  })

  describe('storage:encryptRemove', () => {
    it('should remove a stored key', async () => {
      mockData = { testKey: 'value', otherKey: 'other' }
      const handler = getRegisteredHandler('storage:encryptRemove')
      const result = await handler(null, 'testKey')

      expect(result).toBe(true)
      expect(SecureConfig.save).toHaveBeenCalled()
    })

    it('should handle empty data gracefully', async () => {
      mockData = {}
      const handler = getRegisteredHandler('storage:encryptRemove')
      const result = await handler(null, 'testKey')

      expect(result).toBe(true)
    })

    it('should reject LLM config keys', async () => {
      const handler = getRegisteredHandler('storage:encryptRemove')
      await expect(handler(null, 'apiKey')).rejects.toThrow('不允许通过通用存储删除 LLM 配置')
    })
  })
})
