import React from 'react'
import { StreamingText } from './StreamingText'
import { SkillInvocationCard } from './SkillInvocationCard'
import type { ChatMessage as ChatMessageType } from '../../store'

interface ChatMessageProps {
  message: ChatMessageType
}

export const ChatMessage = React.memo<ChatMessageProps>(({ message }) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
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

        {/* Text content */}
        <div
          className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-[--color-primary] text-white rounded-tr-sm'
              : 'bg-[--color-bg] text-[--color-text] rounded-tl-sm'
          }`}
        >
          {isAssistant && message.isStreaming ? (
            <StreamingText text={message.content} messageId={message.id} />
          ) : (
            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
          )}
        </div>

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
