import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { SimpleReader } from '../components/reader/SimpleReader'
import { logger } from '../utils/logger'
import { useMemoryMonitor } from '../hooks/useMemoryMonitor'
import { chapterService, novelService } from '../services'
import Skeleton from '../components/shared/Skeleton'
import type { AiRepairResult } from '@shared/types/ipc'

interface ReaderViewProps {
  projectId: string | null
  novelId?: string | null
}

export const ReaderView: React.FC<ReaderViewProps> = ({ projectId, novelId }) => {
  useMemoryMonitor('ReaderView')
  const [chapters, setChapters] = useState<{ id: string; title: string; content: string }[]>([])
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('reader-font-size')
    return saved ? Number(saved) : 18
  })
  const [repairing, setRepairing] = useState(false)

  // F35: 阅读设置持久化
  useEffect(() => {
    localStorage.setItem('reader-font-size', String(fontSize))
  }, [fontSize])

  // AI 手动修复
  const handleAiRepair = useCallback(async () => {
    const api = window.aiscribe
    if (!api || !novelId || !projectId || repairing) return

    setRepairing(true)
    try {
      const result: AiRepairResult = await api.triggerAiRepair({ novelId, projectId })
      if (result.applied) {
        // 重新加载章节
        const list = await chapterService.listWithContent(novelId)
        if (list) {
          setChapters(
            list.map(ch => ({
              id: ch.id,
              title: ch.title,
              content: ch.content
            }))
          )
        }
      }
    } catch {
      logger.warn('AI 修复失败')
    } finally {
      setRepairing(false)
    }
  }, [novelId, projectId, repairing])

  // 监听自动修复完成事件刷新章节列表
  useEffect(() => {
    const api = window.aiscribe
    if (!api || !novelId) return

    const onDone = () => {
      chapterService.listWithContent(novelId).then(list => {
        if (list) {
          setChapters(
            list.map(ch => ({
              id: ch.id,
              title: ch.title,
              content: ch.content
            }))
          )
        }
      })
    }
    api.onRepairDone(onDone)

    return () => {
      api.removeRepairListeners()
    }
  }, [novelId])

  // F33: 章节加载
  useEffect(() => {
    if (!projectId) {
      setChapters([])
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const novel = await novelService.get(projectId)
        const novelId = novel?.id ?? projectId
        // 阅读器需要章节正文，使用 listWithContent 获取完整内容
        const list = await chapterService.listWithContent(novelId)
        if (list) {
          setChapters(
            list.map(ch => ({
              id: ch.id,
              title: ch.title,
              content: ch.content
            }))
          )
        }
      } catch {
        logger.warn('Failed to load reader data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  // F34: 左右箭头键切换章节
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedChapterIdx(i => Math.max(0, i - 1))
      } else if (e.key === 'ArrowRight') {
        setSelectedChapterIdx(i => Math.min(chapters.length - 1, i + 1))
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [chapters.length])

  const currentChapter = chapters[selectedChapterIdx]
  const parsedContent: Record<string, unknown> | undefined = useMemo(() => {
    if (!currentChapter?.content) return undefined
    try {
      return JSON.parse(currentChapter.content)
    } catch {
      return undefined
    }
  }, [currentChapter?.content])

  if (!projectId || (!loading && chapters.length === 0)) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">📖</div>
          <p>请选择一个项目开始阅读</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Reader toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={selectedChapterIdx}
            onChange={e => setSelectedChapterIdx(Number(e.target.value))}
            className="bg-surface border rounded-lg px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {chapters.map((ch, i) => (
              <option key={ch.id} value={i}>
                {ch.title}
              </option>
            ))}
          </select>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {selectedChapterIdx + 1} / {chapters.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiRepair}
            disabled={repairing || !novelId || !projectId}
            className="px-2 py-1 text-xs rounded border disabled:opacity-30"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {repairing ? '修复中...' : 'AI 修复'}
          </button>
          <button
            onClick={() => setFontSize(s => Math.max(14, s - 2))}
            className="px-2 py-1 text-xs rounded border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            A-
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {fontSize}px
          </span>
          <button
            onClick={() => setFontSize(s => Math.min(28, s + 2))}
            className="px-2 py-1 text-xs rounded border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            A+
          </button>
        </div>
      </div>

      {/* Reader content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto max-w-2xl">
          {loading ? (
            <Skeleton count={8} height="20px" />
          ) : (
            <SimpleReader content={parsedContent ?? { type: 'doc', content: [] }} />
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setSelectedChapterIdx(i => Math.max(0, i - 1))}
          disabled={selectedChapterIdx === 0}
          className="px-4 py-2 text-sm rounded-lg disabled:opacity-30 transition-opacity"
          style={{ color: 'var(--color-primary)' }}
        >
          ← 上一章
        </button>
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          已读 {Math.round(((selectedChapterIdx + 1) / chapters.length) * 100)}%
        </span>
        <button
          onClick={() => setSelectedChapterIdx(i => Math.min(chapters.length - 1, i + 1))}
          disabled={selectedChapterIdx === chapters.length - 1}
          className="px-4 py-2 text-sm rounded-lg disabled:opacity-30 transition-opacity"
          style={{ color: 'var(--color-primary)' }}
        >
          下一章 →
        </button>
      </div>
    </div>
  )
}
