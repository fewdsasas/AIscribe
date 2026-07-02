import { afterEach, describe, expect, it, vi } from 'vitest'
import { permissionManager, withPermission } from '../../../src/main/ipc/permission'

describe('PermissionManager', () => {
  afterEach(() => {
    permissionManager.setPermissions(['read'])
  })

  describe('hasPermission', () => {
    it('should allow read for default user', () => {
      expect(permissionManager.hasPermission('read')).toBe(true)
    })

    it('should deny write for default user', () => {
      expect(permissionManager.hasPermission('write')).toBe(false)
    })

    it('should deny admin for default user', () => {
      expect(permissionManager.hasPermission('admin')).toBe(false)
    })

    it('should reflect explicit permission grants', () => {
      permissionManager.setPermissions(['read', 'write'])
      expect(permissionManager.hasPermission('read')).toBe(true)
      expect(permissionManager.hasPermission('write')).toBe(true)
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

    it('should return read for plotStructure:get-by-novel', () => {
      expect(permissionManager.getChannelPermission('plotStructure:get-by-novel')).toBe('read')
    })

    it('should return read for writerModel:get', () => {
      expect(permissionManager.getChannelPermission('writerModel:get')).toBe('read')
    })

    it('should return write for import:ai-repair', () => {
      expect(permissionManager.getChannelPermission('import:ai-repair')).toBe('write')
    })
  })

  describe('canExecute', () => {
    it('should allow read operations with default permissions', () => {
      expect(permissionManager.canExecute('project:list')).toBe(true)
    })

    it('should deny write operations with default permissions', () => {
      expect(permissionManager.canExecute('project:create')).toBe(false)
    })

    it('should deny admin operations with default permissions', () => {
      expect(permissionManager.canExecute('project:delete')).toBe(false)
    })

    it('should allow write operations when explicitly granted', () => {
      permissionManager.setPermissions(['read', 'write'])
      expect(permissionManager.canExecute('project:create')).toBe(true)
    })

    it('should allow admin operations when explicitly granted', () => {
      permissionManager.setPermissions(['read', 'write', 'admin'])
      expect(permissionManager.canExecute('project:delete')).toBe(true)
    })

    it('should deny unknown channels', () => {
      expect(permissionManager.canExecute('unknown:channel')).toBe(false)
    })
  })
})

describe('withPermission', () => {
  afterEach(() => {
    permissionManager.setPermissions(['read'])
  })

  it('should execute handler when permission is granted', async () => {
    permissionManager.setPermissions(['read', 'write'])
    const handler = vi.fn().mockResolvedValue('success')
    const wrapped = withPermission('project:create', handler)

    const result = await wrapped(null as any, 'arg1', 'arg2')
    expect(result).toBe('success')
    expect(handler).toHaveBeenCalledWith(null, 'arg1', 'arg2')
  })

  it('should throw when permission is denied', async () => {
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
