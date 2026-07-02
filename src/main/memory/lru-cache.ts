export interface LRUCacheOptions<V> {
  max?: number
  ttl?: number
  sizeOf?: (value: V) => number
  maxSize?: number
}

/**
 * LRU (Least Recently Used) 缓存
 * 用于 Repository 层缓存查询结果，减少 sql.js 查询开销
 * 内存风险：缓存条目持有对象引用，max 与 maxSize 限制防止无限增长
 */
export class LRUCache<K, V> {
  private map: Map<K, V>
  private readonly max: number
  private readonly ttl: number
  private readonly timestamps: Map<K, number>
  private readonly sizeOf: (value: V) => number
  private readonly maxSize: number
  private _currentSize = 0

  constructor(max = 100, ttlOrOptions: number | LRUCacheOptions<V> = 60_000) {
    const options: LRUCacheOptions<V> = typeof ttlOrOptions === 'number' ? { ttl: ttlOrOptions } : ttlOrOptions
    this.map = new Map()
    this.timestamps = new Map()
    this.max = options.max ?? max
    this.ttl = options.ttl ?? (typeof ttlOrOptions === 'number' ? ttlOrOptions : 60_000)
    this.sizeOf = options.sizeOf ?? (() => 1)
    this.maxSize = options.maxSize ?? Number.MAX_SAFE_INTEGER
  }

  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (value === undefined) return undefined
    // 检查 TTL
    const ts = this.timestamps.get(key)
    if (ts === undefined || Date.now() - ts > this.ttl) {
      this.removeEntry(key, value)
      return undefined
    }
    // LRU: 移到末尾（Map 保持插入顺序，最近访问的移到末尾）
    this.map.delete(key)
    this.map.set(key, value)
    this.timestamps.set(key, Date.now())
    return value
  }

  set(key: K, value: V): void {
    if (this.max <= 0 || this.maxSize <= 0) return
    const existingValue = this.map.get(key)
    if (existingValue !== undefined) {
      this.removeEntry(key, existingValue)
    }
    // 按条目数上限淘汰
    while (this.map.size >= this.max) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey === undefined) break
      const oldestValue = this.map.get(oldestKey)
      if (oldestValue === undefined) break
      this.removeEntry(oldestKey, oldestValue)
    }
    // 按内存上限淘汰
    const entrySize = this.sizeOf(value)
    while (this.map.size > 0 && this._currentSize + entrySize > this.maxSize) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey === undefined) break
      const oldestValue = this.map.get(oldestKey)
      if (oldestValue === undefined) break
      this.removeEntry(oldestKey, oldestValue)
    }
    this.map.set(key, value)
    this.timestamps.set(key, Date.now())
    this._currentSize += entrySize
  }

  delete(key: K): void {
    const value = this.map.get(key)
    if (value !== undefined) {
      this.removeEntry(key, value)
    }
  }

  clear(): void {
    this.map.clear()
    this.timestamps.clear()
    this._currentSize = 0
  }

  get size(): number {
    return this.map.size
  }

  get currentSize(): number {
    return this._currentSize
  }

  private removeEntry(key: K, value: V): void {
    this.map.delete(key)
    this.timestamps.delete(key)
    this._currentSize = Math.max(0, this._currentSize - this.sizeOf(value))
  }
}
