import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/mock/userData', on: () => {} }
}))

vi.mock('../../../src/main/ipc/permission', () => ({
  withPermission: vi.fn((_channel: string, handler: unknown) => handler),
  permissionManager: {
    setPermissions: vi.fn()
  }
}))

const registerFns = vi.hoisted(() => ({
  registerProjectHandlers: vi.fn(),
  registerNovelHandlers: vi.fn(),
  registerCharacterHandlers: vi.fn(),
  registerWorldHandlers: vi.fn(),
  registerCheckpointHandlers: vi.fn(),
  registerWriterHandlers: vi.fn(),
  registerSkillHandlers: vi.fn(),
  registerChatHandlers: vi.fn(),
  registerLLMConfigHandlers: vi.fn(),
  registerLearningHandlers: vi.fn(),
  registerExportHandlers: vi.fn(),
  registerDbHandlers: vi.fn(),
  registerStorageHandlers: vi.fn(),
  registerMonitorHandlers: vi.fn()
}))

vi.mock('../../../src/main/ipc/project.ipc', () => ({ registerProjectHandlers: registerFns.registerProjectHandlers }))
vi.mock('../../../src/main/ipc/novel.ipc', () => ({ registerNovelHandlers: registerFns.registerNovelHandlers }))
vi.mock('../../../src/main/ipc/character.ipc', () => ({
  registerCharacterHandlers: registerFns.registerCharacterHandlers
}))
vi.mock('../../../src/main/ipc/world.ipc', () => ({ registerWorldHandlers: registerFns.registerWorldHandlers }))
vi.mock('../../../src/main/ipc/checkpoint.ipc', () => ({
  registerCheckpointHandlers: registerFns.registerCheckpointHandlers
}))
vi.mock('../../../src/main/ipc/writer.ipc', () => ({ registerWriterHandlers: registerFns.registerWriterHandlers }))
vi.mock('../../../src/main/ipc/skill.ipc', () => ({ registerSkillHandlers: registerFns.registerSkillHandlers }))
vi.mock('../../../src/main/ipc/chat.ipc', () => ({ registerChatHandlers: registerFns.registerChatHandlers }))
vi.mock('../../../src/main/ipc/llm-config.ipc', () => ({
  registerLLMConfigHandlers: registerFns.registerLLMConfigHandlers
}))
vi.mock('../../../src/main/ipc/learning.ipc', () => ({
  registerLearningHandlers: registerFns.registerLearningHandlers
}))
vi.mock('../../../src/main/ipc/export.ipc', () => ({ registerExportHandlers: registerFns.registerExportHandlers }))
vi.mock('../../../src/main/ipc/db.ipc', () => ({ registerDbHandlers: registerFns.registerDbHandlers }))
vi.mock('../../../src/main/ipc/storage.ipc', () => ({ registerStorageHandlers: registerFns.registerStorageHandlers }))
vi.mock('../../../src/main/ipc/monitor.ipc', () => ({ registerMonitorHandlers: registerFns.registerMonitorHandlers }))

import { registerIpcHandlers } from '../../../src/main/ipc/index'
import type { ServiceRegistry } from '../../../src/main/di'

import { withPermission } from '../../../src/main/ipc/permission'

describe('registerIpcHandlers', () => {
  it('should wrap ipcMain.handle with permission guard and register all modules', () => {
    const handleMock = vi.fn()
    const mockIpcMain = { handle: handleMock }
    const mockServices = {} as ServiceRegistry

    registerFns.registerProjectHandlers.mockImplementation(
      (ipcMain: { handle: (channel: string, handler: unknown) => void }) => {
        ipcMain.handle('project:create', () => {})
      }
    )

    registerIpcHandlers(mockIpcMain as any, mockServices)

    expect(handleMock).toHaveBeenCalledWith('project:create', expect.any(Function))
    expect(withPermission).toHaveBeenCalledWith('project:create', expect.any(Function))

    Object.values(registerFns).forEach(fn => {
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith(expect.anything(), mockServices)
    })
  })
})
