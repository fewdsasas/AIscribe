import type { IpcMain } from 'electron'
import { requireNonEmptyString, requireObject, wrap } from './index'
import { isLLMConfigKey, SecureConfig } from '../secure-config'
import { MAX_STRING_LENGTH } from '../../shared/constants'
import type { ServiceRegistry } from '../di'
import type { EncryptGetData, EncryptRemoveData, EncryptSetData, OperationResult } from '../../shared/types/ipc'

const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/

export function registerStorageHandlers(ipcMain: IpcMain, _services: ServiceRegistry): void {
  ipcMain.handle(
    'storage:encryptSet',
    wrap(async (data: EncryptSetData): Promise<OperationResult> => {
      requireObject(data, '加密存储数据')
      requireNonEmptyString(data.key, '键名')
      if (!KEY_PATTERN.test(data.key)) throw new Error('键名格式无效')
      if (isLLMConfigKey(data.key)) throw new Error('不允许通过通用存储设置 LLM 配置键')
      requireNonEmptyString(data.value, '值')
      if (data.value.length > MAX_STRING_LENGTH) throw new Error('值过长')
      const storedData = SecureConfig.load() ?? {}
      storedData[data.key] = data.value
      SecureConfig.save(storedData)
      return { success: true }
    })
  )

  ipcMain.handle(
    'storage:encryptGet',
    wrap(async (data: EncryptGetData) => {
      requireObject(data, '查询数据')
      requireNonEmptyString(data.key, '键名')
      if (isLLMConfigKey(data.key)) throw new Error('不允许通过通用存储读取 LLM 配置键')
      const storedData = SecureConfig.load()
      if (!storedData || typeof storedData !== 'object') return null
      const value = (storedData as Record<string, unknown>)[data.key]
      return typeof value === 'string' ? value : null
    })
  )

  ipcMain.handle(
    'storage:encryptRemove',
    wrap(async (data: EncryptRemoveData): Promise<OperationResult> => {
      requireObject(data, '删除数据')
      requireNonEmptyString(data.key, '键名')
      if (isLLMConfigKey(data.key)) throw new Error('不允许通过通用存储删除 LLM 配置键')
      const storedData = SecureConfig.load()
      if (storedData && typeof storedData === 'object') {
        delete (storedData as Record<string, unknown>)[data.key]
        SecureConfig.save(storedData)
      }
      return { success: true }
    })
  )
}
