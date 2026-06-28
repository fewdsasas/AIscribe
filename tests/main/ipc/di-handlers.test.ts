import { beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'path'
import type { IpcMain } from 'electron'

vi.mock('electron', () => ({
  app: {
    getPath: () => path.join(__dirname, '../../temp/di-handlers-test'),
    on: () => {}
  }
}))

import {
  DATABASE_TOKEN,
  LEARNING_ENGINE_TOKEN,
  LLM_PROVIDER_TOKEN,
  ServiceRegistry,
  SKILL_LOADER_TOKEN
} from '../../../src/main/di'
import type { IDatabase, ILearningEngine, ILLMProvider, ISkillLoader } from '../../../src/main/di'

// Handlers to verify
import { registerProjectHandlers } from '../../../src/main/ipc/project.ipc'
import { registerNovelHandlers } from '../../../src/main/ipc/novel.ipc'
import { registerCharacterHandlers } from '../../../src/main/ipc/character.ipc'
import { registerWorldHandlers } from '../../../src/main/ipc/world.ipc'
import { registerCheckpointHandlers } from '../../../src/main/ipc/checkpoint.ipc'
import { registerWriterHandlers } from '../../../src/main/ipc/writer.ipc'
import { registerSkillHandlers } from '../../../src/main/ipc/skill.ipc'
import { registerChatHandlers } from '../../../src/main/ipc/chat.ipc'
import { registerLLMConfigHandlers } from '../../../src/main/ipc/llm-config.ipc'
import { registerLearningHandlers } from '../../../src/main/ipc/learning.ipc'
import { registerDbHandlers } from '../../../src/main/ipc/db.ipc'
import { registerExportHandlers } from '../../../src/main/ipc/export.ipc'
import { registerStorageHandlers } from '../../../src/main/ipc/storage.ipc'
import { registerMonitorHandlers } from '../../../src/main/ipc/monitor.ipc'

type HandlerFn = (ipcMain: IpcMain, services: ServiceRegistry) => void

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

interface MockIpcMain extends IpcMain {
  handlers: Map<string, (...args: unknown[]) => unknown>
}

function createMockIpcMain(): MockIpcMain {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  return {
    handlers,
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler)
    },
    on: (_channel: string, _listener: (...args: unknown[]) => void) => undefined,
    once: (_channel: string, _listener: (...args: unknown[]) => void) => undefined,
    removeListener: (_channel: string, _listener: (...args: unknown[]) => void) => undefined,
    removeAllListeners: (_channel?: string) => undefined,
    eventNames: () => [] as (string | symbol)[]
  } as unknown as MockIpcMain
}

function createSpyRegistry(): { registry: ServiceRegistry; resolved: string[] } {
  const registry = new ServiceRegistry()
  const resolved: string[] = []

  const originalResolve = ServiceRegistry.prototype.resolve
  ServiceRegistry.prototype.resolve = function <T>(token: string): T {
    resolved.push(token)
    return originalResolve.call(this, token) as T
  }

  const originalResolveAsync = ServiceRegistry.prototype.resolveAsync
  ServiceRegistry.prototype.resolveAsync = async function <T>(token: string): Promise<T> {
    resolved.push(token)
    return originalResolveAsync.call(this, token) as Promise<T>
  }

  return { registry, resolved }
}

function createMockDatabase(): IDatabase {
  return {
    close: vi.fn(),
    save: vi.fn(),
    scheduleSave: vi.fn(),
    createProject: vi.fn().mockReturnValue({ id: 'p1', name: 'Mock', createdAt: '', updatedAt: '' }),
    getProject: vi.fn().mockReturnValue(null),
    listProjects: vi.fn().mockReturnValue([]),
    listProjectsWithStats: vi.fn().mockReturnValue([]),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    createProjectsBatch: vi.fn().mockReturnValue([]),
    createNovel: vi.fn().mockReturnValue({ id: 'n1', projectId: 'p1', title: 'Mock', createdAt: '', updatedAt: '' }),
    getNovel: vi.fn().mockReturnValue(null),
    getNovelByProject: vi.fn().mockReturnValue(null),
    createChapter: vi
      .fn()
      .mockReturnValue({ id: 'c1', novelId: 'n1', title: 'Mock', content: '', createdAt: '', updatedAt: '' }),
    listChapters: vi.fn().mockReturnValue([]),
    listChaptersWithContent: vi.fn().mockReturnValue([]),
    getChapter: vi.fn().mockReturnValue(null),
    updateChapter: vi.fn(),
    getChapterCounts: vi.fn().mockReturnValue({}),
    createChaptersBatch: vi.fn().mockReturnValue([]),
    createCharacter: vi.fn().mockReturnValue({ id: 'ch1', novelId: 'n1', name: 'Mock', createdAt: '', updatedAt: '' }),
    listCharacters: vi.fn().mockReturnValue([]),
    getWorldByNovel: vi.fn().mockReturnValue(null),
    saveWorld: vi.fn().mockReturnValue({ id: 'w1', novelId: 'n1', createdAt: '', updatedAt: '' }),
    getPlotStructureByNovel: vi.fn().mockReturnValue(null),
    savePlotStructure: vi
      .fn()
      .mockReturnValue({ id: 'ps1', novelId: 'n1', framework: '', beats: [], createdAt: '', updatedAt: '' }),
    getOutline: vi.fn().mockReturnValue(null),
    saveOutline: vi.fn().mockReturnValue({ id: 'o1', novelId: 'n1', sections: [], createdAt: '', updatedAt: '' }),
    createCheckpoint: vi.fn().mockReturnValue({ id: 'cp1', projectId: 'p1', name: '', createdAt: '' }),
    listCheckpoints: vi.fn().mockReturnValue([]),
    getCheckpointSnapshot: vi.fn().mockReturnValue(null),
    createSessionMemory: vi
      .fn()
      .mockReturnValue({ id: 'sm1', projectId: 'p1', query: '', response: '', createdAt: '', updatedAt: '' }),
    listSessionMemories: vi.fn().mockReturnValue([]),
    writerModels: { getByWriterId: vi.fn(), save: vi.fn() },
    trajectories: {
      record: vi.fn(),
      getByProject: vi.fn().mockReturnValue([]),
      getBySkill: vi.fn().mockReturnValue([]),
      getBySession: vi.fn().mockReturnValue([]),
      detectPatterns: vi.fn().mockReturnValue([]),
      searchMemory: vi.fn().mockReturnValue([])
    },
    projects: {
      create: vi.fn(),
      getById: vi.fn(),
      list: vi.fn(),
      listWithStats: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      batchCreate: vi.fn()
    },
    novels: { create: vi.fn(), getById: vi.fn(), getByProject: vi.fn() },
    chapters: {
      create: vi.fn(),
      listByNovel: vi.fn(),
      listByNovelWithContent: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      getChapterCounts: vi.fn(),
      batchCreate: vi.fn()
    },
    characters: { create: vi.fn(), listByNovel: vi.fn() },
    worlds: { getByNovel: vi.fn(), save: vi.fn() },
    plotStructures: { getByNovel: vi.fn(), save: vi.fn() },
    outlines: { getByNovel: vi.fn(), save: vi.fn() },
    checkpoints: { create: vi.fn(), listByProject: vi.fn(), getSnapshot: vi.fn() },
    sessionMemories: { create: vi.fn(), listByProject: vi.fn() },
    saveWriterModel: vi.fn()
  } as unknown as IDatabase
}

function createMockLLMProvider(): ILLMProvider {
  return {
    configure: vi.fn(),
    resetConfig: vi.fn(),
    chat: vi.fn().mockResolvedValue({ content: '', usage: undefined }),
    testConnection: vi.fn().mockResolvedValue(true),
    chatStream: vi.fn().mockResolvedValue(undefined),
    cancelStream: vi.fn().mockReturnValue(true)
  }
}

function createMockSkillLoader(): ISkillLoader {
  return {
    getRegistry: vi.fn().mockReturnValue([]),
    getSkill: vi.fn().mockReturnValue(null),
    executeSkill: vi.fn().mockResolvedValue({ skillName: '', output: '' })
  }
}

function createMockLearningEngine(): ILearningEngine {
  return {
    recordInteraction: vi.fn().mockResolvedValue(undefined),
    analyzeProject: vi
      .fn()
      .mockResolvedValue({ patterns: [], suggestions: [], profile: {} as never, nextActions: [], shortcuts: [] }),
    getProjectSummary: vi.fn().mockReturnValue({}),
    getRecorder: vi.fn().mockReturnValue({ record: vi.fn() } as never),
    close: vi.fn()
  }
}

describe('IPC handler dependency injection', () => {
  const cases: Array<{
    name: string
    register: HandlerFn
    expectedTokens: string[]
    invoke?: { channel: string; args: unknown[] }
  }> = [
    {
      name: 'project',
      register: registerProjectHandlers,
      expectedTokens: [DATABASE_TOKEN],
      invoke: { channel: 'project:get', args: [VALID_UUID] }
    },
    {
      name: 'novel',
      register: registerNovelHandlers,
      expectedTokens: [DATABASE_TOKEN],
      invoke: { channel: 'novel:get', args: [VALID_UUID] }
    },
    {
      name: 'character',
      register: registerCharacterHandlers,
      expectedTokens: [DATABASE_TOKEN],
      invoke: { channel: 'character:list', args: [VALID_UUID] }
    },
    {
      name: 'world',
      register: registerWorldHandlers,
      expectedTokens: [DATABASE_TOKEN],
      invoke: { channel: 'world:get-by-novel', args: [VALID_UUID] }
    },
    {
      name: 'checkpoint',
      register: registerCheckpointHandlers,
      expectedTokens: [DATABASE_TOKEN],
      invoke: { channel: 'checkpoint:list', args: [VALID_UUID] }
    },
    {
      name: 'writer',
      register: registerWriterHandlers,
      expectedTokens: [DATABASE_TOKEN],
      invoke: { channel: 'writer-model:get', args: [VALID_UUID] }
    },
    {
      name: 'skill',
      register: registerSkillHandlers,
      expectedTokens: [SKILL_LOADER_TOKEN],
      invoke: { channel: 'skill:list', args: [] }
    },
    {
      name: 'chat',
      register: registerChatHandlers,
      expectedTokens: [LLM_PROVIDER_TOKEN],
      invoke: { channel: 'llm:chat', args: [{ messages: [{ role: 'user', content: 'hi' }] }] }
    },
    {
      name: 'llm-config',
      register: registerLLMConfigHandlers,
      expectedTokens: [LLM_PROVIDER_TOKEN]
    },
    {
      name: 'learning',
      register: registerLearningHandlers,
      expectedTokens: [LEARNING_ENGINE_TOKEN],
      invoke: { channel: 'learning:summary', args: [VALID_UUID] }
    },
    {
      name: 'db',
      register: registerDbHandlers,
      expectedTokens: [DATABASE_TOKEN],
      invoke: { channel: 'db:tables', args: [] }
    },
    {
      name: 'export',
      register: registerExportHandlers,
      expectedTokens: [DATABASE_TOKEN],
      invoke: { channel: 'export:project', args: [{ projectId: VALID_UUID, format: 'markdown' }] }
    },
    { name: 'storage', register: registerStorageHandlers, expectedTokens: [] },
    { name: 'monitor', register: registerMonitorHandlers, expectedTokens: [] }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(cases)(
    '$name handler resolves dependencies via ServiceRegistry',
    async ({ register, expectedTokens, invoke }) => {
      const ipcMain = createMockIpcMain()
      const { registry, resolved } = createSpyRegistry()
      registry.set(DATABASE_TOKEN, createMockDatabase())
      registry.set(LLM_PROVIDER_TOKEN, createMockLLMProvider())
      registry.set(SKILL_LOADER_TOKEN, createMockSkillLoader())
      registry.set(LEARNING_ENGINE_TOKEN, createMockLearningEngine())

      expect(() => register(ipcMain, registry)).not.toThrow()

      if (invoke) {
        const handler = ipcMain.handlers.get(invoke.channel)
        expect(handler).toBeDefined()
        // Invoke handler; ignore downstream errors — we only care that services were resolved.
        const call = handler as (...args: unknown[]) => unknown
        await Promise.resolve(call(null, ...invoke.args)).catch(() => undefined)
      }

      for (const token of expectedTokens) {
        expect(resolved).toContain(token)
      }
    }
  )
})
