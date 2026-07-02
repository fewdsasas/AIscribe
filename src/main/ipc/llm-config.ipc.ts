import type { IpcMain } from 'electron'
import { LLM_PROVIDER_TOKEN, requireEnum, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { ILLMProvider } from '../di'
import { SecureLLMConfig } from '../secure-config'
import type { LLMConfig } from '../../shared/types'
import type { LLMTestConnectionResult, OperationResult } from '../../shared/types/ipc'

export function registerLLMConfigHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  const llm = services.resolve<ILLMProvider>(LLM_PROVIDER_TOKEN)

  ipcMain.handle(
    'llm:config',
    wrap(async (config: LLMConfig): Promise<OperationResult> => {
      requireObject(config, 'LLM 配置')
      requireNonEmptyString(config.provider, '提供商')
      requireNonEmptyString(config.apiKey, 'API密钥')
      requireNonEmptyString(config.model, '模型')
      if (config.apiKey.length < 10) throw new Error('API密钥格式无效')
      if (config.customProtocol) {
        requireEnum(config.customProtocol, ['openai', 'anthropic'], '自定义协议')
      }
      llm.configure(config)
      SecureLLMConfig.save(config as unknown as Record<string, unknown>)
      return { success: true }
    })
  )

  ipcMain.handle(
    'llm:is-configured',
    wrap(async () => {
      return SecureLLMConfig.exists()
    })
  )

  ipcMain.handle(
    'llm:config-meta',
    wrap(async () => {
      const raw = SecureLLMConfig.load()
      if (!raw) return null
      const { apiKey, ...meta } = raw
      const customProtocol =
        meta.customProtocol === 'anthropic' || meta.customProtocol === 'openai'
          ? (meta.customProtocol as 'openai' | 'anthropic')
          : undefined
      return { ...meta, hasKey: !!apiKey, customProtocol }
    })
  )

  ipcMain.handle(
    'llm:test-connection',
    wrap(async (config: LLMConfig): Promise<LLMTestConnectionResult> => {
      requireObject(config, 'LLM 配置')
      requireNonEmptyString(config.provider, '提供商')
      requireNonEmptyString(config.apiKey, 'API密钥')
      requireNonEmptyString(config.model, '模型')
      if (config.apiKey.length < 10) throw new Error('API密钥格式无效')
      if (config.customProtocol) {
        requireEnum(config.customProtocol, ['openai', 'anthropic'], '自定义协议')
      }
      const connected = await llm.testConnection(config)
      return { success: true, connected }
    })
  )
}
