import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MainLayout } from '../../../src/renderer/layouts/MainLayout'

vi.mock('../../../src/renderer/components/shared/Sidebar', () => ({
  Sidebar: ({ currentView }: { currentView: string }) => <div data-testid="sidebar">{currentView}</div>
}))

vi.mock('../../../src/renderer/components/shared/TopBar', () => ({
  TopBar: ({ projectName }: { projectName?: string }) => <div data-testid="topbar">{projectName ?? 'no-project'}</div>
}))

describe('MainLayout', () => {
  it('should render children and apply view max-width', () => {
    render(
      <MainLayout currentView="dashboard" onNavigate={vi.fn()} projectName="Test Project">
        <div data-testid="child">content</div>
      </MainLayout>
    )

    expect(screen.getByTestId('sidebar')).toHaveTextContent('dashboard')
    expect(screen.getByTestId('topbar')).toHaveTextContent('Test Project')
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should fallback to default max-width for unknown view', () => {
    const { container } = render(
      <MainLayout currentView="unknown" onNavigate={vi.fn()}>
        <div>content</div>
      </MainLayout>
    )

    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument()
  })
})
