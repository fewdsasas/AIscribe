import type { AiscribeAPI } from '@shared/types/electron'
import type { AiRepairData, AiRepairResult } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface IRepairService {
  /** 手动触发 AI 结构修复 */
  triggerAiRepair(data: AiRepairData): Promise<AiRepairResult>
  /** 注册修复进度监听 */
  onRepairProgress(callback: (data: { novelId: string; current: number; total: number; action: string }) => void): void
  /** 注册修复完成监听 */
  onRepairDone(callback: (data: { novelId: string; actionsCount: number }) => void): void
  /** 移除修复事件监听器，防止组件卸载后泄漏 */
  removeRepairListeners(): void
}

export function createRepairService(api: AiscribeAPI): IRepairService {
  return {
    triggerAiRepair: data => api.triggerAiRepair(data),
    onRepairProgress: callback => api.onRepairProgress(callback),
    onRepairDone: callback => api.onRepairDone(callback),
    removeRepairListeners: () => api.removeRepairListeners()
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const repairService: IRepairService = createRepairService(api)
