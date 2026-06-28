import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'

vi.mock('../../src/renderer/App', () => ({
  default: () => <div data-testid="app">App</div>
}))

describe('renderer main entry', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
  })

  it('should render app into #root and set up global error handlers', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      await import('../../src/renderer/main')
    })

    expect(document.querySelector('[data-testid="app"]')).toBeInTheDocument()

    window.onerror?.('test error', 'test.js', 1, 1, new Error('test'))
    expect(errorSpy).toHaveBeenCalled()

    const rejectionEvent = new Event('unhandledrejection')
    // @ts-expect-error assign reason for handler
    rejectionEvent.reason = 'rejection reason'
    window.dispatchEvent(rejectionEvent)
    expect(errorSpy).toHaveBeenCalled()

    // Directly invoke the handler to cover the callback body
    window.onunhandledrejection?.({ reason: 'direct reason' } as PromiseRejectionEvent)
    expect(errorSpy).toHaveBeenCalledWith('Unhandled promise rejection:', 'direct reason')

    errorSpy.mockRestore()
  })

  it('should throw when #root is missing', async () => {
    document.body.innerHTML = ''
    await expect(import('../../src/renderer/main')).rejects.toThrow('找不到 #root')
  })
})
