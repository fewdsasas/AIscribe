import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { LLM_PROVIDER_TOKEN, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { ILLMProvider } from '../di'
import { SecureLLMConfig } from '../secure-config'
import type { LLMConfig } from '../../shared/types'

export function registerLLMConfigHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  const llm = services.resolve<ILLMProvider>(LLM_PROVIDER_TOKEN)

  ipcMain.handle(
    IPC_CHANNELS.LLM_CONFIG,
    wrap(async (config: LLMConfig) => {
      requireObject(config, 'LLM 配置')
      requireNonEmptyString(config.provider, '提供商')
      requireNonEmptyString(config.apiKey, 'API密钥')
      requireNonEmptyString(config.model, '模型')
      if (config.apiKey.length < 10) throw new Error('API密钥格式无效')
      llm.configure(config)
      SecureLLMConfig.save(config as unknown as Record<string, unknown>)
      return true
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.LLM_IS_CONFIGURED,
    wrap(async () => {
      return SecureLLMConfig.exists()
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.LLM_CONFIG_META,
    wrap(async () => {
      const raw = SecureLLMConfig.load()
      if (!raw) return null
      const { apiKey, ...meta } = raw
      return { ...meta, hasKey: !!apiKey }
    })
  )
}
