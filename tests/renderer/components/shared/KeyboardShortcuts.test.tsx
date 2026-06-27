import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { KeyboardShortcutHandler } from '../../../../src/renderer/components/shared/KeyboardShortcuts'

vi.mock('../../../../src/renderer/components/shared/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}))

function fireKeyboard(key: string, ctrl = true) {
  fireEvent.keyDown(document, { key, ctrlKey: ctrl })
}

describe('KeyboardShortcutHandler', () => {
  it('should call onNewProject on ctrl+n', () => {
    const onNewProject = vi.fn()
    render(<KeyboardShortcutHandler onNewProject={onNewProject} />)
    fireKeyboard('n')
    expect(onNewProject).toHaveBeenCalled()
  })

  it('should call onSave on ctrl+s', () => {
    const onSave = vi.fn()
    render(<KeyboardShortcutHandler onSave={onSave} />)
    fireKeyboard('s')
    expect(onSave).toHaveBeenCalled()
  })

  it('should navigate on ctrl+1-7', () => {
    const onNavigate = vi.fn()
    render(<KeyboardShortcutHandler onNavigate={onNavigate} />)
    const views = ['dashboard', 'editor', 'studio', 'workshop', 'ai-chat', 'settings', 'reader']
    for (let i = 0; i < 7; i++) {
      fireKeyboard(String(i + 1))
      expect(onNavigate).toHaveBeenNthCalledWith(i + 1, views[i])
    }
  })

  it('should not trigger shortcuts without ctrl key', () => {
    const onNavigate = vi.fn()
    const onNewProject = vi.fn()
    render(<KeyboardShortcutHandler onNavigate={onNavigate} onNewProject={onNewProject} />)
    fireEvent.keyDown(document, { key: 'n', ctrlKey: false })
    expect(onNewProject).not.toHaveBeenCalled()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('should cleanup listener on unmount', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = render(<KeyboardShortcutHandler />)
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
