import { SIMULATED_STREAM_BASE_DELAY_MS, SIMULATED_STREAM_MAX_EXTRA_DELAY_MS } from '../../../shared/constants'
import type { AppStore } from '../../store'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { ChatMessage } from './ChatMessage'
import { ChatInput, type ChatInputHandle } from './ChatInput'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { DEFAULT_RESPONSE, NO_SKILL_RESPONSE, SIMULATED_RESPONSES } from './simulated-responses'
import { logger } from '../../utils/logger'
import { useToast } from '../../components/shared/Toast'
import { learningService, llmService } from '../../services'
import type { LLMMessage } from '../../../shared/types'

interface AIChatViewProps {
  projectId: string | null
}

// Skill detection: support both English IDs and Chinese keywords
function detectSkill(text: string): string | null {
  const skillPatterns: { id: string; keywords: string[] }[] = [
    { id: 'story-structure', keywords: ['story-structure', '结构', '三幕', '节拍', '框架', '大纲', '情节'] },
    { id: 'character-creation', keywords: ['character-creation', '角色', '人物', '人设', '性格', '反派', '主角'] },
    {
      id: 'world-building',
      keywords: ['world-building', '世界观', '世界', '设定', '地理', '历史', '力量体系', '魔法']
    },
    { id: 'novel-workflow', keywords: ['novel-workflow', '流程', '网文', '签约', '上架', '日更'] },
    { id: 'revision-polish', keywords: ['revision-polish', '润色', '修改', '改稿', '打磨', '优化'] },
    { id: 'anti-ai-rewrite', keywords: ['anti-ai-rewrite', 'AI味', '去AI', '改写'] },
    { id: 'book-analyzer', keywords: ['book-analyzer', '分析', '拆书', '风格', '提取'] },
    { id: 'market-radar', keywords: ['market-radar', '市场', '趋势', '热度'] }
  ]

  const lower = text.toLowerCase()
  for (const pattern of skillPatterns) {
    for (const keyword of pattern.keywords) {
      if (lower.includes(keyword) || text.includes(keyword)) return pattern.id
    }
  }
  return null
}

// Simulated streaming for development (no API key needed)
async function simulateStreamingResponse(
  userMessage: string,
  onChunk: (chunk: string) => void,
  onSkillInvocation?: (skillName: string, onComplete: () => void) => void,
  signal?: AbortSignal
): Promise<string> {
  const selectedSkill = detectSkill(userMessage)

  const responseText = selectedSkill ? (SIMULATED_RESPONSES[selectedSkill] ?? DEFAULT_RESPONSE) : NO_SKILL_RESPONSE
  let accumulated = ''

  // Trigger skill invocation card before streaming starts
  if (selectedSkill && onSkillInvocation) {
    onSkillInvocation(selectedSkill, () => {})
  }

  // Stream character by character
  const chars = responseText.split('')
  for (let i = 0; i < chars.length; i++) {
    if (signal?.aborted) return accumulated
    await new Promise(resolve =>
      setTimeout(resolve, SIMULATED_STREAM_BASE_DELAY_MS + Math.random() * SIMULATED_STREAM_MAX_EXTRA_DELAY_MS)
    )
    if (signal?.aborted) return accumulated
    accumulated += chars[i]
    onChunk(chars[i])
  }

  return accumulated
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return '今天'
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

const STREAM_TIMEOUT_MS = 5 * 60 * 1000

const MAX_VISIBLE_MESSAGES = 100 // 最大可见消息数

export const AIChatView: React.FC<AIChatViewProps> = ({ projectId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const streamStartRef = useRef(0)
  const chatInputRef = useRef<ChatInputHandle>(null)
  const userScrolledUpRef = useRef(false)
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<string | null>(null)
  // AbortController for the simulated streaming fallback (cancelled on unmount)
  const simulateAbortRef = useRef<AbortController | null>(null)
  // Ref for the simulated skill-invocation setTimeout (cleaned up on unmount)
  const skillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Local settle closure to end the streaming Promise after main-process abort
  // (main process silently returns on AbortError without invoking onError)
  const settleRef = useRef<(() => void) | null>(null)
  // Refs for streaming callbacks to prevent listener leaks
  const onChunkRef = useRef<(chunk: string) => void>(() => {})
  const onDoneRef = useRef<() => void>(() => {})
  const onErrorRef = useRef<(err: string) => void>(() => {})
  const [isConfigured, setIsConfigured] = useState(false)
  const [visibleMessageCount, setVisibleMessageCount] = useState(MAX_VISIBLE_MESSAGES)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const { showToast } = useToast()

  const messages = useAppStore((s: AppStore) => s.messages)

  // Reset visible message count when messages are cleared
  useEffect(() => {
    if (messages.length === 0) {
      setVisibleMessageCount(MAX_VISIBLE_MESSAGES)
    }
  }, [messages.length])
  const isStreaming = useAppStore((s: AppStore) => s.isStreaming)
  const suggestions = useAppStore((s: AppStore) => s.suggestions)
  const nextActions = useAppStore((s: AppStore) => s.nextActions)
  const evolvedShortcuts = useAppStore((s: AppStore) => s.evolvedShortcuts)
  const addMessage = useAppStore((s: AppStore) => s.addMessage)
  const appendToMessage = useAppStore((s: AppStore) => s.appendToMessage)
  const setStreaming = useAppStore((s: AppStore) => s.setStreaming)
  const updateMessage = useAppStore((s: AppStore) => s.updateMessage)
  const addSkillInvocation = useAppStore((s: AppStore) => s.addSkillInvocation)
  const updateSkillInvocation = useAppStore((s: AppStore) => s.updateSkillInvocation)
  const clearMessages = useAppStore((s: AppStore) => s.clearMessages)
  const setSuggestions = useAppStore((s: AppStore) => s.setSuggestions)
  const setNextActions = useAppStore((s: AppStore) => s.setNextActions)
  const setEvolvedShortcuts = useAppStore((s: AppStore) => s.setEvolvedShortcuts)
  const loadFromStorage = useAppStore((s: AppStore) => s.loadFromStorage)

  // Set up IPC streaming listeners ONCE (not per-request)
  useEffect(() => {
    llmService.onChunk((chunk: string) => onChunkRef.current(chunk))
    llmService.onDone(() => onDoneRef.current())
    llmService.onError((err: string) => onErrorRef.current(err))

    // Cleanup: remove all IPC listeners on unmount
    return () => {
      llmService.removeListeners()
      // Abort any in-flight simulated stream so its setTimeout chain stops
      if (simulateAbortRef.current) {
        simulateAbortRef.current.abort()
        simulateAbortRef.current = null
      }
      // Clear any pending simulated skill-invocation timer
      if (skillTimerRef.current) {
        clearTimeout(skillTimerRef.current)
        skillTimerRef.current = null
      }
    }
  }, [])

  // Check if LLM is configured on mount
  useEffect(() => {
    llmService
      .isConfigured()
      .then(setIsConfigured)
      .catch(err => {
        logger.warn('LLM 配置检测失败:', err)
      })
  }, [])

  // Load persisted chat messages on mount
  useEffect(() => {
    loadFromStorage().catch((err: unknown) => {
      logger.warn('加载聊天记录失败:', err)
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

  // Run learning analysis and display results
  const runLearningAnalysis = useCallback(async () => {
    if (!projectId) return
    try {
      const result = await learningService.analyze(projectId)
      if (result) {
        setSuggestions((result.suggestions as string[]) ?? [])
        setNextActions((result.nextActions as { suggestedSkill: string; reason: string; confidence: number }[]) ?? [])
        setEvolvedShortcuts((result.shortcuts as { name: string; description: string; baseSkill: string }[]) ?? [])
      }
    } catch (err) {
      logger.warn('Learning analysis failed:', err)
    }
  }, [projectId, setSuggestions, setNextActions, setEvolvedShortcuts])

  const handleSend = async (text: string, skillName?: string) => {
    if (!projectId) return

    // Force scroll to bottom when user sends a new message
    userScrolledUpRef.current = false
    setUserScrolledUp(false)
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })

    addMessage({ role: 'user', content: text })
    const sessionId = `session-${Date.now()}`
    streamStartRef.current = performance.now()

    const assistantMsg = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
      skillInvocations: []
    })

    setStreaming(true)
    let fullResponse = ''
    const detectedSkill = detectSkill(text) ?? skillName

    try {
      // Check if LLM is configured via secure IPC
      const isConfigured = await llmService.isConfigured()
      const useRealLLM = isConfigured

      if (useRealLLM) {
        // Use ref-based streaming (listeners registered once in useEffect)
        await new Promise<void>((resolve, reject) => {
          let settled = false
          const settle = (fn: () => void) => {
            if (!settled) {
              settled = true
              fn()
            }
          }
          const requestId = crypto.randomUUID()
          abortRef.current = requestId
          settleRef.current = () => settle(reject.bind(null, new Error('已取消')))

          onChunkRef.current = (chunk: string) => {
            fullResponse += chunk
            appendToMessage(assistantMsg.id, chunk)
          }
          onDoneRef.current = () => {
            if (streamTimerRef.current) clearTimeout(streamTimerRef.current)
            settle(resolve)
          }
          onErrorRef.current = (err: string) => {
            if (streamTimerRef.current) clearTimeout(streamTimerRef.current)
            settle(reject.bind(null, new Error(err)))
          }

          streamTimerRef.current = setTimeout(() => {
            settle(reject.bind(null, new Error('流式响应超时，请重试')))
          }, STREAM_TIMEOUT_MS)

          llmService.startStream({
            messages: [
              ...(detectedSkill
                ? [
                    {
                      role: 'system' as const,
                      content: `你是一个专业的中国网文创作助手。用户正在使用技能【${detectedSkill}】。请提供专业、详细的创作建议。回复使用中文。`
                    }
                  ]
                : [
                    {
                      role: 'system' as const,
                      content: '你是一个专业的中国网文创作助手。请用中文回复，提供专业、详细的创作建议。'
                    }
                  ]),
              { role: 'user' as const, content: text }
            ] as LLMMessage[],
            requestId
          })
        })
      } else {
        // Fall back to simulation
        let skillCompleted = false
        const simulateController = new AbortController()
        simulateAbortRef.current = simulateController

        fullResponse = await simulateStreamingResponse(
          text,
          chunk => {
            appendToMessage(assistantMsg.id, chunk)
          },
          (ds, onComplete) => {
            addSkillInvocation(assistantMsg.id, {
              skillName: ds,
              input: text,
              output: '',
              duration: 0,
              status: 'running'
            })
            const skillDuration = 1.2 + Math.random() * 2
            skillTimerRef.current = setTimeout(() => {
              skillTimerRef.current = null
              if (!skillCompleted) {
                skillCompleted = true
                updateSkillInvocation(assistantMsg.id, ds, {
                  status: 'completed',
                  output: '技能执行完成',
                  duration: skillDuration
                })
                onComplete()
              }
            }, 1500)
          },
          simulateController.signal
        )
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '未知错误'
      if (!fullResponse) {
        updateMessage(assistantMsg.id, { content: `⚠️ ${errMsg}`, isStreaming: false })
      } else {
        appendToMessage(assistantMsg.id, `\n\n⚠️ ${errMsg}`)
        updateMessage(assistantMsg.id, { isStreaming: false })
      }
    } finally {
      abortRef.current = null
      settleRef.current = null
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current)
        streamTimerRef.current = null
      }
      if (skillTimerRef.current) {
        clearTimeout(skillTimerRef.current)
        skillTimerRef.current = null
      }
      simulateAbortRef.current = null
      updateMessage(assistantMsg.id, { isStreaming: false })
      setStreaming(false)

      // Record trajectory in learning system
      const duration = performance.now() - streamStartRef.current
      try {
        await learningService.record({
          projectId,
          sessionId,
          skillId: detectedSkill ?? 'general-chat',
          query: text,
          response: fullResponse,
          duration: Math.round(duration)
        })

        // Run analysis periodically (every 3 messages)
        if (messages.length > 0 && messages.length % 3 === 0) {
          runLearningAnalysis()
        }
      } catch {
        // Learning recording is non-critical
      }
    }
  }

  // Run initial analysis when projectId changes
  useEffect(() => {
    if (projectId) runLearningAnalysis()
  }, [projectId, runLearningAnalysis])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-[--color-text]">AI 创作助手</h2>
          <p className="text-xs text-[--color-text-secondary]">
            {messages.length} 条消息
            {projectId && ' · 学习分析进行中'}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs px-3 py-1.5 rounded-lg text-[--color-text-secondary] hover:bg-[--color-bg] transition-colors"
          >
            🗑️ 清空对话
          </button>
        )}
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        title="清空对话"
        message="确定要清空所有对话记录吗？此操作不可恢复。"
        confirmLabel="清空"
        onConfirm={() => { clearMessages(); showToast('对话已清空', 'success'); setShowClearConfirm(false) }}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* Learning insights panel */}
      {(suggestions.length > 0 || nextActions.length > 0 || evolvedShortcuts.length > 0) && (
        <div className="mb-3 space-y-2">
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-1">
              {suggestions.slice(0, 2).map((s: string, i: number) => (
                <div key={i} className="text-xs px-3 py-1.5 rounded-lg bg-[--amber-50] text-[--color-primary]">
                  💡 {s}
                </div>
              ))}
            </div>
          )}

          {/* Next actions */}
          {nextActions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {nextActions.slice(0, 3).map((a: { suggestedSkill: string; confidence: number }, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    chatInputRef.current?.setText(`使用技能【${a.suggestedSkill}】`)
                    chatInputRef.current?.focus()
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[--color-primary] text-[--color-primary] hover:bg-[--amber-50] transition-colors flex items-center gap-1"
                >
                  🤖 {a.suggestedSkill}
                  <span className="opacity-60">{Math.round(a.confidence * 100)}%</span>
                </button>
              ))}
            </div>
          )}

          {/* Evolved shortcuts */}
          {evolvedShortcuts.length > 0 && (
            <div>
              <div className="flex gap-2 flex-wrap">
                {evolvedShortcuts.map((s: { name: string; description: string }, i: number) => (
                  <div
                    key={i}
                    className="text-[10px] px-2 py-1 rounded-lg bg-[--success-bg] text-[var(--success)] flex items-center gap-1"
                    title={s.description}
                  >
                    ⚡ {s.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-2 min-h-0 pb-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[--color-text-secondary]">
            <div className="text-center max-w-md">
              <div className="text-4xl mb-4">🤖</div>
              <p className="text-sm mb-2">开始与 AI 助手对话</p>
              <p className="text-xs">你可以直接提问，或使用快捷按钮调用创作技能</p>
              {!isConfigured && (
                <p
                  className="text-xs mt-3 px-3 py-1.5 rounded-lg inline-block"
                  style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                >
                  💡 在「设置 → LLM 配置」中填入 API Key 可使用真实 AI
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 text-left">
                {[
                  { label: '📋 规划故事结构', desc: '生成三幕剧/英雄之旅等框架' },
                  { label: '👤 设计角色', desc: '创建角色档案和成长弧线' },
                  { label: '🌍 构建世界观', desc: '六大要素完整构建' },
                  { label: '✨ 润色文字', desc: 'L1-L3 三层递进修改' }
                ].map(item => (
                  <div key={item.label} className="p-3 bg-[--color-bg] rounded-lg text-sm">
                    <div className="font-medium text-[--color-text]">{item.label}</div>
                    <div className="text-xs text-[--color-text-secondary] mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Load more button */}
            {messages.length > visibleMessageCount && (
              <button
                onClick={() => setVisibleMessageCount(prev => prev + MAX_VISIBLE_MESSAGES)}
                className="w-full py-2 text-xs text-[--color-text-secondary] hover:text-[--color-text] transition-colors"
              >
                查看更早的 {Math.min(MAX_VISIBLE_MESSAGES, messages.length - visibleMessageCount)} 条消息 ↑
              </button>
            )}
            {/* Render only visible messages */}
            {(() => {
              const visibleMessages = messages.slice(-visibleMessageCount)
              let lastDateKey: string | undefined
              const elements: React.ReactNode[] = []

              visibleMessages.forEach(msg => {
                const dateKey = new Date(msg.timestamp).toDateString()
                if (lastDateKey !== undefined && dateKey !== lastDateKey) {
                  elements.push(
                    <div key={`date-${dateKey}`} className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-[--color-border]" />
                      <span className="text-xs text-[--color-text-secondary] shrink-0">{getDateLabel(msg.timestamp)}</span>
                      <div className="flex-1 h-px bg-[--color-border]" />
                    </div>
                  )
                }
                lastDateKey = dateKey
                elements.push(<ChatMessage key={msg.id} message={msg} />)
              })

              return elements
            })()}
          </div>
        )}
        <div ref={messagesEndRef} />
        {/* Scroll-to-bottom button */}
        {userScrolledUp && (
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              userScrolledUpRef.current = false
              setUserScrolledUp(false)
            }}
            className="sticky bottom-4 float-right w-9 h-9 rounded-full bg-[--color-primary] text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            ↓
          </button>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <ChatInput
            ref={chatInputRef}
            onSend={handleSend}
            disabled={isStreaming}
            placeholder={isStreaming ? 'AI 正在回复...' : '输入你的创作需求...'}
          />
        </div>
          {isStreaming && (
            <button
              onClick={() => {
                const id = abortRef.current
                if (id) {
                  llmService.cancelStream(id).catch(() => {})
                }
                settleRef.current?.()
              }}
              className="px-3 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors text-sm shrink-0"
            >
              停止
            </button>
          )}
        </div>
    </div>
  )
}
