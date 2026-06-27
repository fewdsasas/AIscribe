import React from 'react'
import { BubbleMenu as TipTapBubbleMenu } from '@tiptap/react'
import type { Editor } from '@tiptap/core'

interface BubbleMenuProps {
  editor: Editor | null
}

export const BubbleMenu: React.FC<BubbleMenuProps> = ({ editor }) => {
  if (!editor) return null

  return (
    <TipTapBubbleMenu editor={editor} className="bubble-menu" tippyOptions={{ duration: 150 }}>
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
    </TipTapBubbleMenu>
  )
}
