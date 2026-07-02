import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IpcMain } from 'electron'

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn()
  },
  app: {
    getPath: () => '',
    on: () => {}
  }
}))

vi.mock('../../../src/main/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

import { dialog } from 'electron'
import { registerImportHandlers } from '../../../src/main/ipc/import.ipc'

describe('import:select-file IPC handler', () => {
  let handlers: Record<string, (event: unknown, ...args: unknown[]) => unknown>

  afterEach(() => {
    vi.clearAllMocks()
  })

  function captureHandlers(ipcMain: Partial<IpcMain>): Record<string, (event: unknown, ...args: unknown[]) => unknown> {
    const captured: Record<string, (event: unknown, ...args: unknown[]) => unknown> = {}
    const mockIpcMain = {
      ...ipcMain,
      handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => {
        captured[channel] = handler
      }
    } as IpcMain
    registerImportHandlers(mockIpcMain)
    return captured
  }

  it('should return canceled true when user cancels', async () => {
    handlers = captureHandlers({})
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({ canceled: true, filePaths: [] } as never)

    const handler = handlers['import:select-file']
    const result = await handler({})

    expect(result).toEqual({ canceled: true, filePath: null })
  })

  it('should return selected file path', async () => {
    handlers = captureHandlers({})
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\Users\\test\\novel.txt']
    } as never)

    const handler = handlers['import:select-file']
    const result = await handler({})

    expect(result).toEqual({ canceled: false, filePath: 'C:\\Users\\test\\novel.txt' })
    expect(dialog.showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: ['openFile'],
        filters: expect.arrayContaining([expect.objectContaining({ name: '小说文件' })])
      })
    )
  })
})
