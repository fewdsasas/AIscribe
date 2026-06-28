// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BubbleMenu } from '@renderer/components/editor/menus/BubbleMenu'
import type { Editor } from '@tiptap/core'

interface MockChain {
  focus: ReturnType<typeof vi.fn>
  toggleBold: ReturnType<typeof vi.fn>
  toggleItalic: ReturnType<typeof vi.fn>
  toggleUnderline: ReturnType<typeof vi.fn>
  setCharacterMention: ReturnType<typeof vi.fn>
  run: ReturnType<typeof vi.fn>
}

function createMockEditor(overrides: Record<string, unknown> = {}): { editor: Editor; chain: MockChain } {
  const chain: MockChain = {
    focus: vi.fn(() => chain),
    toggleBold: vi.fn(() => chain),
    toggleItalic: vi.fn(() => chain),
    toggleUnderline: vi.fn(() => chain),
    setCharacterMention: vi.fn(() => chain),
    run: vi.fn()
  }
  const editor = {
    chain: vi.fn(() => chain),
    isActive: vi.fn(() => false),
    state: {
      selection: { from: 0, to: 0 },
      doc: { textBetween: vi.fn(() => '') }
    },
    ...overrides
  }
  return { editor: editor as unknown as Editor, chain }
}

vi.mock('@tiptap/react', () => ({
  BubbleMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="tiptap-bubble-menu">{children}</div>
}))

describe('BubbleMenu', () => {
  it('should render null when editor is null', () => {
    const { container } = render(<BubbleMenu editor={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render formatting buttons', () => {
    const { editor } = createMockEditor()
    render(<BubbleMenu editor={editor} />)

    expect(screen.getByTitle('加粗')).toBeInTheDocument()
    expect(screen.getByTitle('斜体')).toBeInTheDocument()
    expect(screen.getByTitle('下划线')).toBeInTheDocument()
    expect(screen.getByTitle('标记为角色')).toBeInTheDocument()
  })

  it('should call toggleBold when bold button clicked', () => {
    const { editor, chain } = createMockEditor()
    render(<BubbleMenu editor={editor} />)
    fireEvent.click(screen.getByTitle('加粗'))
    expect(chain.focus).toHaveBeenCalled()
    expect(chain.toggleBold).toHaveBeenCalled()
    expect(chain.run).toHaveBeenCalled()
  })

  it('should call toggleItalic when italic button clicked', () => {
    const { editor, chain } = createMockEditor()
    render(<BubbleMenu editor={editor} />)
    fireEvent.click(screen.getByTitle('斜体'))
    expect(chain.toggleItalic).toHaveBeenCalled()
    expect(chain.run).toHaveBeenCalled()
  })

  it('should call toggleUnderline when underline button clicked', () => {
    const { editor, chain } = createMockEditor()
    render(<BubbleMenu editor={editor} />)
    fireEvent.click(screen.getByTitle('下划线'))
    expect(chain.toggleUnderline).toHaveBeenCalled()
    expect(chain.run).toHaveBeenCalled()
  })

  it('should call setCharacterMention when character button clicked with selected text', () => {
    const { editor, chain } = createMockEditor({
      state: {
        selection: { from: 1, to: 3 },
        doc: { textBetween: vi.fn(() => '林夜') }
      }
    })
    render(<BubbleMenu editor={editor} />)
    fireEvent.click(screen.getByTitle('标记为角色'))
    expect(chain.setCharacterMention).toHaveBeenCalledWith({ id: '林夜', name: '林夜' })
    expect(chain.run).toHaveBeenCalled()
  })

  it('should not call setCharacterMention when no text selected', () => {
    const { editor, chain } = createMockEditor()
    render(<BubbleMenu editor={editor} />)
    fireEvent.click(screen.getByTitle('标记为角色'))
    expect(chain.setCharacterMention).not.toHaveBeenCalled()
    expect(chain.run).not.toHaveBeenCalled()
  })

  it('should reflect active state', () => {
    const { editor } = createMockEditor({
      isActive: vi.fn((name: string) => name === 'bold')
    })
    render(<BubbleMenu editor={editor} />)
    expect(screen.getByTitle('加粗')).toHaveClass('is-active')
  })
})
