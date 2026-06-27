import type { AiscribeAPI } from '@shared/types/electron'
import type { Checkpoint } from '@shared/types'
import type { CreateCheckpointData } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface ICheckpointService {
  list(projectId: string): Promise<Checkpoint[]>
  create(data: CreateCheckpointData): Promise<Checkpoint>
  restore(id: string): Promise<boolean>
}

export function createCheckpointService(api: AiscribeAPI): ICheckpointService {
  return {
    list: projectId => api.checkpointList(projectId),
    create: data => api.checkpointCreate(data),
    restore: id => api.checkpointRestore(id)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const checkpointService: ICheckpointService = createCheckpointService(api)
