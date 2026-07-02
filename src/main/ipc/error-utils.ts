import { logger } from '../utils/logger'
import type { IPCError, IPCErrorCode } from '../../shared/types/ipc'

/** Strip sensitive patterns (API keys, tokens) from error messages */
export function sanitizeError(message: string): string {
  return (
    message
      // Generic key patterns (api-key, access-key, secret-key, etc.)
      .replace(/[a-zA-Z]*key[-_=][a-zA-Z0-9]{8,}/gi, '***key-***')
      // OpenAI-style keys (sk-*, sk-proj-*, sk-admin-*)
      .replace(/sk-[a-zA-Z0-9_-]{8,}/gi, '***sk-***')
      // Anthropic-style keys (sk-ant-*)
      .replace(/sk-ant-[a-zA-Z0-9_-]{8,}/gi, '***sk-ant-***')
      // Bearer tokens
      .replace(/Bearer\s+[a-zA-Z0-9_\-=.]{8,}/gi, 'Bearer ***')
      // Custom auth headers
      .replace(/x-api-key\s*[:=]\s*\S+/gi, 'x-api-key: ***')
      .replace(/api[_-]?key\s*[:=]\s*\S+/gi, 'api-key: ***')
      .replace(/Authorization\s*[:=]\s*\S+/gi, 'Authorization: ***')
      // Long hex/long strings that look like tokens (>32 chars of hex or alphanumeric)
      .replace(/\b[a-f0-9]{32,}\b/gi, '***token***')
      .replace(/\b[A-Za-z0-9+/=]{40,}\b/g, '***token***')
  )
}

/** 创建结构化 IPC 错误 */
export function createIPCError(code: IPCErrorCode, message: string, details?: Record<string, unknown>): IPCError {
  const sanitizedMessage = sanitizeError(message)
  const error = new Error(sanitizedMessage) as IPCError
  error.code = code
  error.name = `IPCError[${code}]`
  if (details) {
    error.details = details
  }
  return error
}

/** 根据错误消息推断错误码 */
function inferErrorCode(message: string): IPCErrorCode {
  const lowerMessage = message.toLowerCase()

  // ID 相关错误
  if (lowerMessage.includes('id') && (lowerMessage.includes('无效') || lowerMessage.includes('格式'))) {
    return 'INVALID_ID'
  }
  if (lowerMessage.includes('不能为空') || lowerMessage.includes('格式无效')) {
    return 'INVALID_DATA'
  }
  if (lowerMessage.includes('不存在') || lowerMessage.includes('未找到') || lowerMessage.includes('not found')) {
    return 'NOT_FOUND'
  }
  if (lowerMessage.includes('已存在') || lowerMessage.includes('already exists')) {
    return 'ALREADY_EXISTS'
  }

  // 技术错误
  if (lowerMessage.includes('数据库') || lowerMessage.includes('db') || lowerMessage.includes('sqlite')) {
    return 'DB_ERROR'
  }
  if (lowerMessage.includes('llm') || lowerMessage.includes('api') || lowerMessage.includes('model')) {
    return 'LLM_ERROR'
  }
  if (lowerMessage.includes('权限') || lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
    return 'PERMISSION_DENIED'
  }

  return 'INTERNAL_ERROR'
}

/** Common error handling for IPC wrappers */
export function handleIPCError<T>(e: unknown): T {
  const original = e instanceof Error ? e : new Error(String(e))
  const message = sanitizeError(original.message)
  const code = inferErrorCode(original.message)

  const ipcError = createIPCError(code, message, {
    originalName: original.name
  })

  logger.error('IPC:', ipcError)
  throw ipcError
}
