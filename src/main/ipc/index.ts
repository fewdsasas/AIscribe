import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { MAX_STRING_LENGTH } from '../../shared/constants'
import { estimatePayloadSize, LARGE_PAYLOAD_THRESHOLD } from '../../shared/utils/ipc-payload'
import { withPermission } from './permission'
import { logger } from '../utils/logger'
import type { ServiceRegistry } from '../di'
import { DATABASE_TOKEN, LEARNING_ENGINE_TOKEN, LLM_PROVIDER_TOKEN, SKILL_LOADER_TOKEN } from '../di'

export { DATABASE_TOKEN, LLM_PROVIDER_TOKEN, SKILL_LOADER_TOKEN, LEARNING_ENGINE_TOKEN }

// ===== Validation helpers =====

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function requireId(value: unknown, label = 'ID'): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} 不能为空`)
  if (!UUID_REGEX.test(value)) throw new Error(`${label} 格式无效`)
}

export function requireObject(value: unknown, label = '数据'): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 格式无效`)
}

export function requireNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} 不能为空`)
  if (value.length > MAX_STRING_LENGTH) throw new Error(`${label} 过长`)
}

export function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${label} 必须是以下值之一: ${allowed.join(', ')}`)
  }
}

export function requireNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`${label} 必须为数字`)
}

export function requireNonNegativeNumber(value: unknown, label: string): asserts value is number {
  requireNumber(value, label)
  if (value < 0) throw new Error(`${label} 不能为负数`)
}

// ===== Wrap helper =====

/** Wraps an IPC handler that doesn't need the event object (auto-strips it) */
export function wrap<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn | Promise<TReturn>
): (event: Electron.IpcMainInvokeEvent, ...args: TArgs) => Promise<TReturn> {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: TArgs) => {
    try {
      // 检查 payload 大小，超阈值告警
      const payloadSize = estimatePayloadSize(args || [])
      if (payloadSize > LARGE_PAYLOAD_THRESHOLD) {
        logger.warn(`[IPC] Large payload on channel: ${payloadSize} bytes`)
      }
      return await fn(...args)
    } catch (e) {
      return handleIPCError(e)
    }
  }
}

/** Wraps an IPC handler that needs the event object (e.g. for event.sender) */
export function wrapEvent<TArgs extends unknown[], TReturn>(
  fn: (event: Electron.IpcMainInvokeEvent, ...args: TArgs) => TReturn | Promise<TReturn>
): (event: Electron.IpcMainInvokeEvent, ...args: TArgs) => Promise<TReturn> {
  return async (event: Electron.IpcMainInvokeEvent, ...args: TArgs) => {
    try {
      return await fn(event, ...args)
    } catch (e) {
      return handleIPCError(e)
    }
  }
}

/** Strip sensitive patterns (API keys, tokens) from error messages */
export function sanitizeError(message: string): string {
  return message
    .replace(/[a-zA-Z]*key[-_][a-zA-Z0-9]{8,}/gi, '***key-***')
    .replace(/sk-[a-zA-Z0-9]{8,}/gi, '***sk-***')
    .replace(/Bearer\s+[a-zA-Z0-9_\-]{8,}/gi, 'Bearer ***')
    .replace(/x-api-key\s*:\s*\S+/gi, 'x-api-key: ***')
    .replace(/[a-f0-9]{32,}/gi, '***hex***')
}

/** Common error handling for IPC wrappers */
function handleIPCError<T>(e: unknown): T {
  const original = e instanceof Error ? e : new Error(String(e))
  const message = sanitizeError(original.message)
  const sanitized = new Error(message)
  sanitized.name = original.name
  logger.error('IPC:', sanitized)
  throw sanitized
}

// ===== Register all IPC handlers =====

import { registerProjectHandlers } from './project.ipc'
import { registerNovelHandlers } from './novel.ipc'
import { registerCharacterHandlers } from './character.ipc'
import { registerWorldHandlers } from './world.ipc'
import { registerCheckpointHandlers } from './checkpoint.ipc'
import { registerWriterHandlers } from './writer.ipc'
import { registerSkillHandlers } from './skill.ipc'
import { registerChatHandlers } from './chat.ipc'
import { registerLLMConfigHandlers } from './llm-config.ipc'
import { registerLearningHandlers } from './learning.ipc'
import { registerExportHandlers } from './export.ipc'
import { registerDbHandlers } from './db.ipc'
import { registerStorageHandlers } from './storage.ipc'
import { registerMonitorHandlers } from './monitor.ipc'

export function registerIpcHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  const guardedIpcMain: IpcMain = Object.create(ipcMain)
  guardedIpcMain.handle = (channel: string, handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown) => {
    ipcMain.handle(channel, withPermission(channel, handler))
  }

  registerProjectHandlers(guardedIpcMain, services)
  registerNovelHandlers(guardedIpcMain, services)
  registerCharacterHandlers(guardedIpcMain, services)
  registerWorldHandlers(guardedIpcMain, services)
  registerCheckpointHandlers(guardedIpcMain, services)
  registerWriterHandlers(guardedIpcMain, services)
  registerSkillHandlers(guardedIpcMain, services)
  registerChatHandlers(guardedIpcMain, services)
  registerLLMConfigHandlers(guardedIpcMain, services)
  registerLearningHandlers(guardedIpcMain, services)
  registerExportHandlers(guardedIpcMain, services)
  registerDbHandlers(guardedIpcMain, services)
  registerStorageHandlers(guardedIpcMain, services)
  registerMonitorHandlers(guardedIpcMain, services)
}
