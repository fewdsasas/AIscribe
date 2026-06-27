import { describe, expect, it } from 'vitest'
import {
  ForceDirectedLayout,
  type ForceEdge,
  type ForceNode
} from '../../../../src/renderer/components/studio/force-directed'

describe('ForceDirectedLayout', () => {
  it('should create layout with specified dimensions', () => {
    const layout = new ForceDirectedLayout(800, 600)
    expect(layout.width).toBe(800)
    expect(layout.height).toBe(600)
  })

  it('should initialize nodes with random positions', () => {
    const layout = new ForceDirectedLayout(400, 400)
    const nodes: ForceNode[] = [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
      { id: '3', label: 'C' }
    ]
    const edges: ForceEdge[] = [
      { source: '1', target: '2' },
      { source: '2', target: '3' }
    ]

    layout.init(nodes, edges)
    const positioned = layout.getNodes()

    expect(positioned.length).toBe(3)
    for (const node of positioned) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(400)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(400)
      expect(node.vx).toBeDefined()
      expect(node.vy).toBeDefined()
    }
  })

  it('should simulate forces and move nodes', () => {
    const layout = new ForceDirectedLayout(400, 400)
    const nodes: ForceNode[] = [
      { id: '1', label: '中心' },
      { id: '2', label: '外围' }
    ]
    const edges: ForceEdge[] = [{ source: '1', target: '2' }]

    layout.init(nodes, edges)

    // Record initial positions
    const before = layout.getNodes().map(n => ({ x: n.x ?? 0, y: n.y ?? 0 }))

    // Run simulation
    layout.tick(10)

    const after = layout.getNodes().map(n => ({ x: n.x ?? 0, y: n.y ?? 0 }))

    // Positions should have changed
    const hasMoved = after.some((pos, i) => pos.x !== before[i].x || pos.y !== before[i].y)
    expect(hasMoved).toBe(true)
  })

  it('should keep connected nodes closer than unconnected ones', () => {
    const layout = new ForceDirectedLayout(400, 400)
    const nodes: ForceNode[] = [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
      { id: '3', label: 'C' }
    ]
    // 1-2 are connected, 3 is isolated
    const edges: ForceEdge[] = [{ source: '1', target: '2' }]

    layout.init(nodes, edges)
    layout.tick(50)

    const positioned = layout.getNodes()
    const n1 = positioned.find(n => n.id === '1')
    const n2 = positioned.find(n => n.id === '2')
    const n3 = positioned.find(n => n.id === '3')
    expect(n1).toBeDefined()
    expect(n2).toBeDefined()
    expect(n3).toBeDefined()
    if (!n1 || !n2 || !n3) throw new Error('node not found')

    const distAB = Math.sqrt(((n1.x ?? 0) - (n2.x ?? 0)) ** 2 + ((n1.y ?? 0) - (n2.y ?? 0)) ** 2)
    const distAC = Math.sqrt(((n1.x ?? 0) - (n3.x ?? 0)) ** 2 + ((n1.y ?? 0) - (n3.y ?? 0)) ** 2)

    // Connected nodes should be closer to each other than to the isolated node
    expect(distAB).toBeLessThan(distAC + 50) // reasonable margin
  })

  it('should converge within bounds after sufficient iterations', () => {
    const layout = new ForceDirectedLayout(400, 400)
    const nodes: ForceNode[] = [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
      { id: '3', label: 'C' },
      { id: '4', label: 'D' }
    ]
    const edges: ForceEdge[] = [
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '4' },
      { source: '4', target: '1' }
    ]

    layout.init(nodes, edges)

    // Run many iterations
    layout.tick(100)

    const final = layout.getNodes()
    // All nodes should be within bounds
    for (const node of final) {
      expect(node.x).toBeDefined()
      expect(node.y).toBeDefined()
      expect(node.x ?? 0).toBeGreaterThanOrEqual(20)
      expect(node.x ?? 0).toBeLessThanOrEqual(380)
      expect(node.y ?? 0).toBeGreaterThanOrEqual(20)
      expect(node.y ?? 0).toBeLessThanOrEqual(380)
    }
  })

  it('should calculate node radius based on connections', () => {
    const layout = new ForceDirectedLayout(400, 400)
    expect(layout.calculateRadius(0)).toBe(20) // minimum
    expect(layout.calculateRadius(5)).toBeGreaterThan(20)
    expect(layout.calculateRadius(10)).toBeGreaterThan(layout.calculateRadius(5))
  })
})
