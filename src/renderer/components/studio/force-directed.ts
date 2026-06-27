export interface ForceNode {
  id: string
  label: string
  x?: number
  y?: number
  vx?: number
  vy?: number
  fixed?: boolean
  radius?: number
  color?: string
  data?: Record<string, unknown>
}

export interface ForceEdge {
  source: string
  target: string
  label?: string
  weight?: number
  color?: string
}

export class ForceDirectedLayout {
  width: number
  height: number
  private nodes: ForceNode[] = []
  private edges: ForceEdge[] = []
  private nodeMap = new Map<string, number>()

  // Force constants
  private readonly REPULSION_STRENGTH = 3000
  private readonly ATTRACTION_STRENGTH = 0.01
  private readonly CENTER_STRENGTH = 0.02
  private readonly DAMPING = 0.9
  private readonly MIN_DISTANCE = 30

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  init(nodes: ForceNode[], edges: ForceEdge[]): void {
    this.nodes = nodes.map(n => ({
      ...n,
      x: n.x ?? Math.random() * this.width,
      y: n.y ?? Math.random() * this.height,
      vx: n.vx ?? 0,
      vy: n.vy ?? 0,
      radius: n.radius ?? this.calculateRadius(edges.filter(e => e.source === n.id || e.target === n.id).length)
    }))

    this.edges = edges
    this.nodeMap.clear()
    this.nodes.forEach((n, i) => this.nodeMap.set(n.id, i))
  }

  getNodes(): ForceNode[] {
    return this.nodes
  }

  getEdges(): ForceEdge[] {
    return this.edges
  }

  tick(iterations: number = 1): void {
    for (let iter = 0; iter < iterations; iter++) {
      this.applyRepulsiveForces()
      this.applyAttractiveForces()
      this.applyCenterForce()
      this.applyDamping()
    }
  }

  private applyRepulsiveForces(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i]
        const b = this.nodes[j]

        const dx = (a.x ?? 0) - (b.x ?? 0)
        const dy = (a.y ?? 0) - (b.y ?? 0)
        let dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < this.MIN_DISTANCE) dist = this.MIN_DISTANCE

        const force = this.REPULSION_STRENGTH / (dist * dist)

        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        if (!a.fixed) {
          a.vx = (a.vx ?? 0) + fx
          a.vy = (a.vy ?? 0) + fy
        }
        if (!b.fixed) {
          b.vx = (b.vx ?? 0) - fx
          b.vy = (b.vy ?? 0) - fy
        }
      }
    }
  }

  private applyAttractiveForces(): void {
    for (const edge of this.edges) {
      const sourceIdx = this.nodeMap.get(edge.source)
      const targetIdx = this.nodeMap.get(edge.target)

      if (sourceIdx === undefined || targetIdx === undefined) continue

      const source = this.nodes[sourceIdx]
      const target = this.nodes[targetIdx]

      const dx = (target.x ?? 0) - (source.x ?? 0)
      const dy = (target.y ?? 0) - (source.y ?? 0)
      const dist = Math.sqrt(dx * dx + dy * dy) || 1

      const weight = edge.weight ?? 1
      const force = this.ATTRACTION_STRENGTH * weight * dist

      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      if (!source.fixed) {
        source.vx = (source.vx ?? 0) + fx
        source.vy = (source.vy ?? 0) + fy
      }
      if (!target.fixed) {
        target.vx = (target.vx ?? 0) - fx
        target.vy = (target.vy ?? 0) - fy
      }
    }
  }

  private applyCenterForce(): void {
    const cx = this.width / 2
    const cy = this.height / 2

    for (const node of this.nodes) {
      if (node.fixed) continue

      const dx = cx - (node.x ?? 0)
      const dy = cy - (node.y ?? 0)

      node.vx = (node.vx ?? 0) + dx * this.CENTER_STRENGTH
      node.vy = (node.vy ?? 0) + dy * this.CENTER_STRENGTH
    }
  }

  private applyDamping(): void {
    for (const node of this.nodes) {
      if (node.fixed) continue

      node.vx = (node.vx ?? 0) * this.DAMPING
      node.vy = (node.vy ?? 0) * this.DAMPING

      node.x = (node.x ?? 0) + (node.vx ?? 0)
      node.y = (node.y ?? 0) + (node.vy ?? 0)

      // Keep within bounds
      const r = node.radius ?? 20
      node.x = Math.max(r, Math.min(this.width - r, node.x))
      node.y = Math.max(r, Math.min(this.height - r, node.y))
    }
  }

  calculateRadius(connectionCount: number): number {
    return Math.max(20, 20 + connectionCount * 3)
  }
}
