// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NovelEditor, type NovelEditorHandle } from '@renderer/components/editor/NovelEditor'

const chain = {
  focus: vi.fn(() => chain),
  insertContent: vi.fn(() => chain),
  setContent: vi.fn(() => chain),
  run: vi.fn()
}

const createMockEditor = (overrides: Record<string, unknown> = {}) => ({
  chain: vi.fn(() => chain),
  getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] })),
  state: {
    doc: { textContent: 'hello' }
  },
  commands: {
    setContent: vi.fn(),
    undo: vi.fn()
  },
  view: {
    dom: document.createElement('div')
  },
  isDestroyed: false,
  destroy: vi.fn(),
  ...overrides
})

let mockEditor = createMockEditor()
let useEditorCallback: ((args: Record<string, unknown>) => void) | null = null

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn((options: Record<string, unknown>) => {
    useEditorCallback = options.onUpdate as (args: Record<string, unknown>) => void
    return mockEditor
  }),
  EditorContent: ({ editor, className }: { editor: unknown; className?: string }) => (
    <div className={className} data-testid="editor-content">
      {editor ? 'editor-content' : 'no-editor'}
    </div>
  ),
  BubbleMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="bubble-menu">{children}</div>
}))

vi.mock('@tiptap/starter-kit', () => {
  const ext = { configure: vi.fn(() => ext) }
  return { default: ext }
})
vi.mock('@tiptap/extension-underline', () => {
  const ext = { configure: vi.fn(() => ext) }
  return { default: ext }
})
vi.mock('@tiptap/extension-placeholder', () => {
  const ext = { configure: vi.fn(() => ext) }
  return { default: ext }
})
vi.mock('@renderer/components/editor/extensions/NovelStructure', () => {
  const ext = { configure: vi.fn(() => ext) }
  return { NovelStructureExtension: ext }
})
vi.mock('@renderer/components/editor/extensions/CharacterMention', () => {
  const ext = { configure: vi.fn(() => ext) }
  return { CharacterMentionExtension: ext }
})
vi.mock('@renderer/components/editor/extensions/WritingGoal', () => {
  const ext = { configure: vi.fn(() => ext) }
  return {
    countChineseChars: vi.fn((text: string) => text.length),
    formatProgress: vi.fn((current: number, goal: number) => `${current}/${goal}`),
    WritingGoalPlugin: ext
  }
})
vi.mock('@renderer/components/editor/menus/Toolbar', () => ({
  Toolbar: () => <div data-testid="toolbar">toolbar</div>
}))
vi.mock('@renderer/components/editor/menus/BubbleMenu', () => ({
  BubbleMenu: ({ editor }: { editor: unknown }) => (editor ? <div data-testid="bubble-menu">bubble-menu</div> : null)
}))

class MockClipboardEvent extends Event {
  clipboardData: DataTransfer
  defaultPrevented = false

  constructor(type: string, init: { clipboardData: DataTransfer; bubbles?: boolean; cancelable?: boolean }) {
    super(type, init)
    this.clipboardData = init.clipboardData
  }

  preventDefault(): void {
    this.defaultPrevented = true
  }
}

class MockDataTransfer implements DataTransfer {
  private data: Record<string, string> = {}

  setData(format: string, data: string): void {
    this.data[format] = data
  }

  getData(format: string): string {
    return this.data[format] ?? ''
  }

  clearData(): void {
    this.data = {}
  }

  get files(): FileList {
    return [] as unknown as FileList
  }

  get types(): string[] {
    return Object.keys(this.data)
  }

  get items(): DataTransferItemList {
    return [] as unknown as DataTransferItemList
  }

  setDragImage(): void {}
  addElement(): void {}

  effectAllowed: DataTransfer['effectAllowed'] = 'none'
  dropEffect: DataTransfer['dropEffect'] = 'none'
}

describe('NovelEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockEditor = createMockEditor()
    useEditorCallback = null
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should render editor content', () => {
    render(<NovelEditor />)
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('should render chapter title', () => {
    render(<NovelEditor chapterTitle="第一章" />)
    expect(screen.getByText('第一章')).toBeInTheDocument()
  })

  it('should hide toolbar and status bar in readOnly mode', () => {
    render(<NovelEditor readOnly />)
    expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/字\/时/)).not.toBeInTheDocument()
  })

  function invokeOnUpdate() {
    if (!useEditorCallback) throw new Error('onUpdate callback not captured')
    useEditorCallback({ editor: mockEditor })
  }

  it('should call onContentChange on editor update', () => {
    const onContentChange = vi.fn()
    render(<NovelEditor onContentChange={onContentChange} />)

    expect(useEditorCallback).not.toBeNull()
    invokeOnUpdate()

    expect(onContentChange).toHaveBeenCalled()
  })

  it('should trigger auto-save after content change', () => {
    const onSave = vi.fn()
    render(<NovelEditor onSave={onSave} />)

    invokeOnUpdate()
    vi.runOnlyPendingTimers()

    expect(onSave).toHaveBeenCalled()
  })

  it('should flush auto-save on unmount', () => {
    const onSave = vi.fn()
    const { unmount } = render(<NovelEditor onSave={onSave} />)

    invokeOnUpdate()
    unmount()

    expect(onSave).toHaveBeenCalled()
  })

  it('should call onSave on Ctrl+S when editor is focused', () => {
    const onSave = vi.fn()
    render(<NovelEditor onSave={onSave} />)

    const editorEl = screen.getByTestId('editor-content')
    editorEl.setAttribute('tabindex', '-1')
    ;(editorEl as HTMLDivElement).focus()

    fireEvent.keyDown(document, { key: 's', ctrlKey: true })

    expect(onSave).toHaveBeenCalled()
  })

  it('should not call onSave on Ctrl+S when editor is not focused', () => {
    const onSave = vi.fn()
    render(<NovelEditor onSave={onSave} />)

    fireEvent.keyDown(document, { key: 's', ctrlKey: true })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('should expose insertContent via ref', () => {
    let refValue: NovelEditorHandle | null = null
    render(
      <NovelEditor
        ref={ref => {
          refValue = ref
        }}
      />
    )

    expect(refValue).not.toBeNull()
    if (!refValue) throw new Error('ref not set')
    ;(refValue as NovelEditorHandle).insertContent('inserted text')
    expect(chain.focus).toHaveBeenCalled()
    expect(chain.insertContent).toHaveBeenCalledWith('inserted text')
    expect(chain.run).toHaveBeenCalled()
  })

  it('should set content when initialContent changes', () => {
    const { rerender } = render(<NovelEditor initialContent={{ type: 'doc', content: [] }} />)
    rerender(<NovelEditor initialContent={{ type: 'doc', content: [{ type: 'paragraph' }] }} />)
    expect(mockEditor.commands.setContent).toHaveBeenCalledWith({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('should read editor preferences from localStorage', () => {
    localStorage.setItem('aiscribe-editor-prefs', JSON.stringify({ autoSaveInterval: 5, dailyGoal: 3000 }))
    render(<NovelEditor />)
    expect(screen.getByText(/3000/)).toBeInTheDocument()
  })

  it('should undo last input when content exceeds 500,000 characters', () => {
    const onContentLimitReached = vi.fn()
    render(<NovelEditor onContentLimitReached={onContentLimitReached} />)

    mockEditor.state.doc.textContent = 'x'.repeat(500_001)
    invokeOnUpdate()

    expect(mockEditor.commands.undo).toHaveBeenCalled()
    expect(onContentLimitReached).toHaveBeenCalled()
  })

  it('should block paste that would exceed 500,000 characters', () => {
    const onContentLimitReached = vi.fn()
    render(<NovelEditor onContentLimitReached={onContentLimitReached} />)

    mockEditor.state.doc.textContent = 'x'.repeat(499_000)
    const pasteData = new MockDataTransfer()
    pasteData.setData('text/plain', 'x'.repeat(2_000))

    const pasteEvent = new MockClipboardEvent('paste', {
      clipboardData: pasteData,
      bubbles: true,
      cancelable: true
    })

    mockEditor.view.dom.dispatchEvent(pasteEvent)
    expect(pasteEvent.defaultPrevented).toBe(true)
    expect(onContentLimitReached).toHaveBeenCalled()
  })

  it('should allow paste within the 500,000 character limit', () => {
    render(<NovelEditor />)

    mockEditor.state.doc.textContent = 'x'.repeat(1_000)
    const pasteData = new MockDataTransfer()
    pasteData.setData('text/plain', 'x'.repeat(1_000))

    const pasteEvent = new MockClipboardEvent('paste', {
      clipboardData: pasteData,
      bubbles: true,
      cancelable: true
    })

    mockEditor.view.dom.dispatchEvent(pasteEvent)
    expect(pasteEvent.defaultPrevented).toBe(false)
  })
})
