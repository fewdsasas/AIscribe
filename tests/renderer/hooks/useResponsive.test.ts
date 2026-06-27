import { describe, expect, it } from 'vitest'
import { classifyBreakpoint } from '@renderer/hooks/useResponsive'

describe('classifyBreakpoint', () => {
  it('should classify mobile width (< 768)', () => {
    const result = classifyBreakpoint(500)
    expect(result.isMobile).toBe(true)
    expect(result.isTablet).toBe(false)
    expect(result.isDesktop).toBe(false)
    expect(result.isSmall).toBe(true)
    expect(result.isLarge).toBe(false)
  })

  it('should classify tablet width (768-1023)', () => {
    const result = classifyBreakpoint(900)
    expect(result.isMobile).toBe(false)
    expect(result.isTablet).toBe(true)
    expect(result.isDesktop).toBe(false)
    expect(result.isLarge).toBe(false)
  })

  it('should classify desktop width (>= 1024)', () => {
    const result = classifyBreakpoint(1200)
    expect(result.isMobile).toBe(false)
    expect(result.isTablet).toBe(false)
    expect(result.isDesktop).toBe(true)
    expect(result.isLarge).toBe(false)
  })

  it('should classify large width (>= 1280)', () => {
    const result = classifyBreakpoint(1400)
    expect(result.isDesktop).toBe(true)
    expect(result.isLarge).toBe(true)
  })

  it('should classify small width (< 640)', () => {
    const result = classifyBreakpoint(300)
    expect(result.isSmall).toBe(true)
    expect(result.isMobile).toBe(true)
  })

  it('should handle exact boundary values', () => {
    expect(classifyBreakpoint(640).isSmall).toBe(false)
    expect(classifyBreakpoint(639).isSmall).toBe(true)
    expect(classifyBreakpoint(768).isMobile).toBe(false)
    expect(classifyBreakpoint(767).isMobile).toBe(true)
    expect(classifyBreakpoint(1024).isDesktop).toBe(true)
    expect(classifyBreakpoint(1023).isDesktop).toBe(false)
    expect(classifyBreakpoint(1280).isLarge).toBe(true)
    expect(classifyBreakpoint(1279).isLarge).toBe(false)
  })
})
