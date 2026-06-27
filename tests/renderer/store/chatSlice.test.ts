// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { storageService } from '@renderer/services'
import { createChatSlice } from '../../../src/renderer/store/chatSlice'

vi.mock('@renderer/services', () => ({
  storageService: {
    set: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(true)
  }
}))

const mockedStorageService = vi.mocked(storageService)

// Mock localStorage for jsdom environment
const mockStorage: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value
    },
    removeItem: (key: string) => {
      delete mockStorage[key]
    },
    clear: () => {
      Object.keys(mockStorage).forEach(k => delete mockStorage[k])
    }
  },
  writable: true
})

function createTestSlice(set: ReturnType<typeof vi.fn>, get?: () => any) {
  const getFn =
    get ?? vi.fn(() => ({ messages: [], isStreaming: false, streamingContent: '', streamingMessageId: null }))
  return createChatSlice(set as any, getFn as any, vi.fn() as any)
}

describe('ChatSlice', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k])
    vi.clearAllMocks()
    mockedStorageService.set.mockResolvedValue(true)
    mockedStorageService.get.mockResolvedValue(null)
    mockedStorageService.remove.mockResolvedValue(true)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should load empty messages initially', () => {
    const set = vi.fn()
    const slice = createTestSlice(set)
    expect(slice.messages).toEqual([])
    expect(slice.isStreaming).toBe(false)
  })

  it('should add a message', () => {
    const set = vi.fn()
    const slice = createTestSlice(set)
    const msg = slice.addMessage({ role: 'user', content: 'Hello' })
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Hello')
    expect(msg.id).toBeDefined()
    expect(msg.timestamp).toBeDefined()
  })

  it('should update a message', () => {
    const set = vi.fn()
    const slice = createTestSlice(set)
    const msg = slice.addMessage({ role: 'user', content: 'Hello' })
    slice.updateMessage(msg.id, { content: 'Updated' })
    expect(set).toHaveBeenCalled()
  })

  it('should append to a non-streaming message', () => {
    const currentMessages = [] as any[]
    const get = () => ({
      messages: currentMessages,
      isStreaming: false,
      streamingContent: '',
      streamingMessageId: null
    })
    const set = vi.fn((fn: any) => {
      const r = fn({ messages: currentMessages })
      currentMessages.push(...(r.messages?.slice(currentMessages.length) ?? []))
    })
    const slice = createTestSlice(set, get)
    const msg = slice.addMessage({ role: 'user', content: 'Hello' })
    slice.appendToMessage(msg.id, ' World')
    expect(set).toHaveBeenCalled()
  })

  it('should append to a streaming message efficiently', () => {
    let messages = [] as any[]
    const msg = { id: 'stream-1', role: 'assistant' as const, content: '' }
    messages = [msg]
    const get = () => ({ messages, isStreaming: true, streamingContent: '', streamingMessageId: 'stream-1' })
    const set = vi.fn()
    const slice = createTestSlice(set, get)
    slice.appendToMessage('stream-1', ' Hello')
    expect(set).toHaveBeenCalledWith({ streamingContent: ' Hello' })
  })

  it('should set streaming state', () => {
    const set = vi.fn()
    const slice = createTestSlice(set)
    slice.setStreaming(true)
    expect(set).toHaveBeenCalled()
  })

  it('should clear messages', () => {
    const set = vi.fn()
    const slice = createTestSlice(set)
    slice.addMessage({ role: 'user', content: 'Hello' })
    slice.clearMessages()
    expect(set).toHaveBeenCalledWith({ messages: [], streamingContent: '', streamingMessageId: null })
  })

  it('should add skill invocation', () => {
    const set = vi.fn()
    const slice = createTestSlice(set)
    const msg = slice.addMessage({ role: 'assistant', content: '' })
    slice.addSkillInvocation(msg.id, {
      skillName: 'test-skill',
      input: 'test',
      output: '',
      duration: 0,
      status: 'running'
    })
    expect(set).toHaveBeenCalled()
  })
})
