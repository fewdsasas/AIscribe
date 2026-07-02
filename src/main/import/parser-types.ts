export type ImportFormat = 'txt' | 'epub' | 'docx' | 'pdf'

export interface ParsedChapter {
  title: string
  content: string
  wordCount: number
}

export interface ParsedNovel {
  title: string
  author: string
  synopsis?: string
  chapters: ParsedChapter[]
}

export type NovelParseErrorCode =
  | 'unsupported_format'
  | 'read_failed'
  | 'decode_failed'
  | 'parse_failed'
  | 'empty_content'
  | 'path_forbidden'
  | 'file_too_large'

export class NovelParseError extends Error {
  constructor(
    message: string,
    public code: NovelParseErrorCode,
    public cause?: unknown
  ) {
    super(message)
    this.name = 'NovelParseError'
  }
}

export interface ParserStrategy {
  readonly format: ImportFormat
  readonly supportedExtensions: readonly string[]
  parse(buffer: Buffer): Promise<ParsedNovel> | ParsedNovel
}
