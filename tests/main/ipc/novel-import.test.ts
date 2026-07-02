import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'

vi.mock('electron', () => ({
  app: {
    getPath: () => '',
    on: () => {}
  }
}))

vi.mock('../../../src/main/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

import { registerNovelHandlers } from '../../../src/main/ipc/novel.ipc'
import type { IDatabase } from '../../../src/main/di/service-interfaces'
import { ServiceRegistry } from '../../../src/main/di/service-registry'

const originalReadFileSync = fs.readFileSync

describe('novel:import IPC handler', () => {
  let registry: ServiceRegistry
  let handlers: Record<string, (event: unknown, ...args: unknown[]) => unknown>
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>
  let realpathSpy: ReturnType<typeof vi.spyOn>
  let statSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    vi.clearAllMocks()
    readFileSyncSpy?.mockRestore()
    realpathSpy?.mockRestore()
    statSpy?.mockRestore()
  })

  function createMockRegistry(db: Partial<IDatabase>): ServiceRegistry {
    registry = new ServiceRegistry()
    registry.set<IDatabase>('database' as never, db as IDatabase)
    return registry
  }

  function captureHandlers(ipcMain: Partial<IpcMain>): Record<string, (event: unknown, ...args: unknown[]) => unknown> {
    const captured: Record<string, (event: unknown, ...args: unknown[]) => unknown> = {}
    const mockIpcMain = {
      ...ipcMain,
      handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => {
        captured[channel] = handler
      }
    } as IpcMain
    registerNovelHandlers(mockIpcMain, registry)
    return captured
  }

  function mockValidFile(content: string, sizeBytes = 1024, filePath: string): void {
    realpathSpy = vi.spyOn(fs.promises, 'realpath').mockImplementation(async p => String(p))
    statSpy = vi.spyOn(fs.promises, 'stat').mockImplementation(async () => {
      const stats = {
        isFile: () => true,
        size: sizeBytes
      } as unknown as fs.Stats
      return stats
    })
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockImplementation((p, options) => {
      if (p === filePath) {
        return Buffer.from(content, 'utf-8')
      }
      return originalReadFileSync(p, options)
    })
  }

  it('should create project, novel and chapters from TXT file', async () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440001'
    const novelId = '550e8400-e29b-41d4-a716-446655440002'
    const chapterId = '550e8400-e29b-41d4-a716-446655440003'
    const filePath = path.join(process.cwd(), 'novel.txt')

    const db: Partial<IDatabase> = {
      createProject: vi.fn().mockReturnValue({ id: projectId, name: '测试小说' }),
      createNovel: vi.fn().mockReturnValue({ id: novelId, title: '测试小说', author: '' }),
      createChaptersBatch: vi.fn().mockReturnValue([{ id: chapterId }])
    }

    registry = createMockRegistry(db)
    handlers = captureHandlers({})
    mockValidFile('测试小说\n第一章 测试\n正文内容。', 1024, filePath)

    const handler = handlers['novel:import']
    const result = await handler({}, { filePath })

    expect(db.createProject).toHaveBeenCalled()
    expect(db.createNovel).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        title: '测试小说',
        genre: 'general'
      })
    )
    expect(db.createChaptersBatch).toHaveBeenCalled()
    expect(result).toMatchObject({
      projectId,
      novelId,
      title: '测试小说',
      chapterCount: 1,
      totalWordCount: expect.any(Number)
    })
  })

  it('should use provided projectId when given', async () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440001'
    const novelId = '550e8400-e29b-41d4-a716-446655440002'
    const filePath = path.join(process.cwd(), 'novel.txt')

    const db: Partial<IDatabase> = {
      createProject: vi.fn(),
      createNovel: vi.fn().mockReturnValue({ id: novelId, title: '测试', author: '' }),
      createChaptersBatch: vi.fn().mockReturnValue([])
    }

    registry = createMockRegistry(db)
    handlers = captureHandlers({})
    mockValidFile('正文内容。', 1024, filePath)

    const handler = handlers['novel:import']
    await handler({}, { filePath, projectId })

    expect(db.createProject).not.toHaveBeenCalled()
    expect(db.createNovel).toHaveBeenCalledWith(expect.objectContaining({ projectId }))
  })

  it('should reject invalid filePath', async () => {
    const db: Partial<IDatabase> = {
      createProject: vi.fn(),
      createNovel: vi.fn(),
      createChaptersBatch: vi.fn()
    }

    registry = createMockRegistry(db)
    handlers = captureHandlers({})

    const handler = handlers['novel:import']
    await expect(handler({}, { filePath: '' })).rejects.toThrow('文件路径 不能为空')
  })
})
