// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { NovelStructureExtension } from '../../../src/renderer/components/editor/extensions/NovelStructure'

describe('NovelStructureExtension', () => {
  it('should have correct name', () => {
    const ext = NovelStructureExtension.configure({})
    expect(ext.name).toBe('sceneBlock')
  })

  it('should be a node type', () => {
    const ext = NovelStructureExtension.configure({})
    expect(ext.type).toBe('node')
  })

  describe('Editor integration', () => {
    it('should create an editor with sceneBlock node', () => {
      const editor = new Editor({
        extensions: [StarterKit, NovelStructureExtension]
      })
      expect(editor).toBeDefined()
      editor.destroy()
    })

    it('should insert a sceneBlock via command', () => {
      const editor = new Editor({
        extensions: [StarterKit, NovelStructureExtension]
      })

      editor.commands.insertContent({
        type: 'sceneBlock',
        attrs: { pov: '林夜', setting: '龙脊山脉', sceneNumber: 1 },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '林夜站在山巅，眺望远方的迷雾。' }] }]
      })

      const json = editor.getJSON()
      expect(json.content).toBeDefined()
      const sceneBlock = json.content?.find(n => n.type === 'sceneBlock')
      expect(sceneBlock).toBeDefined()
      if (!sceneBlock) throw new Error('sceneBlock not found')
      expect(sceneBlock.attrs?.pov).toBe('林夜')
      expect(sceneBlock.attrs?.setting).toBe('龙脊山脉')
      expect(sceneBlock.attrs?.sceneNumber).toBe(1)

      editor.destroy()
    })

    it('should render sceneBlock as HTML with data attributes', () => {
      const editor = new Editor({
        extensions: [StarterKit, NovelStructureExtension]
      })

      editor.commands.insertContent({
        type: 'sceneBlock',
        attrs: { pov: '叶霜', setting: '迷雾森林', sceneNumber: 2, characters: ['叶霜', '林夜'] },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '迷雾中，叶霜听到了脚步声。' }] }]
      })

      const html = editor.getHTML()
      expect(html).toContain('叶霜')
      expect(html).toContain('迷雾森林')

      editor.destroy()
    })

    it('should allow editing content within sceneBlock', () => {
      const editor = new Editor({
        extensions: [StarterKit, NovelStructureExtension]
      })

      editor.commands.insertContent({
        type: 'sceneBlock',
        attrs: { pov: '林夜', setting: '城堡', sceneNumber: 3 },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '城堡的大门缓缓打开。' }] }]
      })

      // Type additional text
      editor.commands.insertContent('林夜走了进去。')
      const text = editor.state.doc.textContent
      expect(text).toContain('林夜走了进去')

      editor.destroy()
    })
  })

  describe('Scene separator input rule', () => {
    it('should insert a scene block via insertSceneBlock command', () => {
      const editor = new Editor({
        extensions: [StarterKit, NovelStructureExtension]
      })

      editor.commands.insertContent('第一段文字')
      editor.commands.insertSceneBlock()

      const json = editor.getJSON()
      const sceneBlock = json.content?.find(n => n.type === 'sceneBlock')
      expect(sceneBlock).toBeDefined()
      if (!sceneBlock) throw new Error('sceneBlock not found')
      expect(sceneBlock.type).toBe('sceneBlock')
      expect(sceneBlock.attrs?.sceneNumber).toBe(1)

      editor.destroy()
    })
  })
})
