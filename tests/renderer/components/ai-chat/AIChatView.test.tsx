// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AIChatView } from '@renderer/components/ai-chat/AIChatView'
import { learningService, llmService, storageService } from '@renderer/services'
import { useAppStore } from '@renderer/store'
import type { ChatMessage } from '@renderer/store'

const mockCallbacks = vi.hoisted(() => ({
  chunk: [] as ((chunk: string) => void)[],
  done: [] as (() => void)[],
  error: [] as ((err: string) => void)[]
}))

vi.mock('@renderer/services', () => ({
  llmService: {
    isConfigured: vi.fn(),
    startStream: vi.fn(),
    cancelStream: vi.fn().mockResolvedValue(true),
    onChunk: vi.fn((cb: (chunk: string) => void) => {
      mockCallbacks.chunk.push(cb)
    }),
    onDone: vi.fn((cb: () => void) => {
      mockCallbacks.done.push(cb)
    }),
    onError: vi.fn((cb: (err: string) => void) => {
      mockCallbacks.error.push(cb)
    }),
    removeListeners: vi.fn(() => {
      mockCallbacks.chunk = []
      mockCallbacks.done = []
      mockCallbacks.error = []
    }),
    __triggerChunk: (chunk: string) => mockCallbacks.chunk.forEach(cb => cb(chunk)),
    __triggerDone: () => mockCallbacks.done.forEach(cb => cb()),
    __triggerError: (err: string) => mockCallbacks.error.forEach(cb => cb(err))
  },
  learningService: {
    analyze: vi.fn(),
    record: vi.fn()
  },
  storageService: {
    set: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(true)
  }
}))

vi.mock('@renderer/components/ai-chat/ChatMessage', () => ({
  ChatMessage: vi.fn(({ message }: { message: ChatMessage }) => <div data-testid="chat-message">{message.content}</div>)
}))

vi.mock('@renderer/components/ai-chat/ChatInput', () => ({
  ChatInput: React.forwardRef(
    (
      { onSend }: { onSend: (text: string) => void },
      ref: React.Ref<{ setText: (text: string) => void; focus: () => void }>
    ) => {
      const [text, setText] = React.useState('hello')
      React.useImperativeHandle(ref, () => ({
        setText: (value: string) => setText(value),
        focus: () => {}
      }))
      return (
        <div data-testid="chat-input">
          <input data-testid="chat-input-field" value={text} onChange={e => setText(e.target.value)} />
          <button data-testid="chat-send" onClick={() => onSend(text)}>
            Send
          </button>
        </div>
      )
    }
  )
}))

const mockedLLMService = vi.mocked(llmService)
const mockedLearningService = vi.mocked(learningService)
const mockedStorageService = vi.mocked(storageService)

describe('AIChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCallbacks.chunk = []
    mockCallbacks.done = []
    mockCallbacks.error = []
    useAppStore.setState({ messages: [], isStreaming: false, streamingContent: '', streamingMessageId: null })
    mockedLLMService.isConfigured.mockResolvedValue(false)
    mockedLearningService.analyze.mockResolvedValue({
      patterns: [],
      suggestions: [],
      nextActions: [],
      shortcuts: []
    })
    mockedLearningService.record.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should render empty state', () => {
    render(<AIChatView projectId={null} />)
    expect(screen.getByText('开始与 AI 助手对话')).toBeInTheDocument()
  })

  it('should check llm configuration on mount', async () => {
    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(mockedLLMService.isConfigured).toHaveBeenCalled()
    })
  })

  it('should run learning analysis when projectId changes', async () => {
    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(mockedLearningService.analyze).toHaveBeenCalledWith('p1')
    })
  })

  it('should use simulated response when llm is not configured', async () => {
    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(useAppStore.getState().messages.length).toBeGreaterThan(0)
    })
    expect(mockedLLMService.startStream).not.toHaveBeenCalled()
  })

  it('should use real stream when llm is configured', async () => {
    mockedLLMService.isConfigured.mockResolvedValue(true)
    mockedLLMService.startStream.mockResolvedValue(true)

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(mockedLLMService.startStream).toHaveBeenCalled()
    })
  })

  it('should cancel streaming when stop button clicked', async () => {
    mockedLLMService.isConfigured.mockResolvedValue(true)
    mockedLLMService.startStream.mockReturnValue(new Promise(() => {}))

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(mockedLLMService.startStream).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText('停止')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('停止'))

    await waitFor(() => {
      expect(mockedLLMService.cancelStream).toHaveBeenCalled()
    })
  })

  it('should detect skill from Chinese keyword in simulated mode', async () => {
    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    const input = screen.getByTestId('chat-input-field')
    fireEvent.change(input, { target: { value: '帮我写大纲' } })
    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      const messages = useAppStore.getState().messages
      const lastMessage = messages[messages.length - 1]
      expect(lastMessage.skillInvocations?.length).toBeGreaterThan(0)
      expect(lastMessage.skillInvocations?.[0].skillName).toBe('story-structure')
    })
  })

  it('should stream chunks in real LLM mode', async () => {
    mockedLLMService.isConfigured.mockResolvedValue(true)
    mockedLLMService.startStream.mockResolvedValue(true)

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(mockedLLMService.startStream).toHaveBeenCalled()
    })

    act(() => {
      ;(mockedLLMService as unknown as { __triggerChunk: (chunk: string) => void }).__triggerChunk('Hello')
      ;(mockedLLMService as unknown as { __triggerChunk: (chunk: string) => void }).__triggerChunk(' World')
      ;(mockedLLMService as unknown as { __triggerDone: () => void }).__triggerDone()
    })

    await waitFor(() => {
      const messages = useAppStore.getState().messages
      const lastMessage = messages[messages.length - 1]
      expect(lastMessage.content).toContain('Hello World')
      expect(lastMessage.isStreaming).toBe(false)
    })
  })

  it('should handle real stream error', async () => {
    mockedLLMService.isConfigured.mockResolvedValue(true)
    mockedLLMService.startStream.mockResolvedValue(true)

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(mockedLLMService.startStream).toHaveBeenCalled()
    })

    act(() => {
      ;(mockedLLMService as unknown as { __triggerError: (err: string) => void }).__triggerError('Stream failed')
    })

    await waitFor(() => {
      const messages = useAppStore.getState().messages
      const lastMessage = messages[messages.length - 1]
      expect(lastMessage.content).toContain('Stream failed')
      expect(lastMessage.isStreaming).toBe(false)
    })
  })

  it('should clear messages when clear button clicked', async () => {
    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(useAppStore.getState().messages.length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByText(/清空对话/))

    // Confirm the clear dialog
    await waitFor(() => {
      expect(screen.getByText('清空')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('清空'))

    await waitFor(() => {
      expect(useAppStore.getState().messages.length).toBe(0)
    })
  })

  it('should render learning insights and allow next action click', async () => {
    mockedLearningService.analyze.mockResolvedValue({
      patterns: [],
      suggestions: ['Try adding more conflict', 'Expand character arcs'],
      nextActions: [
        { suggestedSkill: 'story-structure', reason: 'Build framework', confidence: 0.85 },
        { suggestedSkill: 'character-creation', reason: 'Develop hero', confidence: 0.7 }
      ],
      shortcuts: [{ name: 'Quick Outline', description: 'Generate outline', baseSkill: 'story-structure' }]
    })

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByText('💡 Try adding more conflict')).toBeInTheDocument()
    })

    expect(screen.getByText('🤖 story-structure')).toBeInTheDocument()
    expect(screen.getByText('⚡ Quick Outline')).toBeInTheDocument()

    fireEvent.click(screen.getByText('🤖 story-structure'))
  })

  it('should handle learning analysis error gracefully', async () => {
    mockedLearningService.analyze.mockRejectedValue(new Error('analysis failed'))

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    // Component should still render despite analysis error
    expect(screen.getByText('开始与 AI 助手对话')).toBeInTheDocument()
  })

  it('should show load more button with many messages', async () => {
    render(<AIChatView projectId="p1" />)

    // Wait for persisted messages to load (empty in tests) then set many messages
    await waitFor(() => {
      expect(screen.getByText('开始与 AI 助手对话')).toBeInTheDocument()
    })

    const messages = Array.from({ length: 105 }, (_, i) => ({
      id: `msg-${i}`,
      role: 'user' as const,
      content: `message ${i}`,
      timestamp: new Date().toISOString()
    }))
    useAppStore.setState({ messages })

    await waitFor(() => {
      expect(screen.getByText(/查看更早的/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/查看更早的/))

    await waitFor(() => {
      expect(screen.getAllByTestId('chat-message').length).toBeGreaterThan(100)
    })
  })

  it('should show not configured hint when LLM is not configured', async () => {
    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByText(/在「设置 → LLM 配置」中填入 API Key/)).toBeInTheDocument()
    })
  })

  it('should do nothing when sending without a project', async () => {
    render(<AIChatView projectId={null} />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    expect(screen.queryByText(/学习分析进行中/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('chat-send'))

    expect(useAppStore.getState().messages.length).toBe(0)
  })

  it('should recover from isConfigured check failure', async () => {
    mockedLLMService.isConfigured.mockRejectedValueOnce(new Error('config check failed'))

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(mockedLLMService.isConfigured).toHaveBeenCalled()
    })

    expect(screen.getByText('开始与 AI 助手对话')).toBeInTheDocument()
  })

  it('should recover from loadFromStorage failure', async () => {
    mockedStorageService.get.mockRejectedValueOnce(new Error('load failed'))

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(mockedStorageService.get).toHaveBeenCalled()
    })

    expect(screen.getByText('开始与 AI 助手对话')).toBeInTheDocument()
  })

  it('should mark simulated skill invocation as completed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    const input = screen.getByTestId('chat-input-field')
    fireEvent.change(input, { target: { value: '帮我写大纲' } })
    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      const state = useAppStore.getState()
      const assistant = state.messages.find(m => m.role === 'assistant')
      expect(assistant?.skillInvocations?.[0]?.status).toBe('running')
    })

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      const state = useAppStore.getState()
      const assistant = state.messages.find(m => m.role === 'assistant')
      expect(assistant?.skillInvocations?.[0]?.status).toBe('completed')
    })

    vi.useRealTimers()
  })

  it('should append error to partial real stream response', async () => {
    mockedLLMService.isConfigured.mockResolvedValue(true)
    mockedLLMService.startStream.mockResolvedValue(true)

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(mockedLLMService.startStream).toHaveBeenCalled()
    })

    act(() => {
      ;(mockedLLMService as unknown as { __triggerChunk: (chunk: string) => void }).__triggerChunk('partial')
      ;(mockedLLMService as unknown as { __triggerError: (err: string) => void }).__triggerError('boom')
    })

    await waitFor(() => {
      const messages = useAppStore.getState().messages
      const lastMessage = messages[messages.length - 1]
      expect(lastMessage.content).toContain('partial')
      expect(lastMessage.content).toContain('boom')
      expect(lastMessage.isStreaming).toBe(false)
    })
  })

  it('should record learning trajectory after simulated response', async () => {
    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(mockedLearningService.record).toHaveBeenCalled()
    })

    const call = mockedLearningService.record.mock.calls[0][0] as {
      projectId: string
      skillId: string
      query: string
      response: string
      duration: number
    }
    expect(call.projectId).toBe('p1')
    expect(call.skillId).toBe('general-chat')
    expect(call.query).toBe('hello')
    expect(typeof call.duration).toBe('number')
  })

  it('should run learning analysis every 3 messages', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const initialMessages = Array.from({ length: 3 }, (_, i) => ({
      id: `pre-${i}`,
      role: 'user' as const,
      content: `pre ${i}`,
      timestamp: new Date().toISOString()
    }))
    mockedStorageService.get.mockResolvedValue(JSON.stringify(initialMessages))

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(screen.getByTestId('chat-send'))
    })
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    await waitFor(() => {
      expect(mockedLearningService.analyze).toHaveBeenCalledTimes(2)
    })

    vi.useRealTimers()
  })

  it('should handle stop click when cancelStream rejects', async () => {
    mockedLLMService.isConfigured.mockResolvedValue(true)
    mockedLLMService.startStream.mockReturnValue(new Promise(() => {}))
    mockedLLMService.cancelStream.mockRejectedValueOnce(new Error('cancel failed'))

    render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(screen.getByText('停止')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('停止'))

    await waitFor(() => {
      expect(mockedLLMService.cancelStream).toHaveBeenCalled()
    })
  })

  it('should clean up simulated stream on unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const { unmount } = render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('chat-send'))

    await waitFor(() => {
      expect(useAppStore.getState().messages.length).toBeGreaterThan(0)
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    vi.useRealTimers()
  })

  it('should remove IPC listeners on unmount', async () => {
    const { unmount } = render(<AIChatView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-send')).toBeInTheDocument()
    })

    unmount()

    expect(mockedLLMService.removeListeners).toHaveBeenCalled()
  })
})
