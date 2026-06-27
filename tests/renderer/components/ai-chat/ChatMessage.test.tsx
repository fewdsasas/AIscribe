import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '../../../../src/renderer/components/ai-chat/ChatMessage'
import type { ChatMessage as ChatMessageType } from '../../../../src/renderer/store'

vi.mock('../../../../src/renderer/components/ai-chat/StreamingText', () => ({
  StreamingText: ({ text }: { text: string }) => <span data-testid="streaming">{text}</span>
}))

vi.mock('../../../../src/renderer/components/ai-chat/SkillInvocationCard', () => ({
  SkillInvocationCard: ({ invocation }: { invocation: { skillName: string } }) => (
    <div data-testid="skill-card">{invocation.skillName}</div>
  )
}))

const makeMessage = (overrides: Partial<ChatMessageType> = {}): ChatMessageType => ({
  id: 'msg-1',
  role: 'user',
  content: 'Hello',
  timestamp: new Date().toISOString(),
  ...overrides
})

describe('ChatMessage', () => {
  it('should render user message with "你" avatar', () => {
    render(<ChatMessage message={makeMessage({ role: 'user', content: 'Hi there' })} />)
    expect(screen.getByText('你')).toBeInTheDocument()
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  it('should render assistant message with "AI" avatar', () => {
    render(<ChatMessage message={makeMessage({ role: 'assistant', content: 'Response' })} />)
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Response')).toBeInTheDocument()
  })

  it('should use StreamingText for streaming assistant messages', () => {
    render(<ChatMessage message={makeMessage({ role: 'assistant', content: 'Streaming...', isStreaming: true })} />)
    expect(screen.getByTestId('streaming')).toBeInTheDocument()
  })

  it('should use plain span for non-streaming messages', () => {
    render(<ChatMessage message={makeMessage({ role: 'user', content: 'Plain text' })} />)
    expect(screen.queryByTestId('streaming')).not.toBeInTheDocument()
    expect(screen.getByText('Plain text')).toBeInTheDocument()
  })

  it('should render skill invocations', () => {
    render(
      <ChatMessage
        message={makeMessage({
          skillInvocations: [
            { skillName: 'outline', input: 'test', output: 'result', duration: 1.2, status: 'completed' }
          ]
        })}
      />
    )
    expect(screen.getByTestId('skill-card')).toBeInTheDocument()
    expect(screen.getByText('outline')).toBeInTheDocument()
  })

  it('should render timestamp', () => {
    const ts = '2026-06-25T10:30:00.000Z'
    render(<ChatMessage message={makeMessage({ timestamp: ts })} />)
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument()
  })
})
