import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ToastProvider, useToast } from '../../../../src/renderer/components/shared/Toast'

// Mock useTheme hook
vi.mock('../../../src/renderer/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' })
}))

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show toast message', async () => {
    const TestComponent = () => {
      const { showToast } = useToast()
      return <button onClick={() => showToast('Hello', 'success')}>Show</button>
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show'))
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should auto-dismiss after timeout', async () => {
    const TestComponent = () => {
      const { showToast } = useToast()
      return <button onClick={() => showToast('Test', 'info')}>Show</button>
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show'))
    expect(screen.getByText('Test')).toBeInTheDocument()

    // Advance timers past the 3000ms auto-dismiss timeout
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    // After advancing timers, the toast should be gone
    expect(screen.queryByText('Test')).not.toBeInTheDocument()
  })

  it('should show different toast types', () => {
    const TestComponent = () => {
      const { showToast } = useToast()
      return (
        <div>
          <button onClick={() => showToast('Success message', 'success')}>Success</button>
          <button onClick={() => showToast('Error message', 'error')}>Error</button>
          <button onClick={() => showToast('Info message', 'info')}>Info</button>
        </div>
      )
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Success'))
    expect(screen.getByText('Success message')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Error'))
    expect(screen.getByText('Error message')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Info'))
    expect(screen.getByText('Info message')).toBeInTheDocument()
  })
})
