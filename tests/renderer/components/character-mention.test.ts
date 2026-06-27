// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { CharacterMentionExtension } from '../../../src/renderer/components/editor/extensions/CharacterMention'

describe('CharacterMentionExtension', () => {
  it('should have correct name', () => {
    const ext = CharacterMentionExtension.configure({})
    expect(ext.name).toBe('characterMention')
  })

  it('should be a mark type', () => {
    const ext = CharacterMentionExtension.configure({})
    expect(ext.type).toBe('mark')
  })

  describe('Editor integration', () => {
    it('should create an editor with characterMention mark', () => {
      const editor = new Editor({
        extensions: [StarterKit, CharacterMentionExtension]
      })
      expect(editor).toBeDefined()
      editor.destroy()
    })

    it('should apply character mention mark to selected text', () => {
      const editor = new Editor({
        extensions: [StarterKit, CharacterMentionExtension]
      })

      editor.commands.setContent('<p>林夜</p>')
      editor.commands.setTextSelection({ from: 1, to: 3 })

      const mentionAttrs = { id: 'char-1', name: '林夜' }
      editor.commands.setCharacterMention(mentionAttrs)

      const json = editor.getJSON()
      const paragraph = json.content?.[0]
      const mark = paragraph?.content?.[0]?.marks?.[0]
      expect(mark).toBeDefined()
      if (!mark) throw new Error('mark not found')
      expect(mark.type).toBe('characterMention')
      expect(mark.attrs?.name).toBe('林夜')

      editor.destroy()
    })

    it('should render mention as HTML with data attributes', () => {
      const editor = new Editor({
        extensions: [StarterKit, CharacterMentionExtension]
      })

      editor.commands.setContent('<p>叶霜</p>')
      editor.commands.setTextSelection({ from: 1, to: 3 })
      editor.commands.setCharacterMention({ id: 'char-2', name: '叶霜' })

      const html = editor.getHTML()
      expect(html).toContain('data-character-id="char-2"')
      expect(html).toContain('data-character-name="叶霜"')

      editor.destroy()
    })

    it('should remove mention mark with toggle command', () => {
      const editor = new Editor({
        extensions: [StarterKit, CharacterMentionExtension]
      })

      editor.commands.setContent('<p>林夜</p>')
      editor.commands.setTextSelection({ from: 1, to: 3 })
      editor.commands.setCharacterMention({ id: 'char-1', name: '林夜' })

      // Toggle off
      editor.commands.setTextSelection({ from: 1, to: 3 })
      editor.commands.unsetCharacterMention()

      const json = editor.getJSON()
      const marks = json.content?.[0]?.content?.[0]?.marks
      expect(marks).toBeUndefined()

      editor.destroy()
    })
  })
})
