// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import {
  colorForAct,
  generateEmotionalCurvePath,
  PlotTimeline
} from '../../../../src/renderer/components/studio/PlotTimeline'
import type { PlotBeat } from '../../../../src/shared/types'

const sampleBeats: PlotBeat[] = [
  {
    id: '1',
    name: 'opening',
    description: 'Opening scene',
    sortOrder: 1,
    chapterIds: ['c1'],
    emotionalIntensity: 3,
    status: 'drafted'
  },
  {
    id: '2',
    name: 'inciting_incident',
    description: 'Inciting incident',
    sortOrder: 2,
    chapterIds: ['c2'],
    emotionalIntensity: 6,
    status: 'drafted'
  },
  {
    id: '3',
    name: 'first_plot_point',
    description: 'First plot point',
    sortOrder: 3,
    chapterIds: ['c3'],
    emotionalIntensity: 7,
    status: 'planned'
  },
  {
    id: '4',
    name: 'midpoint',
    description: 'Midpoint twist',
    sortOrder: 4,
    chapterIds: ['c4'],
    emotionalIntensity: 8,
    status: 'planned'
  },
  {
    id: '5',
    name: 'dark_moment',
    description: 'Darkest moment',
    sortOrder: 5,
    chapterIds: ['c5'],
    emotionalIntensity: 9,
    status: 'planned'
  },
  {
    id: '6',
    name: 'climax',
    description: 'Final confrontation',
    sortOrder: 6,
    chapterIds: ['c6'],
    emotionalIntensity: 10,
    status: 'planned'
  }
]

describe('PlotTimeline', () => {
  it('should render timeline with beat cards', () => {
    const { container } = render(<PlotTimeline beats={sampleBeats} />)
    // SVG should render
    expect(container.querySelector('svg')).toBeDefined()
    // Beat count text should appear
    expect(container.textContent).toContain('6')
    expect(container.textContent).toContain('个节拍')
    // Beat names should appear in the cards
    expect(container.textContent).toContain('opening')
    expect(container.textContent).toContain('climax')
  })

  it('should show beat count in subtitle', () => {
    const { container } = render(<PlotTimeline beats={sampleBeats} />)
    const subtitle = container.querySelector('p')
    expect(subtitle?.textContent).toMatch(/6/)
  })

  it('should render emotional intensity SVG curve', () => {
    const { container } = render(<PlotTimeline beats={sampleBeats} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeDefined()
    if (!svg) throw new Error('svg not found')
    expect(svg.innerHTML).toContain('path')
  })

  it('should expand beat card on click', () => {
    const { container } = render(<PlotTimeline beats={sampleBeats} />)
    // Find beat cards (the grid children)
    const cards = container.querySelectorAll('.grid > div')
    expect(cards.length).toBe(6)
    // Click second beat
    fireEvent.click(cards[1])
    // After expansion, description should appear
    expect(container.textContent).toContain('Inciting')
  })

  it('should display empty state for no beats', () => {
    const { container } = render(<PlotTimeline beats={[]} />)
    expect(container.textContent).toContain('暂无节拍')
  })
})

describe('emotional curve path generation', () => {
  it('should generate SVG path string', () => {
    const path = generateEmotionalCurvePath(sampleBeats, 400, 100)
    expect(path).toContain('M')
    expect(path).toContain('L')
  })

  it('should start at first beat intensity', () => {
    const path = generateEmotionalCurvePath(sampleBeats, 400, 100)
    expect(path).toMatch(/^M\s*\d+\.?\d*\s+\d+\.?\d*/)
  })

  it('should have correct number of line segments', () => {
    const path = generateEmotionalCurvePath(sampleBeats, 400, 100)
    const segments = path.split('L').length
    expect(segments).toBe(sampleBeats.length)
  })

  it('should handle single beat', () => {
    const path = generateEmotionalCurvePath([sampleBeats[0]], 400, 100)
    expect(path).toContain('M')
    expect(path).not.toContain('L')
  })
})

describe('color mapping', () => {
  it('should return colors for known acts', () => {
    expect(colorForAct('setup')).toBe('var(--amber-500)')
    expect(colorForAct('confrontation')).toBe('var(--accent)')
    expect(colorForAct('resolution')).toBe('var(--success)')
  })

  it('should return default color for unknown act', () => {
    expect(colorForAct('unknown')).toBe('var(--text-secondary)')
  })
})
