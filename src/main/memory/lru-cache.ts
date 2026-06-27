/**
 * LRU (Least Recently Used) 缓存
 * 用于 Repository 层缓存查询结果，减少 sql.js 查询开销
 * 内存风险：缓存条目持有对象引用，max 限制防止无限增长
 */
export class LRUCache<K, V> {
  private map: Map<K, V>
  private readonly max: number
  private readonly ttl: number
  private readonly timestamps: Map<K, number>

  constructor(max = 100, ttl = 60_000) {
    this.map = new Map()
    this.timestamps = new Map()
    this.max = max
    this.ttl = ttl
  }

  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (value === undefined) return undefined
    // 检查 TTL
    const ts = this.timestamps.get(key)
    if (ts === undefined || Date.now() - ts > this.ttl) {
      this.map.delete(key)
      this.timestamps.delete(key)
      return undefined
    }
    // LRU: 移到末尾（Map 保持插入顺序，最近访问的移到末尾）
    this.map.delete(key)
    this.map.set(key, value)
    this.timestamps.set(key, Date.now())
    return value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key)
      this.timestamps.delete(key)
    } else if (this.map.size >= this.max) {
      // 淘汰最老的条目
      const oldestKey = this.map.keys().next().value
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey)
        this.timestamps.delete(oldestKey)
      }
    }
    this.map.set(key, value)
    this.timestamps.set(key, Date.now())
  }

  delete(key: K): void {
    this.map.delete(key)
    this.timestamps.delete(key)
  }

  clear(): void {
    this.map.clear()
    this.timestamps.clear()
  }

  get size(): number {
    return this.map.size
  }
}
