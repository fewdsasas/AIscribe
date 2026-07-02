/**
 * Main 进程日志工具
 *
 * 开发环境：所有级别输出到控制台（带时间戳）。
 * 生产环境：warn/error 输出到控制台，info/log 写入日志文件。
 * 日志文件路径：{userData}/aiscribe.log
 */

import * as fs from 'fs'
import * as path from 'path'

const isDev = process.env.NODE_ENV === 'development'

let logFilePath: string | null = null

function formatTimestamp(): string {
  return new Date().toISOString()
}

function formatMessage(level: string, args: unknown[]): string {
  const ts = formatTimestamp()
  const message = args
    .map(a => (typeof a === 'string' ? a : a instanceof Error ? a.stack || a.message : JSON.stringify(a)))
    .join(' ')
  return `[${ts}] [${level}] ${message}\n`
}

function writeToFile(level: string, args: unknown[]): void {
  if (!logFilePath) return
  const line = formatMessage(level, args)
  fs.appendFile(logFilePath, line, () => {
    // fire-and-forget, ignore write errors
  })
}

/**
 * 初始化日志文件路径。应在 app ready 后调用。
 * 重复调用安全，仅首次生效。
 */
export function initLogger(userDataPath: string): void {
  if (logFilePath) return
  logFilePath = path.join(userDataPath, 'aiscribe.log')

  // 首次初始化时写入启动分隔线
  const separator = `\n${'='.repeat(60)}\n`
  const header = `[${formatTimestamp()}] AIscribe started (${isDev ? 'dev' : 'prod'})\n`
  fs.appendFile(logFilePath, separator + header, () => {})
}

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(formatTimestamp(), '[LOG]', ...args)
    } else {
      writeToFile('LOG', args)
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(formatTimestamp(), '[INFO]', ...args)
    } else {
      writeToFile('INFO', args)
    }
  },
  warn: (...args: unknown[]) => {
    console.warn(formatTimestamp(), '[WARN]', ...args)
    if (!isDev) writeToFile('WARN', args)
  },
  error: (...args: unknown[]) => {
    console.error(formatTimestamp(), '[ERROR]', ...args)
    if (!isDev) writeToFile('ERROR', args)
  }
}
