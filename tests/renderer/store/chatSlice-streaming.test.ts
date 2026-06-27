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

function createTestSlice(set: ReturnType<typeof vi.fn>, get?: () => any) {
  const getFn =
    get ?? vi.fn(() => ({ messages: [], isStreaming: false, streamingContent: '', streamingMessageId: null }))
  return createChatSlice(set as any, getFn as any, vi.fn() as any)
}

describe('chatSlice - streaming', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockedStorageService.set.mockResolvedValue(true)
    mockedStorageService.get.mockResolvedValue(null)
    mockedStorageService.remove.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should flush streaming content into message when setStreaming(false)', () => {
    const set = vi.fn((fn: any) => {
      if (typeof fn === 'function') {
        const state = { messages: [streamMsg], isStreaming: true, streamingContent: '', streamingMessageId: 's1' }
        fn(state)
      }
    })
    const streamMsg = { id: 's1', role: 'assistant' as const, content: 'Partial ', timestamp: '' }
    const get = () => ({
      messages: [streamMsg],
      isStreaming: true,
      streamingContent: 'content',
      streamingMessageId: 's1'
    })
    const slice = createTestSlice(set, get)
    slice.setStreaming(false)
    expect(set).toHaveBeenCalled()
  })

  it('should call updateSkillInvocation correctly', () => {
    const messages = [
      {
        id: 'm1',
        role: 'assistant' as const,
        content: '',
        timestamp: '',
        skillInvocations: [{ skillName: 's1', input: 'in', output: 'out', duration: 1, status: 'running' as const }]
      }
    ]
    const set = vi.fn((fn: any) => {
      fn({ messages })
    })
    const get = () => ({ messages, isStreaming: false, streamingContent: '', streamingMessageId: null })
    const slice = createTestSlice(set, get)
    slice.updateSkillInvocation('m1', 's1', { status: 'completed', duration: 3.5, output: 'done' })
    expect(set).toHaveBeenCalled()
  })

  it('should loadFromStorage from secureStorage', async () => {
    mockedStorageService.get.mockResolvedValue(
      JSON.stringify([{ id: 'm1', role: 'user', content: 'hi', timestamp: 'now' }])
    )
    const set = vi.fn()
    const slice = createTestSlice(set)
    await slice.loadFromStorage()
    expect(set).toHaveBeenCalled()
    expect(mockedStorageService.get).toHaveBeenCalledWith('aiscribe-chat-history')
  })

  it('should loadFromStorage fallback to localStorage', async () => {
    mockedStorageService.get.mockResolvedValue(null)
    localStorage.setItem(
      'aiscribe-chat-history',
      JSON.stringify([{ id: 'm2', role: 'user', content: 'hello', timestamp: 'now' }])
    )
    const set = vi.fn()
    const slice = createTestSlice(set)
    await slice.loadFromStorage()
    expect(set).toHaveBeenCalled()
  })

  it('should clear localStorage and secureStorage on clearMessages', () => {
    const set = vi.fn()
    const slice = createTestSlice(set)
    slice.clearMessages()
    expect(set).toHaveBeenCalledWith({ messages: [], streamingContent: '', streamingMessageId: null })
    expect(mockedStorageService.remove).toHaveBeenCalledWith('aiscribe-chat-history')
  })
})
