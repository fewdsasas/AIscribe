import type { IpcMainInvokeEvent } from 'electron'
import { logger } from '../utils/logger'

export type Permission = 'read' | 'write' | 'admin'

interface PermissionRule {
  channel: string
  permission: Permission
}

const PERMISSION_RULES: PermissionRule[] = [
  { channel: 'project:create', permission: 'write' },
  { channel: 'project:list', permission: 'read' },
  { channel: 'project:dashboard-stats', permission: 'read' },
  { channel: 'project:get', permission: 'read' },
  { channel: 'project:update', permission: 'write' },
  { channel: 'project:delete', permission: 'admin' },

  { channel: 'novel:create', permission: 'write' },
  { channel: 'novel:get', permission: 'read' },
  { channel: 'novel:get-by-project', permission: 'read' },

  { channel: 'chapter:create', permission: 'write' },
  { channel: 'chapter:list', permission: 'read' },
  { channel: 'chapter:list-with-content', permission: 'read' },
  { channel: 'chapter:get', permission: 'read' },
  { channel: 'chapter:update', permission: 'write' },
  { channel: 'chapter:counts', permission: 'read' },

  { channel: 'character:create', permission: 'write' },
  { channel: 'character:list', permission: 'read' },

  { channel: 'plot-structure:get-by-novel', permission: 'read' },
  { channel: 'plot-structure:save', permission: 'write' },
  { channel: 'world:get-by-novel', permission: 'read' },
  { channel: 'world:save', permission: 'write' },

  { channel: 'outline:get', permission: 'read' },
  { channel: 'outline:save', permission: 'write' },

  { channel: 'checkpoint:create', permission: 'write' },
  { channel: 'checkpoint:list', permission: 'read' },
  { channel: 'checkpoint:restore', permission: 'write' },

  { channel: 'session:create', permission: 'write' },
  { channel: 'session:list', permission: 'read' },

  { channel: 'skill:list', permission: 'read' },
  { channel: 'skill:get', permission: 'read' },
  { channel: 'skill:invoke', permission: 'write' },

  { channel: 'learning:record', permission: 'write' },
  { channel: 'learning:analyze', permission: 'read' },
  { channel: 'learning:summary', permission: 'read' },
  { channel: 'memory:search', permission: 'read' },

  { channel: 'writer-model:get', permission: 'read' },
  { channel: 'writer-model:save', permission: 'write' },

  { channel: 'db:tables', permission: 'admin' },

  { channel: 'export:project', permission: 'read' },

  { channel: 'llm:chat', permission: 'write' },
  { channel: 'llm:config', permission: 'admin' },
  { channel: 'llm:is-configured', permission: 'read' },
  { channel: 'llm:config-meta', permission: 'read' },
  { channel: 'llm:test-connection', permission: 'write' },
  { channel: 'llm:chat-stream', permission: 'write' },
  { channel: 'llm:cancel-stream', permission: 'write' },

  { channel: 'storage:encryptSet', permission: 'write' },
  { channel: 'storage:encryptGet', permission: 'read' },
  { channel: 'storage:encryptRemove', permission: 'write' },

  { channel: 'monitor:memory-usage', permission: 'read' }
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
