import { describe, expect, it } from 'vitest'
import { StrategyRegistry } from '../../../src/main/import/strategy-registry'
import { NovelParseError } from '../../../src/main/import/parser-types'
import type { ImportFormat, ParsedNovel, ParserStrategy } from '../../../src/main/import/parser-types'

class FakeTxtStrategy implements ParserStrategy {
  readonly format: ImportFormat = 'txt'
  readonly supportedExtensions = ['.txt'] as const
  parse(): ParsedNovel {
    return { title: 'fake', author: '', chapters: [] }
  }
}

describe('StrategyRegistry', () => {
  it('should resolve format by extension', () => {
    const registry = new StrategyRegistry()
    registry.register(new FakeTxtStrategy())
    expect(registry.resolveFormat('/tmp/novel.txt')).toBe('txt')
  })

  it('should resolve strategy by file path', () => {
    const registry = new StrategyRegistry()
    registry.register(new FakeTxtStrategy())
    const strategy = registry.resolveStrategy('/tmp/novel.txt')
    expect(strategy.format).toBe('txt')
  })

  it('should resolve explicit format ignoring extension', () => {
    const registry = new StrategyRegistry()
    registry.register(new FakeTxtStrategy())
    expect(registry.resolveFormat('/tmp/novel.unknown', 'txt')).toBe('txt')
  })

  it('should throw unsupported_format for unknown extension', () => {
    const registry = new StrategyRegistry()
    registry.register(new FakeTxtStrategy())
    expect(() => registry.resolveFormat('/tmp/novel.pdf')).toThrow(NovelParseError)
    expect(() => registry.resolveFormat('/tmp/novel.pdf')).toThrow(/无法识别文件格式/)
  })

  it('should throw unsupported_format for unregistered explicit format', () => {
    const registry = new StrategyRegistry()
    registry.register(new FakeTxtStrategy())
    expect(() => registry.resolveFormat('/tmp/novel.txt', 'epub')).toThrow(NovelParseError)
  })

  it('should throw when registering duplicate extension', () => {
    const registry = new StrategyRegistry()
    registry.register(new FakeTxtStrategy())
    expect(() => registry.register(new FakeTxtStrategy())).toThrow(/已被格式/)
  })

  it('should throw when resolving strategy for unsupported format', () => {
    const registry = new StrategyRegistry()
    registry.register(new FakeTxtStrategy())
    expect(() => registry.resolveStrategy('/tmp/novel.txt', 'epub')).toThrow(NovelParseError)
  })
})
