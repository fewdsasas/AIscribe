import { dialog } from 'electron'
import type { IpcMain } from 'electron'
import { wrap } from './index'

export function registerImportHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    'import:select-file',
    wrap(async (): Promise<{ canceled: boolean; filePath: string | null }> => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: '小说文件', extensions: ['txt', 'epub', 'docx', 'pdf'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true, filePath: null }
      }

      return { canceled: false, filePath: result.filePaths[0] }
    })
  )
}
