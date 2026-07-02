import type { IPCErrorCode } from '@shared/types/ipc'

export function inferClientErrorCode(message: string): IPCErrorCode | null {
  const lower = message.toLowerCase()
  if (lower.includes('id') && (lower.includes('无效') || lower.includes('格式'))) return 'INVALID_ID'
  if (lower.includes('不能为空') || lower.includes('格式无效')) return 'INVALID_DATA'
  if (lower.includes('不存在') || lower.includes('未找到') || lower.includes('not found')) return 'NOT_FOUND'
  if (lower.includes('已存在') || lower.includes('already exists')) return 'ALREADY_EXISTS'
  if (lower.includes('数据库') || lower.includes('sqlite')) return 'DB_ERROR'
  if (lower.includes('llm') || lower.includes('api') || lower.includes('model')) return 'LLM_ERROR'
  if (lower.includes('权限') || lower.includes('permission') || lower.includes('denied')) return 'PERMISSION_DENIED'
  return null
}

const FRIENDLY_MESSAGES: Record<IPCErrorCode, string> = {
  INVALID_ID: 'ID 格式不正确，请检查输入',
  INVALID_DATA: '提交的数据有误，请检查表单',
  NOT_FOUND: '请求的内容不存在',
  ALREADY_EXISTS: '该记录已存在，请勿重复创建',
  DB_ERROR: '数据操作失败，请稍后重试',
  LLM_ERROR: 'AI 服务连接异常，请检查配置',
  PERMISSION_DENIED: '权限不足，无法执行该操作',
  INTERNAL_ERROR: '系统内部错误，请稍后重试'
}

export function getUserFriendlyMessage(code: IPCErrorCode | null, fallback: string): string {
  return code ? FRIENDLY_MESSAGES[code] : fallback
}

export function parseIPCError(error: Error): { code: IPCErrorCode | null; message: string } {
  const code = inferClientErrorCode(error.message)
  return { code, message: error.message }
}
