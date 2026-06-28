import type { IpcMain } from 'electron'
import { requireNonEmptyString, wrap } from './index'
import { isLLMConfigKey, SecureConfig } from '../secure-config'
import { MAX_STRING_LENGTH } from '../../shared/constants'
import { logger } from '../utils/logger'
import type { ServiceRegistry } from '../di'

const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/

export function registerStorageHandlers(ipcMain: IpcMain, _services: ServiceRegistry): void {
  ipcMain.handle(
    'storage:encryptSet',
    wrap(async (key: string, value: string) => {
      requireNonEmptyString(key, '键名')
      if (!KEY_PATTERN.test(key)) throw new Error('键名格式无效')
      if (isLLMConfigKey(key)) throw new Error('不允许通过通用存储设置 LLM 配置键')
      requireNonEmptyString(value, '值')
      if (value.length > MAX_STRING_LENGTH) throw new Error('值过长')
      try {
        const data = SecureConfig.load() ?? {}
        data[key] = value
        SecureConfig.save(data)
        return true
      } catch (e) {
        logger.error('SecureConfig set failed:', e)
        return false
      }
    })
  )

  ipcMain.handle(
    'storage:encryptGet',
    wrap(async (key: string) => {
      requireNonEmptyString(key, '键名')
      if (isLLMConfigKey(key)) throw new Error('不允许通过通用存储读取 LLM 配置键')
      try {
        const data = SecureConfig.load()
        if (!data || typeof data !== 'object') return null
        const value = (data as Record<string, unknown>)[key]
        return typeof value === 'string' ? value : null
      } catch (e) {
        logger.error('SecureConfig get failed:', e)
        return null
      }
    })
  )

  ipcMain.handle(
    'storage:encryptRemove',
    wrap(async (key: string) => {
      requireNonEmptyString(key, '键名')
      if (isLLMConfigKey(key)) throw new Error('不允许通过通用存储删除 LLM 配置键')
      try {
        const data = SecureConfig.load()
        if (data && typeof data === 'object') {
          delete (data as Record<string, unknown>)[key]
          SecureConfig.save(data)
        }
        return true
      } catch (e) {
        logger.error('SecureConfig remove failed:', e)
        return false
      }
    })
  )
}
