import React, { useEffect, useRef, useState } from 'react'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** 占位符颜色 */
  placeholderColor?: string
  /** 图片加载完成后的回调 */
  onLoad?: () => void
  /** 图片加载失败后的回调 */
  onError?: () => void
}

/**
 * 懒加载图片组件
 * 使用 Intersection Observer 在图片进入视口时才加载
 *
 * @example
 * <LazyImage src="cover.jpg" alt="封面" className="w-full h-48 object-cover" />
 */
export const LazyImage = React.memo<LazyImageProps>(
  ({ src, alt, placeholderColor = 'var(--ink-100)', onLoad, onError, style, className, ...rest }) => {
    const imgRef = useRef<HTMLImageElement>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        },
        { rootMargin: '100px' } // Preload when within 100px of viewport
      )

      if (imgRef.current) {
        observer.observe(imgRef.current)
      }

      return () => observer.disconnect()
    }, [])

    const handleLoad = () => {
      setIsLoaded(true)
      onLoad?.()
    }

    const handleError = () => {
      onError?.()
    }

    return (
      <div
        ref={imgRef}
        className={className}
        style={{
          ...style,
          backgroundColor: placeholderColor,
          opacity: isLoaded ? 1 : 0.5,
          transition: 'opacity 0.3s'
        }}
      >
        {isVisible && (
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={className}
            style={{
              ...style,
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s'
            }}
            {...rest}
          />
        )}
      </div>
    )
  }
)

LazyImage.displayName = 'LazyImage'
