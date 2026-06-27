import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StreamingText } from '../../../../src/renderer/components/ai-chat/StreamingText'

describe('StreamingText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render initially with cursor', () => {
    const { container } = render(<StreamingText text="Hello" messageId="msg-1" speed={30} />)
    expect(container.querySelector('.streaming-text')).toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should progressively reveal characters', () => {
    render(<StreamingText text="ABC" messageId="msg-2" speed={30} />)
    act(() => {
      vi.advanceTimersByTime(30)
    })
    expect(screen.getByText('A')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(30)
    })
    expect(screen.getByText('AB')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(30)
    })
    expect(screen.getByText('ABC')).toBeInTheDocument()
  })

  it('should call onComplete when all characters revealed', () => {
    const onComplete = vi.fn()
    render(<StreamingText text="Hi" messageId="msg-3" speed={30} onComplete={onComplete} />)
    act(() => {
      vi.advanceTimersByTime(30)
    })
    act(() => {
      vi.advanceTimersByTime(30)
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(onComplete).toHaveBeenCalled()
  })

  it('should reset when messageId changes but not when text content grows', () => {
    const { container, rerender } = render(<StreamingText text="Hello" messageId="msg-4" speed={30} />)
    act(() => {
      vi.advanceTimersByTime(30)
    })
    expect(container.querySelector('.streaming-text')?.textContent).toBe('H')
    rerender(<StreamingText text="Hello World" messageId="msg-4" speed={30} />)
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(container.querySelector('.streaming-text')?.textContent).toBe('H')
  })

  it('should reset animation when messageId changes to a different message', () => {
    const { container, rerender } = render(<StreamingText text="Hello" messageId="msg-5" speed={30} />)
    act(() => {
      vi.advanceTimersByTime(90)
    })
    expect(container.querySelector('.streaming-text')?.textContent).toBe('Hel')
    rerender(<StreamingText text="World" messageId="msg-6" speed={30} />)
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(container.querySelector('.streaming-text')?.textContent).toBe('')
  })

  it('should show cursor while streaming and hide after complete', () => {
    render(<StreamingText text="AB" messageId="msg-7" speed={30} />)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(60)
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument()
  })
})
