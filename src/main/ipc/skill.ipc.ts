import type { IpcMain } from 'electron'
import { requireNonEmptyString, SKILL_LOADER_TOKEN, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { ISkillLoader } from '../di'

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
    wrap(async (name: string) => {
      requireNonEmptyString(name, '技能名称')
      const loader = services.resolve<ISkillLoader>(SKILL_LOADER_TOKEN)
      const skill = loader.getSkill(name)
      return skill ? { name: skill.name, description: skill.description, category: skill.category } : null
    })
  )
  ipcMain.handle(
    'skill:invoke',
    wrap(async (name: string, input: { prompt: string }) => {
      requireNonEmptyString(name, '技能名称')
      requireNonEmptyString(input?.prompt, '提示词')
      return services.resolve<ISkillLoader>(SKILL_LOADER_TOKEN).executeSkill(name, input)
    })
  )
}
