import type { ImportFormat, ParsedNovel, ParserStrategy } from '../parser-types'
import { parseEpubBuffer } from '../epub-parser'

export class EpubParserStrategy implements ParserStrategy {
  readonly format: ImportFormat = 'epub'
  readonly supportedExtensions = ['.epub'] as const

  async parse(buffer: Buffer): Promise<ParsedNovel> {
    return parseEpubBuffer(buffer)
  }
}
