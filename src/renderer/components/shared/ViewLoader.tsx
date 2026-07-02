import React, { Suspense } from 'react'

interface ViewLoaderProps {
  children: React.ReactNode
  viewName?: string
}

export const ViewLoader: React.FC<ViewLoaderProps> = ({ children, viewName }) => (
  <Suspense
    fallback={
      <div className="h-full flex items-center justify-center" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">⏳</div>
          <p className="text-sm">{viewName ? `正在加载 ${viewName}...` : '加载中...'}</p>
        </div>
      </div>
    }
  >
    {children}
  </Suspense>
)
