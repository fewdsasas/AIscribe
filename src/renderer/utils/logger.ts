/**
 * Renderer 进程日志工具
 *
 * 仅在开发环境下输出日志，生产环境静默。
 * 可通过 import { logger } from '../utils/logger' 使用。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isDev = typeof (import.meta as any).env !== 'undefined' && (import.meta as any).env.DEV === true

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },
  warn: (...args: unknown[]) => {
    console.warn(...args)
  },
  error: (...args: unknown[]) => {
    console.error(...args)
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args)
  }
}
