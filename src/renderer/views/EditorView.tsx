import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NovelEditor, type NovelEditorHandle } from '../components/editor/NovelEditor'
import { logger } from '../utils/logger'
import { useToast } from '../components/shared/Toast'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { useMemoryMonitor } from '../hooks/useMemoryMonitor'
import { chapterService, llmService, novelService, projectService } from '../services'
import type { ILLMService } from '../services'

interface EditorViewProps {
  projectId: string | null
  onNavigate?: (view: string) => void
  onSwitchProject?: (id: string) => void
}

async function generateContinuation(llm: ILLMService, text: string, signal?: AbortSignal): Promise<string> {
  if (!(await llm.isConfigured())) {
    const continuations = [
      '\n\n他抬起头，看向远方的天际线。夕阳将云层染成金红色，仿佛预示着即将到来的变故。',
      '\n\n风突然停了。四周陷入一种诡异的寂静，连虫鸣都消失了。她握紧了手中的剑。',
      '\n\n「这就是真相吗？」他喃喃自语，手中的信件微微颤抖。多年的追寻，终于有了答案。',
      '\n\n夜幕降临，繁星点点。他躺在屋顶上，回想着今天发生的一切。命运的齿轮已经开始转动。'
    ]
    await new Promise<void>(resolve => {
      if (signal?.aborted) {
        resolve()
        return
      }
      const timer = setTimeout(resolve, 800 + Math.random() * 1200)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true }
      )
    })
    if (signal?.aborted) return ''
    return continuations[Math.floor(Math.random() * continuations.length)]
  }
  const response = await llm.chat({
    messages: [
      { role: 'user', content: `请根据以下小说内容，续写一段合理的后续。保持相同的文风和叙事视角。\n\n${text}` }
    ],
    system: '你是一位专业的小说续写助手。请根据上下文风格续写内容，保持叙事连贯性。只输出续写内容本身。',
    stream: false
  })
  return '\n\n' + response.content.trim()
}

export const EditorView: React.FC<EditorViewProps> = ({ projectId, onSwitchProject }) => {
  useMemoryMonitor('EditorView')
  const { showToast } = useToast()
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved')
  const [aiContinuing, setAiContinuing] = useState(false)
  const [showProjectNav, setShowProjectNav] = useState(false)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [initialContent, setInitialContent] = useState<Record<string, unknown> | undefined>(undefined)
  const [chapterLoading, setChapterLoading] = useState(false)
  const [showAIConfirm, setShowAIConfirm] = useState(false)
  const editorContentRef = useRef<{ json: Record<string, unknown>; text: string; chars: number } | null>(null)
  const editorRef = useRef<NovelEditorHandle>(null)
  const isMountedRef = useRef(true)
  const aiAbortRef = useRef<AbortController | null>(null)

  // 统一清理：unmount 时清除所有异步副作用引用
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // 清理 AI 续写
      aiAbortRef.current?.abort()
      aiAbortRef.current = null
      // 清理 changeTimer
      if (changeTimerRef.current) {
        clearTimeout(changeTimerRef.current)
        changeTimerRef.current = null
      }
      // 释放章节内容引用，允许 GC 回收大 JSON 对象
      editorContentRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    const load = async () => {
      try {
        const novel = await novelService.getByProject(projectId)
        if (cancelled || !isMountedRef.current) return
        const novelId = novel?.id ?? projectId
        const list = await chapterService.list(novelId)
        if (cancelled || !isMountedRef.current) return
        if (list && list.length > 0) {
          setChapters(list.map(ch => ({ id: ch.id, title: ch.title })))
          setSelectedChapterId(list[0].id)
        }
      } catch (err) {
        if (!cancelled && isMountedRef.current) logger.warn('EditorView: 加载章节列表失败', err)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Load chapter content when selected chapter changes
  useEffect(() => {
    if (!selectedChapterId) return
    let cancelled = false
    const load = async () => {
      setChapterLoading(true)
      try {
        const chapter = await chapterService.get(selectedChapterId)
        if (cancelled || !isMountedRef.current) return
        if (chapter?.content) {
          try {
            const parsed = JSON.parse(chapter.content)
            setInitialContent(parsed)
            editorContentRef.current = {
              json: parsed,
              text: chapter.content,
              chars: chapter.wordCount ?? 0
            }
          } catch {
            // Plain text content
          }
        } else {
          setInitialContent(undefined)
        }
      } catch {
        if (!cancelled && isMountedRef.current) logger.warn('EditorView operation failed')
      }
      if (!cancelled && isMountedRef.current) setChapterLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [selectedChapterId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const list = await projectService.list()
        if (cancelled || !isMountedRef.current) return
        if (list) setProjects(list.map(p => ({ id: p.id, name: p.name })))
      } catch (err) {
        if (!cancelled && isMountedRef.current) logger.warn('EditorView: 加载项目列表失败', err)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const changeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleContentChange = useCallback((json: Record<string, unknown>, text: string, charCount: number) => {
    editorContentRef.current = { json, text, chars: charCount }
    if (changeTimerRef.current) return
    changeTimerRef.current = setTimeout(() => {
      changeTimerRef.current = null
    }, 500)
    setSaveStatus('unsaved')
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedChapterId || !editorContentRef.current) return
    setSaveStatus('saving')
    try {
      await chapterService.update(selectedChapterId, {
        content: JSON.stringify(editorContentRef.current.json)
      })
      if (isMountedRef.current) setSaveStatus('saved')
    } catch (err) {
      logger.error('EditorView: 保存章节失败', err)
      if (isMountedRef.current) setSaveStatus('unsaved')
    }
  }, [selectedChapterId])

  // Fix 1: AI continuation now inserts into TipTap via ref
  const handleAIContinue = useCallback(async () => {
    if (!editorContentRef.current?.text || aiContinuing) return
    setShowAIConfirm(true)
  }, [aiContinuing])

  const handleAIConfirm = useCallback(async () => {
    if (!editorContentRef.current?.text || aiContinuing) return
    setShowAIConfirm(false)
    setAiContinuing(true)
    const abort = new AbortController()
    aiAbortRef.current = abort
    try {
      const continuation = await generateContinuation(llmService, editorContentRef.current.text, abort.signal)
      if (abort.signal.aborted || !isMountedRef.current) return
      editorRef.current?.insertContent(continuation)
      if (isMountedRef.current) setSaveStatus('unsaved')
      if (isMountedRef.current) showToast('AI 续写完成', 'success')
    } catch {
      if (!abort.signal.aborted && isMountedRef.current) {
        showToast('AI 续写失败', 'error')
      }
    } finally {
      aiAbortRef.current = null
      if (isMountedRef.current) setAiContinuing(false)
    }
  }, [aiContinuing, showToast])

  // Fix 2: Project switching uses SPA navigation
  const handleSwitchProject = useCallback(
    (id: string) => {
      setShowProjectNav(false)
      onSwitchProject?.(id)
    },
    [onSwitchProject]
  )

  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <p>请选择一个项目或新建项目开始写作</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {/* SPA project switcher */}
        <div className="relative">
          <button
            onClick={() => setShowProjectNav(!showProjectNav)}
            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            📁 切换项目
          </button>
          {showProjectNav && (
            <div
              className="absolute top-full left-0 mt-1 w-48 bg-surface rounded-xl border shadow-lg z-10 py-1"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[--color-text-secondary]">暂无其他项目</div>
              ) : (
                projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProject(p.id)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[--color-bg] transition-colors"
                    style={{ color: p.id === projectId ? 'var(--color-primary)' : 'var(--color-text)' }}
                  >
                    {p.id === projectId ? '→ ' : ''}
                    {p.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <select
          value={selectedChapterId ?? ''}
          onChange={e => setSelectedChapterId(e.target.value || null)}
          className="bg-surface border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {chapters.length > 0 ? (
            chapters.map(ch => (
              <option key={ch.id} value={ch.id}>
                {ch.title}
              </option>
            ))
          ) : (
            <option value="">暂无章节，请先创建</option>
          )}
        </select>
        {chapterLoading && <span className="text-xs animate-spin">⏳</span>}

        <span
          className={`text-xs px-2 py-1 rounded`}
          style={{
            color:
              saveStatus === 'saved'
                ? 'var(--success)'
                : saveStatus === 'saving'
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
            background:
              saveStatus === 'saved' ? 'var(--success-bg)' : saveStatus === 'saving' ? 'var(--amber-50)' : 'transparent'
          }}
        >
          {saveStatus === 'saved' ? '✓ 已保存' : saveStatus === 'saving' ? '⏳ 保存中...' : '○ 未保存'}
        </span>

        <div className="ml-auto flex gap-2">
          <button
            onClick={handleAIContinue}
            disabled={aiContinuing}
            className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
          >
            {aiContinuing ? '⏳ AI 写作中...' : '🤖 AI 续写'}
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saved'}
            className="px-3 py-1.5 text-xs bg-[--color-primary] text-white rounded-lg font-medium disabled:opacity-50"
          >
            保存 (Ctrl+S)
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <NovelEditor
          ref={editorRef}
          chapterId={selectedChapterId ?? undefined}
          chapterTitle={chapters.find(c => c.id === selectedChapterId)?.title ?? '第一章'}
          initialContent={initialContent}
          onContentChange={handleContentChange}
          onSave={handleSave}
          placeholder="开始写作..."
        />
      </div>

      {/* AI Continue confirmation dialog */}
      {showAIConfirm && (
        <ConfirmDialog
          open={true}
          title="AI 续写"
          message="AI 将根据当前内容生成续写内容。是否继续？"
          confirmLabel="续写"
          onConfirm={handleAIConfirm}
          onCancel={() => setShowAIConfirm(false)}
        />
      )}
    </div>
  )
}
