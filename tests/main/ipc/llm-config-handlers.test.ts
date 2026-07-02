import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'path'
import { createMockRegistry } from '../helpers/mock-registry'
import type { ILLMProvider } from '../../../src/main/di'

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

const mockConfigure = vi.fn()
const mockResetConfig = vi.fn()
const mockTestConnection = vi.fn()

const mockLLMProvider: ILLMProvider = {
  configure: mockConfigure,
  resetConfig: mockResetConfig,
  chat: vi.fn(),
  testConnection: mockTestConnection,
  chatStream: vi.fn(),
  cancelStream: vi.fn()
}

vi.mock('../../../src/main/secure-config', () => ({
  SecureConfig: {
    save: vi.fn(),
    load: vi.fn().mockReturnValue({ provider: 'test', model: 'test-model', apiKey: 'test-key-1234567890' }),
    exists: vi.fn().mockReturnValue(true)
  },
  SecureLLMConfig: {
    save: vi.fn(),
    load: vi.fn().mockReturnValue({ provider: 'test', model: 'test-model', apiKey: 'test-key-1234567890' }),
    exists: vi.fn().mockReturnValue(true),
    clear: vi.fn()
  },
  generalStore: { exists: vi.fn().mockReturnValue(false) },
  llmStore: { exists: vi.fn().mockReturnValue(true) },
  isLLMConfigKey: vi.fn((key: string) =>
    ['provider', 'apiKey', 'model', 'baseUrl', 'temperature', 'maxTokens'].includes(key)
  )
}))

import { registerLLMConfigHandlers } from '../../../src/main/ipc/llm-config.ipc'
import { SecureLLMConfig } from '../../../src/main/secure-config'

describe('LLM Config IPC Handlers', () => {
  beforeAll(async () => {
    const registry = createMockRegistry({ llmProvider: mockLLMProvider })
    registerLLMConfigHandlers(mockIpcMain as any, registry)
  })

  afterAll(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('llm:config', () => {
    it('should configure LLM and save to SecureLLMConfig', async () => {
      const handler = getRegisteredHandler('llm:config')
      const config = { provider: 'openai', apiKey: 'sk-test1234567890', model: 'gpt-4' }

      const result = await handler(null, config)
      expect(mockConfigure).toHaveBeenCalledWith(config)
      expect(SecureLLMConfig.save).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('should reject short api key', async () => {
      const handler = getRegisteredHandler('llm:config')
      const config = { provider: 'openai', apiKey: 'short', model: 'gpt-4' }

      await expect(handler(null, config)).rejects.toThrow('API密钥格式无效')
    })

    it('should reject empty provider', async () => {
      const handler = getRegisteredHandler('llm:config')
      const config = { provider: '', apiKey: 'sk-test1234567890', model: 'gpt-4' }

      await expect(handler(null, config)).rejects.toThrow()
    })

    it('should reject empty model', async () => {
      const handler = getRegisteredHandler('llm:config')
      const config = { provider: 'openai', apiKey: 'sk-test1234567890', model: '' }

      await expect(handler(null, config)).rejects.toThrow()
    })
  })

  describe('llm:is-configured', () => {
    it('should return config existence', async () => {
      const handler = getRegisteredHandler('llm:is-configured')

      const result = await handler(null)
      expect(SecureLLMConfig.exists).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false when no config exists', async () => {
      vi.mocked(SecureLLMConfig.exists).mockReturnValueOnce(false)
      const handler = getRegisteredHandler('llm:is-configured')

      const result = await handler(null)
      expect(result).toBe(false)
    })
  })

  describe('llm:config-meta', () => {
    it('should return config metadata without apiKey', async () => {
      const handler = getRegisteredHandler('llm:config-meta')

      const result = await handler(null)
      expect(result).toBeDefined()
      expect(result.hasKey).toBe(true)
      expect(result.apiKey).toBeUndefined()
    })

    it('should return null when no config exists', async () => {
      vi.mocked(SecureLLMConfig.load).mockReturnValueOnce(null)
      const handler = getRegisteredHandler('llm:config-meta')

      const result = await handler(null)
      expect(result).toBeNull()
    })
  })

  describe('llm:test-connection', () => {
    it('should call llm.testConnection with valid config', async () => {
      mockTestConnection.mockResolvedValue(true)
      const handler = getRegisteredHandler('llm:test-connection')
      const config = { provider: 'openai', apiKey: 'sk-test1234567890', model: 'gpt-4' }

      const result = await handler(null, config)
      expect(mockTestConnection).toHaveBeenCalledWith(config)
      expect(result.success).toBe(true)
      expect(result.connected).toBe(true)
    })

    it('should reject short api key', async () => {
      const handler = getRegisteredHandler('llm:test-connection')
      const config = { provider: 'openai', apiKey: 'short', model: 'gpt-4' }

      await expect(handler(null, config)).rejects.toThrow('API密钥格式无效')
    })

    it('should reject empty provider', async () => {
      const handler = getRegisteredHandler('llm:test-connection')
      const config = { provider: '', apiKey: 'sk-test1234567890', model: 'gpt-4' }

      await expect(handler(null, config)).rejects.toThrow()
    })

    it('should reject empty model', async () => {
      const handler = getRegisteredHandler('llm:test-connection')
      const config = { provider: 'openai', apiKey: 'sk-test1234567890', model: '' }

      await expect(handler(null, config)).rejects.toThrow()
    })
  })
})
