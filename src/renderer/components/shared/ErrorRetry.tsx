import React from 'react'

interface ErrorRetryProps {
  message?: string
  onRetry: () => void
  className?: string
}

export const ErrorRetry: React.FC<ErrorRetryProps> = ({ message = '加载失败，请重试', onRetry, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <span className="text-4xl">⚠️</span>
      <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
        style={{ background: 'var(--color-primary)' }}
      >
        重试
      </button>
    </div>
  )
}

export default ErrorRetry
