import type { IpcMain } from 'electron'
import { requireId, requireObject, wrap, wrapEvent } from './index'
import type { ServiceRegistry } from '../di'
import { DATABASE_TOKEN, LLM_PROVIDER_TOKEN } from '../di'
import type { IDatabase, ILLMProvider } from '../di/service-interfaces'
import type { AiRepairData, AiRepairResult } from '../../shared/types/ipc'
import { buildParsedNovelFromDB, executeRepairWithWriteBack } from './repair-utils'

export function registerRepairHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  // 手动触发 AI 修复（对已导入的小说）
  ipcMain.handle(
    'import:ai-repair',
    wrap(async (data: AiRepairData): Promise<AiRepairResult> => {
      requireObject(data, '修复数据')
      requireId(data.novelId, '小说ID')
      requireId(data.projectId, '项目ID')

      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      const llm = await services.resolveAsync<ILLMProvider>(LLM_PROVIDER_TOKEN)

      const parsed = buildParsedNovelFromDB(d, data.novelId)
      if (!parsed) {
        return { applied: false, actionsCount: 0, actions: [] }
      }

      const result = await executeRepairWithWriteBack(d, llm, data.novelId, parsed)

      return {
        applied: result.applied,
        actionsCount: result.actions.filter(a => a.type !== 'no_change').length,
        actions: result.actions
      }
    })
  )

  // 异步修复的进度通知事件（由 novel:import 调用方使用 wrapEvent 进行推送）
  ipcMain.handle(
    'import:ai-repair-stream',
    wrapEvent(async (_event, data: AiRepairData): Promise<AiRepairResult> => {
      const sender = _event.sender
      requireObject(data, '修复数据')
      requireId(data.novelId, '小说ID')
      requireId(data.projectId, '项目ID')

      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      const llm = await services.resolveAsync<ILLMProvider>(LLM_PROVIDER_TOKEN)

      const parsed = buildParsedNovelFromDB(d, data.novelId)
      if (!parsed) {
        return { applied: false, actionsCount: 0, actions: [] }
      }

      // 异步推送进度
      sender.send('import:repair-progress', {
        novelId: data.novelId,
        current: 0,
        total: parsed.chapters.length,
        action: '正在分析章节结构...'
      })

      const result = await executeRepairWithWriteBack(d, llm, data.novelId, parsed, {
        onProgress: (current, total, action) => {
          sender.send('import:repair-progress', { novelId: data.novelId, current, total, action })
        }
      })

      sender.send('import:repair-done', {
        novelId: data.novelId,
        actionsCount: result.actions.filter(a => a.type !== 'no_change').length
      })

      return {
        applied: result.applied,
        actionsCount: result.actions.filter(a => a.type !== 'no_change').length,
        actions: result.actions
      }
    })
  )
}
