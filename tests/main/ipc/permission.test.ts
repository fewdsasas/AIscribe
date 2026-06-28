import { afterEach, describe, expect, it, vi } from 'vitest'
import { permissionManager, withPermission } from '../../../src/main/ipc/permission'

describe('PermissionManager', () => {
  afterEach(() => {
    permissionManager.setPermissions(['read', 'write', 'admin'])
  })

  describe('hasPermission', () => {
    it('should allow read for default user', () => {
      expect(permissionManager.hasPermission('read')).toBe(true)
    })

    it('should allow write for default user', () => {
      expect(permissionManager.hasPermission('write')).toBe(true)
    })

    it('should allow admin for default user', () => {
      expect(permissionManager.hasPermission('admin')).toBe(true)
    })

    it('should deny when permission not in set', () => {
      permissionManager.setPermissions(['read'])
      expect(permissionManager.hasPermission('admin')).toBe(false)
    })
  })

  describe('getChannelPermission', () => {
    it('should return read for project:list', () => {
      expect(permissionManager.getChannelPermission('project:list')).toBe('read')
    })

    it('should return write for project:create', () => {
      expect(permissionManager.getChannelPermission('project:create')).toBe('write')
    })

    it('should return admin for project:delete', () => {
      expect(permissionManager.getChannelPermission('project:delete')).toBe('admin')
    })

    it('should return null for unknown channel', () => {
      expect(permissionManager.getChannelPermission('unknown:channel')).toBeNull()
    })

    it('should return write for llm:test-connection', () => {
      expect(permissionManager.getChannelPermission('llm:test-connection')).toBe('write')
    })
  })

  describe('canExecute', () => {
    it('should allow read operations', () => {
      expect(permissionManager.canExecute('project:list')).toBe(true)
    })

    it('should allow write operations with full permissions', () => {
      expect(permissionManager.canExecute('project:create')).toBe(true)
    })

    it('should allow admin operations with full permissions', () => {
      expect(permissionManager.canExecute('project:delete')).toBe(true)
    })

    it('should deny when permissions are restricted', () => {
      permissionManager.setPermissions(['read'])
      expect(permissionManager.canExecute('project:create')).toBe(false)
    })

    it('should deny unknown channels', () => {
      expect(permissionManager.canExecute('unknown:channel')).toBe(false)
    })
  })
})

describe('withPermission', () => {
  afterEach(() => {
    permissionManager.setPermissions(['read', 'write', 'admin'])
  })

  it('should execute handler when permission is granted', async () => {
    const handler = vi.fn().mockResolvedValue('success')
    const wrapped = withPermission('project:list', handler)

    const result = await wrapped(null as any, 'arg1', 'arg2')
    expect(result).toBe('success')
    expect(handler).toHaveBeenCalledWith(null, 'arg1', 'arg2')
  })

  it('should throw when permission is denied', async () => {
    permissionManager.setPermissions(['read'])
    const handler = vi.fn().mockResolvedValue('success')
    const wrapped = withPermission('project:delete', handler)

    await expect(wrapped(null as any)).rejects.toThrow('Permission denied')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should throw for unknown channels', async () => {
    const handler = vi.fn().mockResolvedValue('success')
    const wrapped = withPermission('unknown:channel', handler)

    await expect(wrapped(null as any)).rejects.toThrow('Permission denied')
    expect(handler).not.toHaveBeenCalled()
  })
})
