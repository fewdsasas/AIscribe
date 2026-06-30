import React, { useCallback, useEffect, useState } from 'react'
import { PlotTimeline } from '../components/studio/PlotTimeline'
import { CharacterNetwork } from '../components/studio/CharacterNetwork'
import { WorldConsistency } from '../components/studio/WorldConsistency'
import type { Character, PlotBeat, World } from '../../shared/types'
import { logger } from '../utils/logger'
import { characterService, novelService, plotStructureService, worldService } from '../services'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { ErrorRetry } from '../components/shared/ErrorRetry'

interface StudioViewProps {
  projectId: string | null
}

type StudioTab = 'structure' | 'characters' | 'world'

// (No sample data — real data only)

export const StudioView: React.FC<StudioViewProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('structure')

  // Loaded data from IPC
  const [beats, setBeats] = useState<PlotBeat[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [world, setWorld] = useState<World | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Fetch data when projectId changes
  const fetchData = useCallback(async () => {
    if (!projectId) return

    setLoadError(null)
    setLoading(true)
    try {
      // Try to get novel first
      const novel = await novelService.get(projectId)
      const novelId = novel?.id ?? projectId

      // Fetch plot structure, characters, and world in parallel
      const [plotResult, chars, worldResult] = await Promise.all([
        plotStructureService.getByNovel(novelId),
        characterService.list(novelId),
        worldService.getByNovel(novelId)
      ])

      if (plotResult?.beats) setBeats(plotResult.beats)
      if (chars) setCharacters(chars)
      if (worldResult) setWorld(worldResult)
    } catch (err) {
      logger.error('Failed to load studio data:', err)
      setLoadError('数据加载失败')
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const tabIds: StudioTab[] = ['structure', 'characters', 'world']
  const { handleKeyDown } = useKeyboardNav({
    items: tabIds,
    direction: 'horizontal',
    loop: true,
    onActivate: i => setActiveTab(tabIds[i])
  })

  const tabs: { id: StudioTab; label: string; icon: string }[] = [
    { id: 'structure', label: '故事结构', icon: '📋' },
    { id: 'characters', label: '角色设计', icon: '👤' },
    { id: 'world', label: '世界观', icon: '🌍' }
  ]

  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center text-[--color-text-secondary]">
        <div className="text-center">
          <div className="text-4xl mb-4">🎨</div>
          <p>请选择一个项目开始创作</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[--color-text-secondary]">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-4">⏳</div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center text-[--color-text-secondary]">
        <ErrorRetry message={loadError} onRetry={fetchData} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs — 仅文字+底线 */}
      <div className="tab-bar" onKeyDown={handleKeyDown} role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-bar-btn ${activeTab === tab.id ? 'tab-bar-btn-active' : ''}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        key={activeTab}
        className="animate-fade-in-up flex-1 bg-surface rounded-xl border border-[--color-border] p-6"
      >
        {activeTab === 'structure' &&
          (beats.length > 0 ? (
            <PlotTimeline beats={beats} framework="三幕剧" />
          ) : (
            <div className="text-center py-12 text-[--color-text-secondary]">
              <div className="text-3xl mb-3">📋</div>
              <p>暂无节拍数据</p>
              <p className="text-xs mt-1">在「AI 对话」中使用故事结构技能创建</p>
            </div>
          ))}

        {activeTab === 'characters' &&
          (characters.length > 0 ? (
            <CharacterNetwork characters={characters} />
          ) : (
            <div className="text-center py-12 text-[--color-text-secondary]">
              <div className="text-3xl mb-3">👤</div>
              <p>暂无角色数据</p>
              <p className="text-xs mt-1">在「AI 对话」中使用角色塑造技能创建</p>
            </div>
          ))}

        {activeTab === 'world' && world && (
          <WorldConsistency
            items={(world.consistency ?? []).map(c => ({
              category: c.category,
              severity: (c.status === 'fail' ? 'error' : c.status === 'warning' ? 'warning' : 'info') as
                | 'error'
                | 'warning'
                | 'info',
              message: c.description,
              suggestion: `检查 ${c.category} 的一致性`
            }))}
            worldName={world.name}
          />
        )}

        {activeTab === 'world' && !world && (
          <div className="text-center py-12 text-[--color-text-secondary]">
            <div className="text-3xl mb-3">🌍</div>
            <p>暂无世界观数据</p>
            <p className="text-xs mt-1">在「技能工坊」中使用世界观构建技能创建</p>
          </div>
        )}
      </div>
    </div>
  )
}
