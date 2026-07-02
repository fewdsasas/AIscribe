import type { IpcMain } from 'electron'
import { requireNonEmptyString, requireObject, SKILL_LOADER_TOKEN, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { ISkillLoader } from '../di'
import type { SkillGetData, SkillInvokeData } from '../../shared/types/ipc'

export function registerSkillHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'skill:list',
    wrap(async () => {
      const loader = services.resolve<ISkillLoader>(SKILL_LOADER_TOKEN)
      return loader.getRegistry().map(s => ({ name: s.name, description: s.description }))
    })
  )
  ipcMain.handle(
    'skill:get',
    wrap(async (data: SkillGetData) => {
      requireObject(data, '查询数据')
      requireNonEmptyString(data.name, '技能名称')
      const loader = services.resolve<ISkillLoader>(SKILL_LOADER_TOKEN)
      const skill = loader.getSkill(data.name)
      return skill ? { name: skill.name, description: skill.description, category: skill.category } : null
    })
  )
  ipcMain.handle(
    'skill:invoke',
    wrap(async (data: SkillInvokeData) => {
      requireObject(data, '技能调用数据')
      requireNonEmptyString(data.name, '技能名称')
      requireNonEmptyString(data.prompt, '提示词')
      return services.resolve<ISkillLoader>(SKILL_LOADER_TOKEN).executeSkill(data.name, { prompt: data.prompt })
    })
  )
}
