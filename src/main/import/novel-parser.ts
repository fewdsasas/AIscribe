import fs from 'fs'
import { MAX_IMPORT_FILE_SIZE_BYTES } from '../../shared/constants'
import type { ImportFormat, ParsedNovel, ParserStrategy } from './parser-types'
import { NovelParseError } from './parser-types'
import { StrategyRegistry } from './strategy-registry'
import { validateImportPath } from './path-validator'
import { DocxParserStrategy } from './strategies/docx-strategy'
import { EpubParserStrategy } from './strategies/epub-strategy'
import { PdfParserStrategy } from './strategies/pdf-strategy'
import { TxtParserStrategy } from './strategies/txt-strategy'

export class NovelParser {
  private registry: StrategyRegistry

  constructor(strategies: ParserStrategy[] = []) {
    this.registry = new StrategyRegistry()
    for (const strategy of strategies) {
      this.registry.register(strategy)
    }
  }

  /**
   * Parse a novel file from disk. The format is inferred from the file extension
   * unless explicitly provided.
   */
  async parseFile(filePath: string, format?: ImportFormat): Promise<ParsedNovel> {
    await validateImportPath(filePath, { maxSizeBytes: MAX_IMPORT_FILE_SIZE_BYTES })

    const strategy = this.registry.resolveStrategy(filePath, format)

    let buffer: Buffer
    try {
      buffer = fs.readFileSync(filePath)
    } catch (e) {
      throw new NovelParseError(`读取文件失败: ${filePath}`, 'read_failed', e)
    }

    return this.parseBuffer(buffer, strategy.format)
  }

  /**
   * Parse a novel from a buffer. Useful for tests and IPC handlers that already
   * have the file content in memory.
   */
  async parseBuffer(buffer: Buffer, format: ImportFormat): Promise<ParsedNovel> {
    const strategy = this.registry.get(format)
    if (!strategy) {
      throw new NovelParseError(`不支持的格式: ${format}`, 'unsupported_format')
    }

    try {
      const result = strategy.parse(buffer)
      return await Promise.resolve(result)
    } catch (e) {
      if (e instanceof NovelParseError) throw e
      throw new NovelParseError(`解析失败: ${format}`, 'parse_failed', e)
    }
  }

  /**
   * Infer the import format from a file path.
   */
  inferFormat(filePath: string): ImportFormat {
    return this.registry.resolveFormat(filePath)
  }
}

export function createDefaultNovelParser(): NovelParser {
  return new NovelParser([
    new TxtParserStrategy(),
    new EpubParserStrategy(),
    new DocxParserStrategy(),
    new PdfParserStrategy()
  ])
}

export const novelParser = createDefaultNovelParser()
