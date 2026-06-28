import React, { useState } from 'react'
import { StreamingText } from './StreamingText'
import { SkillInvocationCard } from './SkillInvocationCard'
import type { ChatMessage as ChatMessageType } from '../../store'

function renderContent(text: string): React.ReactNode {
  const parts = text.split('```')

  return parts.map((part, i) => {
    if (i % 2 === 0) {
      // Normal text — apply link detection
      if (!part) return null
      const urlParts = part.split(/(https?:\/\/[^\s<]+)/)
      return urlParts.map((subPart, j) => {
        if (!subPart) return null
        if (/^(https?:\/\/[^\s<]+)$/.test(subPart)) {
          return (
            <a key={`${i}-${j}`} href={subPart} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>
              {subPart}
            </a>
          )
        }
        return <span key={`${i}-${j}`} style={{ whiteSpace: 'pre-wrap' }}>{subPart}</span>
      })
    }

    // Code block content
    const lines = part.split('\n')
    let language = ''
    let codeContent = part

    if (lines.length > 1 && /^[a-zA-Z0-9_+#-]+$/.test(lines[0].trim())) {
      language = lines[0].trim()
      codeContent = lines.slice(1).join('\n')
    }

    return (
      <div key={i}>
        {language && (
          <div className="text-xs text-[--color-text-secondary] px-4 pt-2">{language}</div>
        )}
        <pre className="bg-[--ink-900] text-[--ink-100] p-4 rounded-lg overflow-x-auto my-2 text-sm font-mono">
          <code>{codeContent}</code>
        </pre>
      </div>
    )
  })
}

interface ChatMessageProps {
  message: ChatMessageType
  onRetry?: (messageId: string) => void
}

export const ChatMessage = React.memo<ChatMessageProps>(({ message, onRetry }) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isError = isAssistant && message.content.startsWith('⚠️')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`flex gap-3 mb-4 animate-fade-in-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
          isUser ? 'bg-[--color-primary] text-white' : 'bg-[--ink-100] text-[--color-text-secondary]'
        }`}
      >
        {isUser ? '你' : 'AI'}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Skill invocations */}
        {message.skillInvocations?.map((inv, i) => (
          <SkillInvocationCard key={`${inv.skillName}-${i}`} invocation={inv} />
        ))}

        {/* Text content bubble + copy button */}
        <div className="relative group">
          <div
            className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? 'bg-[--color-primary] text-white rounded-tr-sm'
                : isError
                  ? 'bg-[--danger-bg] text-[--danger] border border-red-300 rounded-tl-sm'
                  : 'bg-[--color-bg] text-[--color-text] rounded-tl-sm'
            }`}
          >
            {isAssistant && message.isStreaming ? (
              <StreamingText text={message.content} messageId={message.id} />
            ) : (
              renderContent(message.content)
            )}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded text-xs bg-[--color-surface] border border-[--color-border] text-[--color-text-secondary] hover:text-[--color-text] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>

        {/* Retry button for error messages */}
        {isError && onRetry && (
          <button
            onClick={() => onRetry(message.id)}
            className="mt-2 text-xs px-3 py-1 rounded-lg border border-[--color-primary] text-[--color-primary] hover:bg-[--accent-bg] transition-colors"
          >
            重新生成
          </button>
        )}

        {/* Timestamp */}
        <div className={`text-[10px] text-[--color-text-secondary] mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
})
