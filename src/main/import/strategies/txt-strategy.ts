import type { ImportFormat, ParsedNovel, ParserStrategy } from '../parser-types'
import { parseTxtBuffer } from '../txt-parser'

export class TxtParserStrategy implements ParserStrategy {
  readonly format: ImportFormat = 'txt'
  readonly supportedExtensions = ['.txt'] as const

  parse(buffer: Buffer): ParsedNovel {
    return parseTxtBuffer(buffer)
  }
}
