import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Editor } from '@tiptap/core'
import { Toolbar } from '../../../../../src/renderer/components/editor/menus/Toolbar'

interface MockChain {
  focus: ReturnType<typeof vi.fn>
  undo: ReturnType<typeof vi.fn>
  redo: ReturnType<typeof vi.fn>
  toggleBold: ReturnType<typeof vi.fn>
  toggleItalic: ReturnType<typeof vi.fn>
  toggleUnderline: ReturnType<typeof vi.fn>
  toggleStrike: ReturnType<typeof vi.fn>
  toggleHeading: ReturnType<typeof vi.fn>
  toggleBulletList: ReturnType<typeof vi.fn>
  toggleOrderedList: ReturnType<typeof vi.fn>
  toggleBlockquote: ReturnType<typeof vi.fn>
  toggleCode: ReturnType<typeof vi.fn>
  insertSceneBlock: ReturnType<typeof vi.fn>
  setCharacterMention: ReturnType<typeof vi.fn>
  run: ReturnType<typeof vi.fn>
}

function createMockEditor(overrides: Record<string, unknown> = {}): { editor: Editor; chain: MockChain } {
  const chain: MockChain = {
    focus: vi.fn(() => chain),
    undo: vi.fn(() => chain),
    redo: vi.fn(() => chain),
    toggleBold: vi.fn(() => chain),
    toggleItalic: vi.fn(() => chain),
    toggleUnderline: vi.fn(() => chain),
    toggleStrike: vi.fn(() => chain),
    toggleHeading: vi.fn(() => chain),
    toggleBulletList: vi.fn(() => chain),
    toggleOrderedList: vi.fn(() => chain),
    toggleBlockquote: vi.fn(() => chain),
    toggleCode: vi.fn(() => chain),
    insertSceneBlock: vi.fn(() => chain),
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

describe('Toolbar', () => {
  it('should render null when editor is null', () => {
    const { container } = render(<Toolbar editor={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render all toolbar buttons', () => {
    const { editor } = createMockEditor()
    render(<Toolbar editor={editor} />)

    const expectedTitles = [
      '撤销 (Ctrl+Z)',
      '重做 (Ctrl+Shift+Z)',
      '加粗 (Ctrl+B)',
      '斜体 (Ctrl+I)',
      '下划线 (Ctrl+U)',
      '删除线',
      '标题 1',
      '标题 2',
      '标题 3',
      '无序列表',
      '有序列表',
      '引用',
      '行内代码',
      '插入场景分隔',
      '标记为角色提及'
    ]
    for (const title of expectedTitles) {
      expect(screen.getByTitle(title)).toBeInTheDocument()
    }
  })

  it('should call toggleBold when bold button clicked', () => {
    const { editor, chain } = createMockEditor()
    render(<Toolbar editor={editor} />)
    fireEvent.click(screen.getByTitle('加粗 (Ctrl+B)'))
    expect(chain.focus).toHaveBeenCalled()
    expect(chain.toggleBold).toHaveBeenCalled()
    expect(chain.run).toHaveBeenCalled()
  })

  it('should call toggleItalic when italic button clicked', () => {
    const { editor, chain } = createMockEditor()
    render(<Toolbar editor={editor} />)
    fireEvent.click(screen.getByTitle('斜体 (Ctrl+I)'))
    expect(chain.toggleItalic).toHaveBeenCalled()
    expect(chain.run).toHaveBeenCalled()
  })

  it('should call toggleUnderline when underline button clicked', () => {
    const { editor, chain } = createMockEditor()
    render(<Toolbar editor={editor} />)
    fireEvent.click(screen.getByTitle('下划线 (Ctrl+U)'))
    expect(chain.toggleUnderline).toHaveBeenCalled()
    expect(chain.run).toHaveBeenCalled()
  })

  it('should call undo when undo button clicked', () => {
    const { editor, chain } = createMockEditor()
    render(<Toolbar editor={editor} />)
    fireEvent.click(screen.getByTitle('撤销 (Ctrl+Z)'))
    expect(chain.undo).toHaveBeenCalled()
    expect(chain.run).toHaveBeenCalled()
  })

  it('should call redo when redo button clicked', () => {
    const { editor, chain } = createMockEditor()
    render(<Toolbar editor={editor} />)
    fireEvent.click(screen.getByTitle('重做 (Ctrl+Shift+Z)'))
    expect(chain.redo).toHaveBeenCalled()
    expect(chain.run).toHaveBeenCalled()
  })

  it('should call setCharacterMention when character mention button clicked with selected text', () => {
    const { editor, chain } = createMockEditor({
      state: {
        selection: { from: 1, to: 3 },
        doc: { textBetween: vi.fn(() => '林夜') }
      }
    })
    render(<Toolbar editor={editor} />)
    fireEvent.click(screen.getByTitle('标记为角色提及'))
    expect(chain.setCharacterMention).toHaveBeenCalledWith({ id: '林夜', name: '林夜' })
    expect(chain.run).toHaveBeenCalled()
  })

  it('should not call setCharacterMention when no text is selected', () => {
    const { editor, chain } = createMockEditor({
      state: {
        selection: { from: 0, to: 0 },
        doc: { textBetween: vi.fn(() => '') }
      }
    })
    render(<Toolbar editor={editor} />)
    fireEvent.click(screen.getByTitle('标记为角色提及'))
    expect(chain.setCharacterMention).not.toHaveBeenCalled()
    expect(chain.run).not.toHaveBeenCalled()
  })

  it('should reflect isActive state in button className', () => {
    const { editor } = createMockEditor({
      isActive: vi.fn((name: string) => name === 'bold')
    })
    render(<Toolbar editor={editor} />)
    const boldButton = screen.getByTitle('加粗 (Ctrl+B)')
    expect(boldButton).toHaveClass('is-active')
  })
})
