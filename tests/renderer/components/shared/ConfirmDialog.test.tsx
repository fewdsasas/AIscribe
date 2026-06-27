import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialog } from '../../../../src/renderer/components/shared/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('should not render when closed', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="Test Title" message="Test message" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render when open', () => {
    render(
      <ConfirmDialog open={true} title="Test Title" message="Test message" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('should call onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog open={true} title="Test" message="Message" onConfirm={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('取消'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('should call onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open={true} title="Test" message="Message" onConfirm={onConfirm} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByText('确认'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('should call onCancel when backdrop clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog open={true} title="Test" message="Message" onConfirm={vi.fn()} onCancel={onCancel} />)

    // Click on the backdrop (the outer div with role="dialog")
    fireEvent.click(screen.getByRole('dialog'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('should use custom labels', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Test"
        message="Message"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('should handle Escape key', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog open={true} title="Test" message="Message" onConfirm={vi.fn()} onCancel={onCancel} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })
})
