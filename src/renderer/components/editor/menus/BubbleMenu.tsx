import React, { useRef } from 'react'
import { BubbleMenu as TipTapBubbleMenu } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { useFocusTrap } from '../../../hooks/useFocusTrap'

interface BubbleMenuProps {
  editor: Editor | null
}

export const BubbleMenu: React.FC<BubbleMenuProps> = ({ editor }) => {
  const menuRef = useRef<HTMLDivElement>(null)

  if (!editor) return null

  const hasSelection = editor.state.selection.from !== editor.state.selection.to
  useFocusTrap(menuRef, hasSelection)

  return (
    <TipTapBubbleMenu editor={editor} className="bubble-menu" tippyOptions={{ duration: 150 }}>
      <div ref={menuRef} role="toolbar" aria-label="文本格式化">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="加粗"
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="斜体"
          type="button"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="下划线"
          type="button"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <button
          onClick={() => {
            const { from, to } = editor.state.selection
            const selectedText = editor.state.doc.textBetween(from, to)
            if (selectedText) {
              editor.chain().focus().setCharacterMention({ id: selectedText, name: selectedText }).run()
            }
          }}
          title="标记为角色"
          type="button"
        >
          👤
        </button>
      </div>
    </TipTapBubbleMenu>
  )
}
