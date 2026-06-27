import type { AiscribeAPI } from '@shared/types/electron'
import type { SkillDetailItem, SkillInvokeResult, SkillListItem } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface ISkillService {
  list(): Promise<SkillListItem[]>
  get(name: string): Promise<SkillDetailItem | null>
  invoke(name: string, input: { prompt: string }): Promise<SkillInvokeResult>
}

export function createSkillService(api: AiscribeAPI): ISkillService {
  return {
    list: () => api.skillList(),
    get: name => api.skillGet(name),
    invoke: (name, input) => api.skillInvoke(name, input)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const skillService: ISkillService = createSkillService(api)
