import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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

const mockChat = vi
  .fn()
  .mockResolvedValue({ content: 'Test response', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } })
const mockChatStream = vi.fn().mockResolvedValue(undefined)
const mockCancelStream = vi.fn().mockReturnValue(true)
const mockConfigure = vi.fn()
const mockResetConfig = vi.fn()

const mockLLMProvider: ILLMProvider = {
  configure: mockConfigure,
  resetConfig: mockResetConfig,
  chat: mockChat,
  chatStream: mockChatStream,
  cancelStream: mockCancelStream
}

import { registerChatHandlers } from '../../../src/main/ipc/chat.ipc'
import { IPC_CHANNELS } from '../../../src/shared/types/ipc'

describe('Chat IPC Handlers', () => {
  beforeAll(async () => {
    const registry = createMockRegistry({ llmProvider: mockLLMProvider })
    registerChatHandlers(mockIpcMain as any, registry)
  })

  afterAll(() => {})

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('llm:chat', () => {
    it('should call llm.chat with request', async () => {
      const handler = getRegisteredHandler('llm:chat')
      const request = { messages: [{ role: 'user', content: 'Hello' }] }

      const result = await handler(null, request)
      expect(mockChat).toHaveBeenCalledWith(request)
      expect(result).toBeDefined()
    })

    it('should reject empty messages', async () => {
      const handler = getRegisteredHandler('llm:chat')
      await expect(handler(null, { messages: [] })).rejects.toThrow('对话消息不能为空')
    })
  })

  describe('llm:chat-stream', () => {
    it('should stream chat via event sender', async () => {
      const handler = getRegisteredHandler('llm:chat-stream')
      const mockSend = vi.fn()
      const mockEvent = {
        sender: {
          send: mockSend,
          isDestroyed: () => false
        }
      }

      const request = { messages: [{ role: 'user', content: 'Stream test' }] }
      const result = await handler(mockEvent, request)

      expect(mockChatStream).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should reject invalid message format', async () => {
      const handler = getRegisteredHandler('llm:chat-stream')
      const mockEvent = { sender: { send: vi.fn(), isDestroyed: () => false } }

      await expect(handler(mockEvent, { messages: [{ invalid: true }] })).rejects.toThrow(
        '每条消息必须包含 role 和 content 字符串'
      )
    })

    it('should emit llm:error on stream failure', async () => {
      const handler = getRegisteredHandler('llm:chat-stream')
      const mockSend = vi.fn()
      const mockEvent = {
        sender: {
          send: mockSend,
          isDestroyed: () => false
        }
      }

      const errorMessage = 'Stream processing failed'
      vi.mocked(mockChatStream).mockImplementationOnce(async (_request, callbacks) => {
        callbacks.onError(errorMessage)
      })

      const request = { messages: [{ role: 'user', content: 'Test' }] }
      const result = await handler(mockEvent, request)

      expect(mockSend).toHaveBeenCalledWith(IPC_CHANNELS.LLM_ERROR, { message: errorMessage })
      expect(result).toBe(true)
    })

    it('should handle API key leakage in error messages', async () => {
      const handler = getRegisteredHandler('llm:chat-stream')
      const mockSend = vi.fn()
      const mockEvent = {
        sender: {
          send: mockSend,
          isDestroyed: () => false
        }
      }

      const apiKey = 'sk-abc123xyz789abc123'
      vi.mocked(mockChatStream).mockImplementationOnce(async (_request, callbacks) => {
        callbacks.onError(`Authentication failed: ${apiKey}`)
      })

      const request = { messages: [{ role: 'user', content: 'Test' }] }
      await handler(mockEvent, request)

      expect(mockSend).toHaveBeenCalledWith(
        IPC_CHANNELS.LLM_ERROR,
        expect.objectContaining({
          message: expect.not.stringContaining(apiKey)
        })
      )
    })

    it('should handle sender.isDestroyed during stream', async () => {
      const handler = getRegisteredHandler('llm:chat-stream')
      const mockSend = vi.fn()
      const mockEvent = {
        sender: {
          send: mockSend,
          isDestroyed: () => true
        }
      }

      vi.mocked(mockChatStream).mockImplementationOnce(async (_request, callbacks) => {
        callbacks.onChunk('test chunk')
        callbacks.onDone({ promptTokens: 10, completionTokens: 5, totalTokens: 15 })
        callbacks.onError('test error')
      })

      const request = { messages: [{ role: 'user', content: 'Test' }] }
      const result = await handler(mockEvent, request)

      expect(mockSend).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })
})
