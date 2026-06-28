import React from 'react'
import type { Editor } from '@tiptap/core'

interface ToolbarProps {
  editor: Editor | null
}

export const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  if (!editor) return null

  const addSceneBlock = () => {
    editor.chain().focus().insertSceneBlock().run()
  }

  const addCharacterMention = () => {
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)
    if (selectedText) {
      editor.chain().focus().setCharacterMention({ id: selectedText, name: selectedText }).run()
    }
  }

  const ToolButton: React.FC<{
    onClick: () => void
    isActive?: boolean
    title: string
    children: React.ReactNode
  }> = ({ onClick, isActive, title, children }) => (
    <button
      onClick={onClick}
      className={isActive ? 'is-active' : ''}
      title={title}
      type="button"
      aria-pressed={isActive}
    >
      {children}
    </button>
  )

  return (
    <div className="novel-toolbar">
      {/* History */}
      <ToolButton onClick={() => editor.chain().focus().undo().run()} title="撤销 (Ctrl+Z)">
        ↩
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().redo().run()} title="重做 (Ctrl+Shift+Z)">
        ↪
      </ToolButton>

      <div className="separator" />

      {/* Text formatting */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="加粗 (Ctrl+B)"
      >
        <strong>B</strong>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="下划线 (Ctrl+U)"
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="删除线"
      >
        <span style={{ textDecoration: 'line-through' }}>S</span>
      </ToolButton>

      <div className="separator" />

      {/* Headings */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="标题 1"
      >
        <span className="heading-label" style={{ fontWeight: 700, fontSize: '15px' }}>H1</span>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="标题 2"
      >
        <span className="heading-label" style={{ fontWeight: 600, fontSize: '13px' }}>H2</span>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="标题 3"
      >
        <span className="heading-label" style={{ fontWeight: 600, fontSize: '12px' }}>H3</span>
      </ToolButton>

      <div className="separator" />

      {/* Lists */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="无序列表"
      >
        <svg viewBox="0 0 18 18" width="18" height="18" stroke="currentColor" fill="none">
          <circle cx="4" cy="5" r="1.5" fill="currentColor" stroke="none" />
          <line x1="8" y1="5" x2="15" y2="5" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="4" cy="9" r="1.5" fill="currentColor" stroke="none" />
          <line x1="8" y1="9" x2="15" y2="9" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="4" cy="13" r="1.5" fill="currentColor" stroke="none" />
          <line x1="8" y1="13" x2="15" y2="13" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="有序列表"
      >
        1.
      </ToolButton>

      <div className="separator" />

      {/* Block quote & code */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="引用"
      >
        <svg viewBox="0 0 18 18" width="18" height="18" stroke="currentColor" fill="none">
          <path d="M5 11V7a2.5 2.5 0 012.5-2.5" stroke-width="1.5" stroke-linecap="round" />
          <path d="M5 11h3V7.5H5z" stroke-width="1.5" />
          <path d="M10 11V7a2.5 2.5 0 012.5-2.5" stroke-width="1.5" stroke-linecap="round" />
          <path d="M10 11h3V7.5h-3z" stroke-width="1.5" />
        </svg>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="行内代码"
      >
        <svg viewBox="0 0 18 18" width="18" height="18" stroke="currentColor" fill="none">
          <path d="M5.5 6L3 9l2.5 3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M12.5 6l2.5 3-2.5 3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </ToolButton>

      <div className="separator" />

      {/* Novel-specific */}
      <ToolButton onClick={addSceneBlock} title="插入场景分隔">
        🔲
      </ToolButton>
      <ToolButton onClick={addCharacterMention} title="标记为角色提及">
        👤
      </ToolButton>

      {/* Word count placeholder */}
      <span className="word-count" id="editor-word-count" style={{ display: 'none' }} />
    </div>
  )
}
