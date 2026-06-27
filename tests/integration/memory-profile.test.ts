import { describe, expect, it } from 'vitest'
import { LRUCache } from '../../src/main/memory/lru-cache'

/**
 * 内存占用采样测试 - 输出各场景的内存曲线数据
 */

function snapshot(label: string) {
  const mem = process.memoryUsage()
  console.log(
    `[MEM] ${label.padEnd(45)} | rss: ${(mem.rss / 1024 / 1024).toFixed(1).padStart(7)}MB | heapUsed: ${(mem.heapUsed / 1024 / 1024).toFixed(1).padStart(7)}MB | heapTotal: ${(mem.heapTotal / 1024 / 1024).toFixed(1).padStart(7)}MB | external: ${(mem.external / 1024 / 1024).toFixed(1).padStart(6)}MB`
  )
}

describe('Memory Profile', () => {
  it('LRU Cache: 200 entries with memory curve', () => {
    snapshot('baseline (before LRU)')
    const cache = new LRUCache<string, string>(100, 60_000)

    // 写入 50
    for (let i = 0; i < 50; i++) {
      cache.set(`key-${i}`, `value-${i}`.repeat(100))
    }
    snapshot('after 50 entries')

    // 写入到 100
    for (let i = 50; i < 100; i++) {
      cache.set(`key-${i}`, `value-${i}`.repeat(100))
    }
    snapshot('after 100 entries (full)')

    // 写入到 200（触发淘汰）
    for (let i = 100; i < 200; i++) {
      cache.set(`key-${i}`, `value-${i}`.repeat(100))
    }
    snapshot('after 200 entries (100 evicted)')

    // 随机读取 50 次
    for (let i = 0; i < 50; i++) {
      cache.get(`key-${100 + i}`)
    }
    snapshot('after 50 random gets')

    // 大值对象测试
    const bigCache = new LRUCache<string, string>(50, 60_000)
    for (let i = 0; i < 50; i++) {
      bigCache.set(`big-${i}`, 'x'.repeat(10_000)) // 10KB per entry
    }
    snapshot('after 50 x 10KB entries (~500KB)')

    // 清理
    bigCache.clear()
    snapshot('after bigCache.clear()')
    cache.clear()
    snapshot('after cache.clear()')

    if (global.gc) global.gc()
    snapshot('after manual GC')
    expect(true).toBe(true)
  })

  it('SSE Stream: 5000 chunks memory curve', async () => {
    snapshot('baseline (before SSE)')

    const chunkCount = 5000
    const chunks: Uint8Array[] = []

    // 构造 5000 个 SSE chunk
    for (let i = 0; i < chunkCount; i++) {
      const line = `data: {"choices":[{"delta":{"content":"chunk-${i}"}}]}\n\n`
      chunks.push(new TextEncoder().encode(line))
    }
    snapshot(`after building ${chunkCount} chunks in memory`)

    // 模拟流式读取（使用增量解析逻辑）
    let buffer = ''
    let chunkReceived = 0
    let totalContent = ''

    for (let i = 0; i < chunks.length; i++) {
      buffer += new TextDecoder().decode(chunks[i], { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6))
            const content = json.choices?.[0]?.delta?.content || ''
            totalContent += content
            chunkReceived++
          } catch {
            // skip
          }
        }
      }
      if (i % 1000 === 999) {
        snapshot(`SSE parsing at chunk ${i + 1}/${chunkCount}`)
      }
    }

    snapshot(`SSE done: ${chunkReceived} chunks parsed`)
    expect(chunkReceived).toBe(chunkCount)
    expect(totalContent.length).toBeGreaterThan(0)

    // 清理引用
    chunks.length = 0
    totalContent = ''
    buffer = ''
    snapshot('after SSE cleanup')
    if (global.gc) global.gc()
    snapshot('after manual GC')
  })

  it('Array growth: pending messages simulation', () => {
    snapshot('baseline (before array growth)')

    // 模拟无限制的 pending 数组
    const unbounded: string[] = []
    for (let i = 0; i < 5000; i++) {
      unbounded.push(JSON.stringify({ sql: 'INSERT INTO test VALUES(?)', params: [i], ts: Date.now() }))
    }
    snapshot('unbounded array: 5000 entries')

    // 模拟有 MAX_PENDING 限制的环形缓冲
    const MAX_PENDING = 1000
    const bounded: string[] = []
    let flushCount = 0
    for (let i = 0; i < 5000; i++) {
      if (bounded.length >= MAX_PENDING) {
        bounded.length = 0 // flush
        flushCount++
      }
      bounded.push(JSON.stringify({ sql: 'INSERT INTO test VALUES(?)', params: [i], ts: Date.now() }))
    }
    snapshot(`bounded array: 5000 pushes, ${flushCount} flushes, ${bounded.length} pending`)

    // 对比内存
    unbounded.length = 0
    bounded.length = 0
    snapshot('after both cleared')
    if (global.gc) global.gc()
    snapshot('after manual GC')
    expect(true).toBe(true)
  })

  it('chapterList size comparison: full vs summary', () => {
    snapshot('baseline (before chapter simulation)')

    // 模拟 100 章完整数据（含 content）
    const fullChapters: any[] = []
    for (let i = 0; i < 100; i++) {
      fullChapters.push({
        id: `ch-${i}`,
        title: `Chapter ${i}`,
        content: JSON.stringify({
          type: 'doc',
          content: Array(50).fill({ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(500) }] })
        }),
        sort_order: i,
        word_count: 5000,
        status: 'draft',
        updated_at: new Date().toISOString()
      })
    }
    snapshot('100 full chapters (with content)')

    // 模拟 100 章摘要数据（不含 content）
    const summaryChapters: any[] = []
    for (let i = 0; i < 100; i++) {
      summaryChapters.push({
        id: `ch-${i}`,
        title: `Chapter ${i}`,
        sort_order: i,
        word_count: 5000,
        status: 'draft',
        updated_at: new Date().toISOString()
      })
    }
    snapshot('100 chapter summaries (no content)')

    // 计算序列化体积
    const fullSize = JSON.stringify(fullChapters).length
    const summarySize = JSON.stringify(summaryChapters).length
    console.log(`[SIZE] full chapters:   ${(fullSize / 1024).toFixed(1)}KB`)
    console.log(`[SIZE] summary chapters: ${(summarySize / 1024).toFixed(1)}KB`)
    console.log(`[SIZE] reduction:       ${((1 - summarySize / fullSize) * 100).toFixed(1)}%`)

    fullChapters.length = 0
    summaryChapters.length = 0
    snapshot('after cleanup')
    if (global.gc) global.gc()
    snapshot('after manual GC')
    expect(summarySize).toBeLessThan(fullSize)
  })
})
