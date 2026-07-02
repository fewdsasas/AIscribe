import type { StateCreator } from 'zustand'
import { storageService } from '@renderer/services'
import { logger } from '../utils/logger'
import { CHAT_SAVE_DEBOUNCE_MS } from '@shared/constants'

function genId(): string {
  return crypto.randomUUID()
}

const STORAGE_KEY = 'aiscribe-chat-history'
const SAVE_DEBOUNCE_MS = CHAT_SAVE_DEBOUNCE_MS
const MAX_MESSAGES = 500
const MAX_STREAMING_CONTENT = 500_000

export interface SkillInvocation {
  skillName: string
  input: string
  output: string
  duration: number
  status: 'running' | 'completed' | 'error'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  isStreaming?: boolean
  skillInvocations?: SkillInvocation[]
}

export interface ChatSlice {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingContent: string
  streamingMessageId: string | null
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => ChatMessage
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  appendToMessage: (id: string, text: string) => void
  setStreaming: (streaming: boolean) => void
  clearMessages: () => void
  addSkillInvocation: (messageId: string, invocation: SkillInvocation) => void
  updateSkillInvocation: (messageId: string, skillName: string, updates: Partial<SkillInvocation>) => void
  loadFromStorage: () => Promise<void>
}

let saveWarningShown = false
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingMessages: ChatMessage[] | null = null
// Set by createChatSlice so module-level flushSave can read the latest state.
// During streaming, appendToMessage updates streamingContent (not messages) and
// skips scheduleSave, so pendingMessages can be stale until setStreaming(false)
// merges the buffered content. flushSave uses this getter to fall back to the
// current state when a save is forced mid-stream (e.g. beforeunload).
let getLatestState: (() => ChatSlice | null) | null = null

function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  // During active streaming pendingMessages may be stale (streaming content is
  // buffered in streamingContent, not yet merged into messages). Fall back to
  // the live state and merge the buffered content so a forced save (e.g.
  // beforeunload) persists the latest text.
  let messagesToSave = pendingMessages
  if (getLatestState) {
    const state = getLatestState()
    if (state && state.isStreaming && state.streamingMessageId && state.streamingContent) {
      messagesToSave = state.messages.map(m =>
        m.id === state.streamingMessageId
          ? { ...m, content: m.content + state.streamingContent, isStreaming: false }
          : m
      )
    }
  }
  if (messagesToSave) {
    saveMessagesNow(messagesToSave)
    pendingMessages = null
  }
}

function scheduleSave(messages: ChatMessage[]): void {
  pendingMessages = messages
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    if (pendingMessages) {
      saveMessagesNow(pendingMessages)
      pendingMessages = null
    }
  }, SAVE_DEBOUNCE_MS)
}

async function saveMessagesNow(messages: ChatMessage[]): Promise<boolean> {
  try {
    const completed = messages.map(m => ({ ...m, isStreaming: false }))
    const ok = await storageService.set(STORAGE_KEY, JSON.stringify(completed))
    if (!ok) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed))
    }
    return true
  } catch {
    if (!saveWarningShown) {
      saveWarningShown = true
      logger.warn('聊天记录保存失败：存储空间不足或不可用')
    }
    return false
  }
}

async function loadMessagesFromStorage(): Promise<ChatMessage[]> {
  try {
    let saved: string | null = await storageService.get(STORAGE_KEY)
    if (saved === null) {
      saved = localStorage.getItem(STORAGE_KEY)
    }
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function pruneMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_MESSAGES) return messages
  return messages.slice(messages.length - MAX_MESSAGES)
}

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set, get) => {
  // Allow module-level flushSave to read the latest state (e.g. for beforeunload)
  getLatestState = () => get()

  // Flush any pending (or in-flight streaming) messages before the window unloads
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      flushSave()
    })
  }

  return {
    messages: [],
    isStreaming: false,
    streamingContent: '',
    streamingMessageId: null,

    addMessage: msg => {
      const newMsg: ChatMessage = {
        ...msg,
        id: genId(),
        timestamp: new Date().toISOString()
      }
      set(state => {
        const messages = pruneMessages([...state.messages, newMsg])
        scheduleSave(messages)
        return {
          messages,
          streamingMessageId: msg.isStreaming ? newMsg.id : state.streamingMessageId
        }
      })
      return newMsg
    },

    updateMessage: (id, updates) => {
      set(state => {
        const messages = state.messages.map(m => (m.id === id ? { ...m, ...updates } : m))
        scheduleSave(messages)
        return { messages }
      })
    },

    appendToMessage: (id, text) => {
      const state = get()
      if (state.isStreaming && state.streamingMessageId === id) {
        const newContent = state.streamingContent + text
        if (newContent.length > MAX_STREAMING_CONTENT) {
          logger.warn(`Streaming content exceeded ${MAX_STREAMING_CONTENT} characters, truncating`)
          return
        }
        set({ streamingContent: newContent })
      } else {
        set(state => {
          const messages = state.messages.map(m => (m.id === id ? { ...m, content: m.content + text } : m))
          if (!messages.find(m => m.id === id)?.isStreaming) {
            scheduleSave(messages)
          }
          return { messages }
        })
      }
    },

    setStreaming: streaming => {
      if (!streaming) {
        const state = get()
        if (state.streamingMessageId && state.streamingContent) {
          set(s => {
            const messages = s.messages.map(m =>
              m.id === state.streamingMessageId ? { ...m, content: m.content + state.streamingContent } : m
            )
            scheduleSave(messages)
            return { messages }
          })
        }
        flushSave()
        set({ isStreaming: false, streamingContent: '', streamingMessageId: null })
      } else {
        set({ isStreaming: true })
      }
    },

    clearMessages: () => {
      flushSave()
      localStorage.removeItem(STORAGE_KEY)
      storageService.remove(STORAGE_KEY)
      set({ messages: [], streamingContent: '', streamingMessageId: null })
    },

    addSkillInvocation: (messageId, invocation) => {
      set(state => {
        const messages = state.messages.map(m =>
          m.id === messageId ? { ...m, skillInvocations: [...(m.skillInvocations ?? []), invocation] } : m
        )
        scheduleSave(messages)
        return { messages }
      })
    },

    updateSkillInvocation: (messageId, skillName, updates) => {
      set(state => {
        const messages = state.messages.map(m =>
          m.id === messageId
            ? {
                ...m,
                skillInvocations: m.skillInvocations?.map(inv =>
                  inv.skillName === skillName ? { ...inv, ...updates } : inv
                )
              }
            : m
        )
        scheduleSave(messages)
        return { messages }
      })
    },

    loadFromStorage: async () => {
      const messages = await loadMessagesFromStorage()
      set({ messages })
    }
  }
}
