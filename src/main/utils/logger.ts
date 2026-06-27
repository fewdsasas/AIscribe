/**
 * Main 进程日志工具
 *
 * 在开发环境下输出彩色日志，生产环境静默。
 * 可通过 electron-log 等库替换以支持日志文件持久化。
 */

const isDev = process.env.NODE_ENV === 'development'

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
