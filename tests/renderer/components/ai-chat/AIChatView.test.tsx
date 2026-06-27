// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AIChatView } from '@renderer/components/ai-chat/AIChatView'
import { learningService, llmService } from '@renderer/services'
import { useAppStore } from '@renderer/store'
import type { ChatMessage } from '@renderer/store'

vi.mock('@renderer/services', () => ({
  llmService: {
    isConfigured: vi.fn(),
    startStream: vi.fn(),
    cancelStream: vi.fn().mockResolvedValue(true),
    onChunk: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
    removeListeners: vi.fn()
  },
  learningService: {
    analyze: vi.fn(),
    record: vi.fn()
  }
}))

vi.mock('@renderer/components/ai-chat/ChatMessage', () => ({
  ChatMessage: vi.fn(({ message }: { message: ChatMessage }) => (
    <div data-testid="chat-message">{message.content}</div>
  ))
}))

vi.mock('@renderer/components/ai-chat/ChatInput', () => ({
  ChatInput: React.forwardRef(
    ({ onSend }: { onSend: (text: string) => void }, ref: React.Ref<{ setText: (text: string) => void; focus: () => void }>) => {
      React.useImperativeHandle(ref, () => ({
        setText: () => {},
        focus: () => {}
      }))
      return (
        <div data-testid="chat-input">
          <input data-testid="chat-input-field" />
          <button data-testid="chat-send" onClick={() => onSend('hello')}>
            Send
          </button>
        </div>
      )
    }
  )
}))

const mockedLLMService = vi.mocked(llmService)
const mockedLearningService = vi.mocked(learningService)

describe('AIChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
