// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CharacterNetwork } from '@renderer/components/studio/CharacterNetwork'

let resizeCallback: ((entries: Array<{ contentRect: { width: number; height: number } }>) => void) | null = null

class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  constructor(callback: (entries: Array<{ contentRect: { width: number; height: number } }>) => void) {
    resizeCallback = callback
  }
}

vi.stubGlobal('ResizeObserver', MockResizeObserver)

describe('CharacterNetwork', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render empty state when no characters', () => {
    render(<CharacterNetwork characters={[]} />)
    expect(screen.getByText('暂无角色')).toBeInTheDocument()
  })

  it('should render network with characters and relationships', () => {
    const characters = [
      {
        id: 'c1',
        name: '主角',
        role: 'protagonist',
        relationships: [{ targetId: 'c2', type: 'friend', intensity: 8 }]
      },
      {
        id: 'c2',
        name: '反派',
        role: 'antagonist',
        relationships: [{ targetId: 'c1', type: 'enemy', intensity: 9 }]
      }
    ] as any

    render(<CharacterNetwork characters={characters} />)
    expect(screen.getByText('角色关系网络')).toBeInTheDocument()
    expect(screen.getByText('2 个角色 · 1 条关系')).toBeInTheDocument()
  })

  it('should handle unknown role fallback color', () => {
    const characters = [
      {
        id: 'c1',
        name: '神秘人',
        role: 'unknown_role',
        relationships: []
      }
    ] as any

    render(<CharacterNetwork characters={characters} />)
    expect(screen.getByText('角色关系网络')).toBeInTheDocument()
  })

  it('should highlight node on hover', () => {
    const characters = [
      {
        id: 'c1',
        name: '主角',
        role: 'protagonist',
        relationships: []
      }
    ] as any

    render(<CharacterNetwork characters={characters} />)
    const node = screen.getByText('主角').closest('g')
    expect(node).toBeDefined()
    if (!node) throw new Error('node not found')

    fireEvent.mouseEnter(node)
    fireEvent.mouseLeave(node)
  })

  it('should update dimensions on resize', () => {
    const characters = [
      {
        id: 'c1',
        name: '主角',
        role: 'protagonist',
        relationships: []
      }
    ] as any

    render(<CharacterNetwork characters={characters} />)
    expect(resizeCallback).toBeDefined()
    if (!resizeCallback) throw new Error('resize callback not set')

    resizeCallback([{ contentRect: { width: 800, height: 600 } }])
  })

  it('should ignore zero-size resize entries', () => {
    const characters = [
      {
        id: 'c1',
        name: '主角',
        role: 'protagonist',
        relationships: []
      }
    ] as any

    render(<CharacterNetwork characters={characters} />)
    expect(resizeCallback).toBeDefined()
    if (!resizeCallback) throw new Error('resize callback not set')

    resizeCallback([{ contentRect: { width: 0, height: 0 } }])
  })
})
