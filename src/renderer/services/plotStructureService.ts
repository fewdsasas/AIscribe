import type { AiscribeAPI } from '@shared/types/electron'
import type { PlotStructure } from '@shared/types'
import type { SavePlotStructureData } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface IPlotStructureService {
  getByNovel(novelId: string): Promise<PlotStructure | null>
  save(data: SavePlotStructureData): Promise<PlotStructure>
}

export function createPlotStructureService(api: AiscribeAPI): IPlotStructureService {
  return {
    getByNovel: novelId => api.plotStructureGetByNovel(novelId),
    save: data => api.plotStructureSave(data)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const plotStructureService: IPlotStructureService = createPlotStructureService(api)
