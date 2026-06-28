import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { NovelStructureExtension } from './extensions/NovelStructure'
import { CharacterMentionExtension } from './extensions/CharacterMention'
import { countChineseChars, formatProgress, WritingGoalPlugin } from './extensions/WritingGoal'
import { Toolbar } from './menus/Toolbar'
import { BubbleMenu } from './menus/BubbleMenu'
import { logger } from '../../utils/logger'
import './styles/editor.css'

const MAX_CHAPTER_CHARS = 500_000

export interface NovelEditorHandle {
  insertContent: (text: string) => void
}

export interface NovelEditorProps {
  initialContent?: Record<string, unknown>
  chapterId?: string
  chapterTitle?: string
  dailyGoal?: number
  onContentChange?: (json: Record<string, unknown>, text: string, charCount: number) => void
  onSave?: () => void
  onContentLimitReached?: () => void
  readOnly?: boolean
  placeholder?: string
}

export const NovelEditor = forwardRef<NovelEditorHandle, NovelEditorProps>(
  (
    {
      initialContent,
      chapterTitle,
      dailyGoal: propDailyGoal,
      onContentChange,
      onSave,
      onContentLimitReached,
      readOnly = false,
      placeholder = '开始写作...'
    },
    ref
  ) => {
    const [charCount, setCharCount] = useState(0)
    const [writingSpeed, setWritingSpeed] = useState(0)
    const [goalProgress, setGoalProgress] = useState(0)
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const enforcingLimitRef = useRef(false)

    // Memoize localStorage reads to avoid repeated access
    const { autoSaveInterval, effectiveDailyGoal } = useMemo(() => {
      let interval = 2000
      let goal = 2000
      try {
        const prefs = localStorage.getItem('aiscribe-editor-prefs')
        if (prefs) {
          const parsed = JSON.parse(prefs)
          if (typeof parsed.autoSaveInterval === 'number' && parsed.autoSaveInterval > 0) {
            interval = parsed.autoSaveInterval * 1000
          }
          if (typeof parsed.dailyGoal === 'number') {
            goal = parsed.dailyGoal
          }
        }
      } catch {
        /* ignore corrupt prefs */
      }
      return { autoSaveInterval: interval, effectiveDailyGoal: propDailyGoal ?? goal }
    }, [propDailyGoal])

    // Use refs to avoid stale closures in callbacks with infrequent re-creation
    const onSaveRef = useRef(onSave)
    onSaveRef.current = onSave
    const onContentLimitReachedRef = useRef(onContentLimitReached)
    onContentLimitReachedRef.current = onContentLimitReached

    // Debounced auto-save: saves after the user stops typing
    const triggerAutoSave = useCallback(() => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => {
        if (onSaveRef.current) onSaveRef.current()
      }, autoSaveInterval)
    }, [autoSaveInterval])

    // Cleanup timer on unmount — flush pending save
    useEffect(() => {
      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current)
          if (onSaveRef.current) onSaveRef.current()
        }
      }
    }, [])

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] }
        }),
        Underline,
        Placeholder.configure({ placeholder }),
        NovelStructureExtension,
        CharacterMentionExtension,
        WritingGoalPlugin.configure({
          dailyGoal: effectiveDailyGoal,
          onUpdate: stats => {
            setCharCount(stats.charCount)
            setWritingSpeed(stats.writingSpeed)
            setGoalProgress(stats.goalProgress)
          }
        })
      ],
      content: initialContent ?? {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      },
      editable: !readOnly,
      onUpdate: ({ editor: ed }) => {
        const json = ed.getJSON()
        const text = ed.state.doc.textContent
        const chars = countChineseChars(text)

        if (chars > MAX_CHAPTER_CHARS && !enforcingLimitRef.current) {
          enforcingLimitRef.current = true
          ed.commands.undo()
          logger.warn(`章节内容超过 ${MAX_CHAPTER_CHARS} 字上限，已回退最后一次输入`)
          onContentLimitReached?.()
          enforcingLimitRef.current = false
          return
        }

        if (onContentChange) {
          onContentChange(json, text, chars)
        }
        triggerAutoSave()
      }
    })

    // Expose insertContent to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        insertContent: (text: string) => {
          if (!editor) return
          const currentChars = countChineseChars(editor.state.doc.textContent)
          const insertChars = countChineseChars(text)
          if (currentChars + insertChars > MAX_CHAPTER_CHARS) {
            logger.warn(`插入内容将超出 ${MAX_CHAPTER_CHARS} 字上限，已阻止`)
            onContentLimitReachedRef.current?.()
            return
          }
          editor.chain().focus().insertContent(text).run()
        }
      }),
      [editor]
    )

    // Auto-save with Ctrl+S — only when editor is focused
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          // Only handle if editor is focused
          const activeElement = document.activeElement
          const editorElement = document.querySelector('.novel-editor')
          if (editorElement?.contains(activeElement)) {
            e.preventDefault()
            if (onSaveRef.current) onSaveRef.current()
          }
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Block paste that would exceed the chapter character limit
    useEffect(() => {
      if (!editor || readOnly) return
      const dom = editor.view.dom as HTMLElement
      const handlePaste = (e: ClipboardEvent) => {
        const pasteText = e.clipboardData?.getData('text/plain') ?? ''
        const currentText = editor.state.doc.textContent
        const currentChars = countChineseChars(currentText)
        const pasteChars = countChineseChars(pasteText)
        if (currentChars + pasteChars > MAX_CHAPTER_CHARS) {
          e.preventDefault()
          logger.warn(`粘贴内容将超出 ${MAX_CHAPTER_CHARS} 字上限，已阻止`)
          onContentLimitReached?.()
        }
      }
      dom.addEventListener('paste', handlePaste)
      return () => dom.removeEventListener('paste', handlePaste)
    }, [editor, readOnly, onContentLimitReached])

    // Update content when initialContent changes
    useEffect(() => {
      if (editor && initialContent) {
        editor.commands.setContent(initialContent)
      }
    }, [editor, initialContent])

    return (
      <div className="novel-editor-container flex flex-col h-full">
        {/* Chapter title */}
        {chapterTitle && (
          <div className="px-1 mb-2">
            <h2
              className={`text-xl font-bold text-center font-serif ${readOnly ? 'text-2xl mb-4' : ''}`}
              style={{ color: 'var(--color-text)' }}
            >
              {chapterTitle}
            </h2>
          </div>
        )}

        {/* Toolbar (hidden in reader mode) */}
        {!readOnly && (
          <div className="mb-3">
            <Toolbar editor={editor} />
          </div>
        )}

        {/* Editor content */}
        <div className="flex-1 bg-surface rounded-xl border border-[--color-border] p-6 overflow-y-auto">
          {editor && <BubbleMenu editor={editor} />}
          <EditorContent editor={editor} className="novel-editor" />
        </div>

        {/* Writing goal status bar (hidden in reader mode) */}
        {!readOnly && (
          <div className="writing-goal mt-2 bg-surface rounded-lg border border-[--color-border]">
            <span title="当前字数">📝 {charCount} 字</span>
            <div className="progress-bar">
              <div
                className={`fill ${goalProgress >= 100 ? 'complete' : ''}`}
                style={{ width: `${Math.min(goalProgress, 100)}%` }}
              />
            </div>
            <span title="写作速度">⚡ {writingSpeed} 字/时</span>
            <span title="今日目标">🎯 {formatProgress(charCount, effectiveDailyGoal)}</span>
          </div>
        )}
      </div>
    )
  }
)
