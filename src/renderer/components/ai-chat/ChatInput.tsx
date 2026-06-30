import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

interface SkillOption {
  name: string
  description: string
}

interface ChatInputProps {
  onSend: (text: string, skillName?: string) => void
  disabled?: boolean
  placeholder?: string
  skills?: SkillOption[]
  isStreaming?: boolean
  onStop?: () => void
}

export interface ChatInputHandle {
  setText: (text: string) => void
  focus: () => void
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  (
    {
      onSend,
      disabled = false,
      placeholder = '输入你的创作需求...',
      skills: _skills = [],
      isStreaming = false,
      onStop
    },
    ref
  ) => {
    const [text, setText] = useState('')
    const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(
      ref,
      () => ({
        setText: (value: string) => {
          setText(value)
        },
        focus: () => {
          textareaRef.current?.focus()
        }
      }),
      []
    )

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
      }
    }, [text])

    const handleSend = () => {
      const trimmed = text.trim()
      if (!trimmed || disabled) return
      onSend(trimmed, selectedSkill ?? undefined)
      setText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      setSelectedSkill(null)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }

    const insertAt = (mark: string) => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newText = text.slice(0, start) + mark + text.slice(end)
      setText(newText)
      setTimeout(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = start + mark.length
      }, 0)
    }

    return (
      <div className="border-t border-[--color-border] bg-surface p-4">
        {/* Quick action buttons */}
        <div className="flex gap-1 mb-2">
          {[
            { label: '📋 结构', skill: 'story-structure', title: '插入故事结构技能' },
            { label: '👤 角色', skill: 'character-creation', title: '插入角色创建技能' },
            { label: '🌍 世界观', skill: 'world-building', title: '插入世界观技能' },
            { label: '✨ 润色', skill: 'revision-polish', title: '插入润色技能' }
          ].map(btn => (
            <button
              key={btn.skill}
              onClick={() => insertAt('#[技能: ' + btn.skill + ']')}
              className="text-[10px] px-2 py-1 rounded transition-colors"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
              title={btn.title}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-2.5 border border-[--color-border] rounded-xl text-sm resize-none focus:outline-none focus:border-[--accent] transition-colors"
              style={{ minHeight: 40, maxHeight: 120, background: 'var(--bg)' }}
              onFocus={e => (e.currentTarget.style.background = 'var(--color-surface)')}
              onBlur={e => (e.currentTarget.style.background = 'var(--bg)')}
            />
            {/* Skill indicator */}
            {selectedSkill && (
              <div className="absolute bottom-2 left-2">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                >
                  🔧 {selectedSkill}
                  <button className="ml-1 hover:text-[--color-primary-hover]" onClick={() => setSelectedSkill(null)}>
                    ✕
                  </button>
                </span>
              </div>
            )}
            {text.length > 0 && (
              <div className="text-[10px] text-right text-[--color-text-secondary] mt-1">Shift+Enter 换行</div>
            )}
          </div>

          {/* Send / Stop button */}
          {isStreaming && onStop ? (
            <button
              onClick={onStop}
              className="px-4 py-2.5 border border-red-300 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              停止
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || !text.trim()}
              className="px-4 py-2.5 bg-[--color-primary] text-white rounded-xl text-sm font-medium hover:bg-[--color-primary-hover] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {disabled ? '⏳' : '发送'}
            </button>
          )}
        </div>
      </div>
    )
  }
)

ChatInput.displayName = 'ChatInput'
