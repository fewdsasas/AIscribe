import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/types/ipc'
import { logger } from '../utils/logger'

export type Permission = 'read' | 'write' | 'admin'

interface PermissionRule {
  channel: string
  permission: Permission
}

const PERMISSION_RULES: PermissionRule[] = [
  { channel: IPC_CHANNELS.PROJECT_CREATE, permission: 'write' },
  { channel: IPC_CHANNELS.PROJECT_LIST, permission: 'read' },
  { channel: IPC_CHANNELS.PROJECT_DASHBOARD_STATS, permission: 'read' },
  { channel: IPC_CHANNELS.PROJECT_GET, permission: 'read' },
  { channel: IPC_CHANNELS.PROJECT_UPDATE, permission: 'write' },
  { channel: IPC_CHANNELS.PROJECT_DELETE, permission: 'admin' },

  { channel: IPC_CHANNELS.NOVEL_CREATE, permission: 'write' },
  { channel: IPC_CHANNELS.NOVEL_GET, permission: 'read' },
  { channel: IPC_CHANNELS.NOVEL_GET_BY_PROJECT, permission: 'read' },

  { channel: IPC_CHANNELS.CHAPTER_CREATE, permission: 'write' },
  { channel: IPC_CHANNELS.CHAPTER_LIST, permission: 'read' },
  { channel: IPC_CHANNELS.CHAPTER_LIST_WITH_CONTENT, permission: 'read' },
  { channel: IPC_CHANNELS.CHAPTER_GET, permission: 'read' },
  { channel: IPC_CHANNELS.CHAPTER_UPDATE, permission: 'write' },
  { channel: IPC_CHANNELS.CHAPTER_COUNTS, permission: 'read' },

  { channel: IPC_CHANNELS.CHARACTER_CREATE, permission: 'write' },
  { channel: IPC_CHANNELS.CHARACTER_LIST, permission: 'read' },

  { channel: IPC_CHANNELS.PLOT_STRUCTURE_GET_BY_NOVEL, permission: 'read' },
  { channel: IPC_CHANNELS.PLOT_STRUCTURE_SAVE, permission: 'write' },
  { channel: IPC_CHANNELS.WORLD_GET_BY_NOVEL, permission: 'read' },
  { channel: IPC_CHANNELS.WORLD_SAVE, permission: 'write' },

  { channel: IPC_CHANNELS.OUTLINE_GET, permission: 'read' },
  { channel: IPC_CHANNELS.OUTLINE_SAVE, permission: 'write' },

  { channel: IPC_CHANNELS.CHECKPOINT_CREATE, permission: 'write' },
  { channel: IPC_CHANNELS.CHECKPOINT_LIST, permission: 'read' },
  { channel: IPC_CHANNELS.CHECKPOINT_RESTORE, permission: 'write' },

  { channel: IPC_CHANNELS.SESSION_CREATE, permission: 'write' },
  { channel: IPC_CHANNELS.SESSION_LIST, permission: 'read' },

  { channel: IPC_CHANNELS.SKILL_LIST, permission: 'read' },
  { channel: IPC_CHANNELS.SKILL_GET, permission: 'read' },
  { channel: IPC_CHANNELS.SKILL_INVOKE, permission: 'write' },

  { channel: IPC_CHANNELS.LEARNING_RECORD, permission: 'write' },
  { channel: IPC_CHANNELS.LEARNING_ANALYZE, permission: 'read' },
  { channel: IPC_CHANNELS.LEARNING_SUMMARY, permission: 'read' },
  { channel: IPC_CHANNELS.MEMORY_SEARCH, permission: 'read' },

  { channel: IPC_CHANNELS.WRITER_MODEL_GET, permission: 'read' },
  { channel: IPC_CHANNELS.WRITER_MODEL_SAVE, permission: 'write' },

  { channel: IPC_CHANNELS.DB_TABLES, permission: 'admin' },

  { channel: IPC_CHANNELS.EXPORT_PROJECT, permission: 'read' },

  { channel: IPC_CHANNELS.LLM_CHAT, permission: 'write' },
  { channel: IPC_CHANNELS.LLM_CONFIG, permission: 'admin' },
  { channel: IPC_CHANNELS.LLM_IS_CONFIGURED, permission: 'read' },
  { channel: IPC_CHANNELS.LLM_CONFIG_META, permission: 'read' },
  { channel: IPC_CHANNELS.LLM_CHAT_STREAM, permission: 'write' },
  { channel: IPC_CHANNELS.LLM_CANCEL_STREAM, permission: 'write' },

  { channel: IPC_CHANNELS.STORAGE_ENCRYPT_SET, permission: 'write' },
  { channel: IPC_CHANNELS.STORAGE_ENCRYPT_GET, permission: 'read' },
  { channel: IPC_CHANNELS.STORAGE_ENCRYPT_REMOVE, permission: 'write' },

  { channel: IPC_CHANNELS.MONITOR_MEMORY_USAGE, permission: 'read' }
]

class PermissionManager {
  private userPermissions: Set<Permission> = new Set(['read', 'write', 'admin'])

  hasPermission(permission: Permission): boolean {
    return this.userPermissions.has(permission)
  }

  getChannelPermission(channel: string): Permission | null {
    const rule = PERMISSION_RULES.find(r => r.channel === channel)
    return rule?.permission ?? null
  }

  canExecute(channel: string): boolean {
    const required = this.getChannelPermission(channel)
    if (!required) {
      logger.warn(`[IPC Permission] Channel '${channel}' has no permission rule. Denying by default.`)
      return false
    }
    return this.userPermissions.has(required)
  }

  setPermissions(permissions: Permission[]): void {
    this.userPermissions = new Set(permissions)
  }

  addPermission(permission: Permission): void {
    this.userPermissions.add(permission)
  }
}

const permissionManager = new PermissionManager()

export function withPermission<TArgs extends unknown[], TReturn>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: TArgs) => TReturn | Promise<TReturn>
): (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TReturn> {
  return async (event: IpcMainInvokeEvent, ...args: TArgs) => {
    if (!permissionManager.canExecute(channel)) {
      throw new Error(
        `Permission denied: '${channel}' requires ${permissionManager.getChannelPermission(channel)} permission`
      )
    }
    return handler(event, ...args)
  }
}

export { permissionManager, PERMISSION_RULES }
