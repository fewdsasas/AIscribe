import React, { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@renderer/utils/logger'
import { chapterService, characterService, novelService, projectService } from '@renderer/services'

interface SearchResult {
  type: 'project' | 'chapter' | 'character'
  id: string
  title: string
  subtitle: string
  projectId?: string
}

interface GlobalSearchProps {
  onSelectProject?: (id: string) => void
  onSelectChapter?: (chapterId: string, projectId: string) => void
  onClose: () => void
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectProject, onSelectChapter, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const items: SearchResult[] = []
    try {
      const projects = await projectService.list()
      if (projects) {
        for (const p of projects) {
          if (p.name.includes(q)) items.push({ type: 'project', id: p.id, title: p.name, subtitle: p.genre })
          const novel = await novelService.getByProject(p.id)
          if (novel) {
            const chapters = await chapterService.list(novel.id)
            if (chapters) {
              for (const ch of chapters) {
                if (ch.title.includes(q))
                  items.push({
                    type: 'chapter',
                    id: ch.id,
                    title: ch.title,
                    subtitle: `章节 · ${p.name}`,
                    projectId: p.id
                  })
              }
            }
            const characters = await characterService.list(novel.id)
            if (characters) {
              for (const c of characters) {
                if (c.name.includes(q))
                  items.push({
                    type: 'character',
                    id: c.id,
                    title: c.name,
                    subtitle: `角色 · ${p.name}`,
                    projectId: p.id
                  })
              }
            }
          }
        }
      }
    } catch {
      logger.warn('Search failed')
    }
    setResults(items)
    setSelectedIdx(0)
    setSearching(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 200)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(results.length - 1, i + 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(0, i - 1))
    }
    if (e.key === 'Enter' && results[selectedIdx]) {
      const r = results[selectedIdx]
      if (r.type === 'project') onSelectProject?.(r.id)
      else if (r.type === 'chapter' && r.projectId) onSelectChapter?.(r.id, r.projectId)
      else if (r.type === 'character' && r.projectId) onSelectProject?.(r.projectId)
      onClose()
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索项目... (Ctrl+K)"
            className="w-full px-4 py-3 bg-[--color-bg] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          />
        </div>
        {searching && (
          <div className="px-4 pb-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            搜索中...
          </div>
        )}
        {!searching && results.length > 0 && (
          <div className="px-2 pb-2 max-h-60 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => {
                  if (r.type === 'project') onSelectProject?.(r.id)
                  else if (r.type === 'chapter' && r.projectId) onSelectChapter?.(r.id, r.projectId)
                  else if (r.type === 'character' && r.projectId) onSelectProject?.(r.projectId)
                  onClose()
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                  i === selectedIdx ? 'bg-[--amber-50]' : 'hover:bg-[--color-bg]'
                }`}
              >
                <span>{r.type === 'project' ? '📁' : r.type === 'chapter' ? '📄' : '👤'}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium" style={{ color: 'var(--color-text)' }}>
                    {r.title}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {r.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {!searching && query && results.length === 0 && (
          <div className="px-4 pb-4 text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
            无结果
          </div>
        )}
      </div>
    </div>
  )
}
