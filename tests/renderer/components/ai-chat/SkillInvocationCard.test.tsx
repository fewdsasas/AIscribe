import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SkillInvocationCard } from '../../../../src/renderer/components/ai-chat/SkillInvocationCard'
import type { SkillInvocation } from '../../../../src/renderer/store'

const makeInvocation = (overrides: Partial<SkillInvocation> = {}): SkillInvocation => ({
  skillName: 'outline',
  input: 'Create an outline',
  output: 'Chapter 1: Introduction',
  duration: 2.5,
  status: 'completed',
  ...overrides
})

describe('SkillInvocationCard', () => {
  it('should render completed invocation with duration', () => {
    render(<SkillInvocationCard invocation={makeInvocation({ status: 'completed', duration: 3.2 })} />)
    expect(screen.getByText('outline')).toBeInTheDocument()
    expect(screen.getByText(/完成.*3\.2s/)).toBeInTheDocument()
  })

  it('should render running invocation', () => {
    render(<SkillInvocationCard invocation={makeInvocation({ status: 'running' })} />)
    expect(screen.getByText('执行中...')).toBeInTheDocument()
  })

  it('should render error invocation', () => {
    render(<SkillInvocationCard invocation={makeInvocation({ status: 'error' })} />)
    expect(screen.getByText('失败')).toBeInTheDocument()
  })

  it('should toggle expanded state on header click', () => {
    render(<SkillInvocationCard invocation={makeInvocation({ status: 'completed' })} />)
    expect(screen.queryByText('输入')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('展开 ▼'))
    expect(screen.getByText('输入')).toBeInTheDocument()
    expect(screen.getByText('Create an outline')).toBeInTheDocument()
    expect(screen.getByText('输出')).toBeInTheDocument()
    expect(screen.getByText('Chapter 1: Introduction')).toBeInTheDocument()
    fireEvent.click(screen.getByText('收起 ▲'))
    expect(screen.queryByText('输入')).not.toBeInTheDocument()
  })
})
