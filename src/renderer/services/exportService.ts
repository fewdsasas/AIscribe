import type { AiscribeAPI } from '@shared/types/electron'
import type { ExportResult } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface IExportService {
  exportProject(options: { projectId: string; format: string; includeSynopsis?: boolean }): Promise<ExportResult>
}

export function createExportService(api: AiscribeAPI): IExportService {
  return {
    exportProject: options => api.exportProject(options)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const exportService: IExportService = createExportService(api)
