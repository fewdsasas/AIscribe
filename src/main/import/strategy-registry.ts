import path from 'path'
import type { ImportFormat, ParserStrategy } from './parser-types'
import { NovelParseError } from './parser-types'

export class StrategyRegistry {
  private strategies = new Map<ImportFormat, ParserStrategy>()
  private extensionMap = new Map<string, ImportFormat>()

  register(strategy: ParserStrategy): void {
    this.strategies.set(strategy.format, strategy)
    for (const ext of strategy.supportedExtensions) {
      const normalized = ext.toLowerCase()
      if (this.extensionMap.has(normalized)) {
        throw new Error(`扩展名 ${normalized} 已被格式 ${this.extensionMap.get(normalized)} 注册`)
      }
      this.extensionMap.set(normalized, strategy.format)
    }
  }

  get(format: ImportFormat): ParserStrategy | undefined {
    return this.strategies.get(format)
  }

  resolveFormat(filePath: string, format?: ImportFormat): ImportFormat {
    if (format) {
      if (!this.strategies.has(format)) {
        throw new NovelParseError(`不支持的格式: ${format}`, 'unsupported_format')
      }
      return format
    }

    const ext = path.extname(filePath).toLowerCase()
    const resolved = this.extensionMap.get(ext)
    if (!resolved) {
      throw new NovelParseError(`无法识别文件格式: ${ext || '无扩展名'}`, 'unsupported_format')
    }
    return resolved
  }

  resolveStrategy(filePath: string, format?: ImportFormat): ParserStrategy {
    const resolvedFormat = this.resolveFormat(filePath, format)
    const strategy = this.strategies.get(resolvedFormat)
    if (!strategy) {
      throw new NovelParseError(`未找到格式处理器: ${resolvedFormat}`, 'unsupported_format')
    }
    return strategy
  }
}
