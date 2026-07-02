import React from 'react'
import { logger } from '@renderer/utils/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  resetKey: number
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, resetKey: 0 }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, resetKey: 0 }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('ErrorBoundary caught:', error.message, errorInfo.componentStack)
  }

  handleReset = () => {
    this.setState(prev => ({ hasError: false, error: undefined, resetKey: prev.resetKey + 1 }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center p-8" style={{ background: 'var(--color-bg)' }}>
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>
              应用出了点问题
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {this.state.error?.message ?? '发生了未知错误'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-[--color-primary] text-white rounded-lg text-sm font-medium"
              >
                重新加载
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border rounded-lg text-sm"
                style={{ borderColor: 'var(--color-border)' }}
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      )
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>
  }
}
