// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SimpleReader } from '../../../../src/renderer/components/reader/SimpleReader'

describe('SimpleReader', () => {
  it('renders paragraph text', () => {
    render(
      <SimpleReader
        content={{
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello world' }] }]
        }}
      />
    )
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('renders headings with level', () => {
    render(
      <SimpleReader
        content={{
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
            { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Subtitle' }] }
          ]
        }}
      />
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title')
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Subtitle')
  })

  it('renders marks', () => {
    const { container } = render(
      <SimpleReader
        content={{
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'bold ', marks: [{ type: 'bold' }] },
                { type: 'text', text: 'italic', marks: [{ type: 'italic' }] }
              ]
            }
          ]
        }}
      />
    )
    expect(container.querySelector('strong')).toHaveTextContent('bold')
    expect(container.querySelector('em')).toHaveTextContent('italic')
  })

  it('renders lists', () => {
    render(
      <SimpleReader
        content={{
          type: 'doc',
          content: [
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item 1' }] }]
                }
              ]
            }
          ]
        }}
      />
    )
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('item 1')).toBeInTheDocument()
  })

  it('renders scene block with number', () => {
    render(
      <SimpleReader
        content={{
          type: 'doc',
          content: [
            {
              type: 'sceneBlock',
              attrs: { sceneNumber: 7 },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'scene content' }] }]
            }
          ]
        }}
      />
    )
    expect(screen.getByText('场景 7')).toBeInTheDocument()
    expect(screen.getByText('scene content')).toBeInTheDocument()
  })

  it('renders nothing for non-doc content', () => {
    const { container } = render(<SimpleReader content={{ type: 'paragraph' }} />)
    expect(container.querySelector('.prose')?.childNodes.length).toBe(0)
  })
})
