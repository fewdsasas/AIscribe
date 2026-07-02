import type { AiscribeAPI } from '@shared/types/electron'
import type { ImportNovelData, ImportNovelResult, SelectNovelFileResult } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface IImportService {
  selectNovelFile(): Promise<SelectNovelFileResult>
  novelImport(data: ImportNovelData): Promise<ImportNovelResult>
}

export function createImportService(api: AiscribeAPI): IImportService {
  return {
    selectNovelFile: () => api.selectNovelFile(),
    novelImport: data => api.novelImport(data)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const importService: IImportService = createImportService(api)
