import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('main logger', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('should output log/info only in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { logger } = await import('../../../src/main/utils/logger')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    logger.log('dev log')
    logger.info('dev info')
    expect(logSpy).toHaveBeenCalledWith('dev log')
    expect(infoSpy).toHaveBeenCalledWith('dev info')
  })

  it('should suppress log/info in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('../../../src/main/utils/logger')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    logger.log('prod log')
    logger.info('prod info')
    expect(logSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it('should always output warn/error', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('../../../src/main/utils/logger')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.warn('warn msg')
    logger.error('error msg')
    expect(warnSpy).toHaveBeenCalledWith('warn msg')
    expect(errorSpy).toHaveBeenCalledWith('error msg')
  })
})
