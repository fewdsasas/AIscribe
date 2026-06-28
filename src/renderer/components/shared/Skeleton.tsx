import React from 'react'

interface SkeletonProps {
  /** 宽度，默认 '100%' */
  width?: string
  /** 高度，默认 '16px' */
  height?: string
  /** 圆角类名，默认 'rounded' */
  rounded?: string
  /** 额外的类名 */
  className?: string
  /** 骨架屏行数，默认 1；大于 1 时自动用 space-y-2 堆叠 */
  count?: number
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  rounded = 'rounded',
  className = '',
  count = 1,
}) => {
  const items = Array.from({ length: count })

  return (
    <div className={count > 1 ? 'space-y-2' : ''} role="status" aria-label="加载中">
      {items.map((_, index) => (
        <div
          key={index}
          className={`animate-shimmer ${rounded} ${className}`.trim()}
          style={{ width, height }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export default Skeleton
