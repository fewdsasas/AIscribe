import React, { useEffect, useState } from 'react'
import { skillService } from '../services'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import ErrorRetry from '../components/shared/ErrorRetry'
import Skeleton from '../components/shared/Skeleton'

interface WorkshopViewProps {
  projectId: string | null
}

interface SkillInfo {
  name: string
  description: string
}

export const WorkshopView: React.FC<WorkshopViewProps> = ({ projectId: _projectId }) => {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [resultLoading, setResultLoading] = useState(false)

  const { activeIndex, handleKeyDown } = useKeyboardNav({
    items: skills,
    direction: 'vertical',
    loop: true,
    onActivate: (i) => { setSelectedSkill(skills[i].name); setResult(null) }
  })

  useEffect(() => {
    // Load available skills via IPC
    const load = async () => {
      try {
        const list = await skillService.list()
        setSkills(list ?? [])
        setLoading(false)
      } catch {
        // Fallback for dev/testing
        setSkills([
          { name: 'story-structure', description: '故事结构 — 8种叙事框架' },
          { name: 'character-creation', description: '人物塑造 — 角色设计与弧光' },
          { name: 'world-building', description: '世界观构建 — 六大要素' },
          { name: 'novel-workflow', description: '网文创作流程' },
          { name: 'revision-polish', description: '改稿与打磨' },
          { name: 'anti-ai-rewrite', description: '去AI味改写' },
          { name: 'book-analyzer', description: '拆文分析' },
          { name: 'market-radar', description: '市场雷达' },
          { name: 'novel-master', description: '创作总控台' }
        ])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleInvoke = async () => {
    if (!selectedSkill || !prompt.trim()) return
    setResultLoading(true)
    try {
      const res = await skillService.invoke(selectedSkill, { prompt })
      setResult(res?.output ?? (res?.metadata as { description?: string } | undefined)?.description ?? '技能已执行')
    } catch (err) {
      setResult(`错误: ${(err as Error).message}`)
    }
    setResultLoading(false)
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {!_projectId ? (
        <div className="h-full flex items-center justify-center text-[--color-text-secondary]">
          <div className="text-center">
            <div className="text-4xl mb-4">🔧</div>
            <p>请先选择一个项目</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          {/* Skill list */}
          <div className="w-full lg:w-56 shrink-0">
            <h3 className="text-sm font-medium mb-3">可用技能</h3>
            {loading ? (
              <Skeleton count={6} height="64px" />
            ) : (
              <div className="space-y-1" onKeyDown={handleKeyDown} tabIndex={0}>
                {skills.map((skill, index) => (
                  <button
                    key={skill.name}
                    onClick={() => {
                      setSelectedSkill(skill.name)
                      setResult(null)
                    }}
                    data-active={index === activeIndex}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                      selectedSkill === skill.name
                        ? 'border border-[--accent] text-[--accent]'
                        : 'bg-surface border border-[--color-border] hover:border-[--accent] text-[--color-text]'
                    }`}
                    style={{
                      background: selectedSkill === skill.name ? 'var(--amber-50)' : '',
                      ...(index === activeIndex ? { borderLeft: '3px solid var(--accent)' } : {})
                    }}
                  >
                    <div className="font-medium">{skill.name}</div>
                    <div className="text-xs text-[--color-text-secondary] mt-0.5 line-clamp-2">{skill.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat / invoke area */}
          <div className="flex-1 flex flex-col min-h-0">
            {selectedSkill ? (
              <>
                <div className="bg-surface rounded-xl border border-[--color-border] p-4 mb-4">
                  <h4 className="text-sm font-medium mb-1">当前技能: {selectedSkill}</h4>
                  <p className="text-xs text-[--color-text-secondary]">
                    {skills.find(s => s.name === selectedSkill)?.description}
                  </p>
                </div>

                <div className="flex-1 bg-surface rounded-xl border border-[--color-border] p-4 mb-4 overflow-auto min-h-0">
                  {resultLoading ? (
                    <Skeleton count={3} />
                  ) : result ? (
                    result.startsWith('错误:') || result.startsWith('Error:') ? (
                      <ErrorRetry message="技能执行失败" onRetry={handleInvoke} />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{result}</div>
                    )
                  ) : (
                    <div className="text-sm text-[--color-text-secondary]">输入你的需求，AI 将调用该技能为你服务</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvoke()}
                    placeholder={`输入你的需求，使用 ${selectedSkill} 技能...`}
                    className="flex-1 px-4 py-2.5 bg-surface border border-[--color-border] rounded-lg text-sm focus:outline-none focus:border-[--color-primary]"
                  />
                  <button
                    onClick={handleInvoke}
                    disabled={resultLoading || !prompt.trim()}
                    className="px-6 py-2.5 bg-[--color-primary] text-white rounded-lg text-sm font-medium hover:bg-[--color-primary-hover] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resultLoading ? '执行中...' : '发送'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[--color-text-secondary]">
                <div className="text-center">
                  <div className="text-4xl mb-4">🔧</div>
                  <p>请从左侧选择一个技能</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
