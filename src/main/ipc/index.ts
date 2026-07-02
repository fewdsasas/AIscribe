import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { MAX_STRING_LENGTH } from '../../shared/constants'
import { estimatePayloadSize, LARGE_PAYLOAD_THRESHOLD } from '../../shared/utils/ipc-payload'
import { permissionManager, withPermission } from './permission'
import { logger } from '../utils/logger'
import type { ServiceRegistry } from '../di'
import { DATABASE_TOKEN, LEARNING_ENGINE_TOKEN, LLM_PROVIDER_TOKEN, SKILL_LOADER_TOKEN } from '../di'
import { createIPCError, handleIPCError, sanitizeError } from './error-utils'

// Re-export for backward compatibility
export { sanitizeError, createIPCError }

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
        logger.warn(`[IPC] Large payload: ${payloadSize} bytes`)
      }
      return await fn(...args)
    } catch (e) {
      logger.error('IPC handler failed:', e instanceof Error ? e.message : String(e))
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
import { registerImportHandlers } from './import.ipc'
import { registerRepairHandlers } from './repair.ipc'

export function registerIpcHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  // 为主应用窗口显式授予完整权限。默认权限已收缩为 read，此处显式授权可防止
  // 新窗口/新上下文意外获得写/管理权限。未来应按窗口类型拆分权限集。
  permissionManager.setPermissions(['read', 'write', 'admin'])

  const guardedIpcMain: IpcMain = Object.create(ipcMain)
  guardedIpcMain.handle = (channel: string, handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown) => {
    // 注入 channel 名称，用于错误日志中的上下文定位
    const wrappedHandler = async (event: IpcMainInvokeEvent, ...args: unknown[]): Promise<unknown> => {
      try {
        return await handler(event, ...args)
      } catch (e) {
        logger.error(`IPC [${channel}] failed:`, e instanceof Error ? e.message : String(e))
        throw e
      }
    }
    ipcMain.handle(channel, withPermission(channel, wrappedHandler))
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
  registerImportHandlers(guardedIpcMain)
  registerRepairHandlers(guardedIpcMain, services)
}
