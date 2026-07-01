import React, { useEffect, useRef, useState } from 'react'

interface StreamingTextProps {
  text: string
  messageId: string
  speed?: number
  onComplete?: () => void
}

export const StreamingText: React.FC<StreamingTextProps> = ({ text, messageId, speed = 30, onComplete }) => {
  const clampedSpeed = Math.max(1, speed)
  const [displayedLength, setDisplayedLength] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCompleteRef = useRef(onComplete)
  const prevMessageIdRef = useRef(messageId)
  const displayedLengthRef = useRef(0)

  onCompleteRef.current = onComplete
  displayedLengthRef.current = displayedLength

  useEffect(() => {
    if (messageId !== prevMessageIdRef.current) {
      prevMessageIdRef.current = messageId
      setDisplayedLength(0)
      displayedLengthRef.current = 0
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [messageId])

  const clearAllTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(() => {
    clearAllTimers()

    if (displayedLengthRef.current >= text.length) return

    intervalRef.current = setInterval(() => {
      setDisplayedLength(prev => {
        const next = prev + 1
        if (next >= text.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          timeoutRef.current = setTimeout(() => {
            onCompleteRef.current?.()
          }, 0)
        }
        return next
      })
    }, clampedSpeed)

    return () => {
      clearAllTimers()
    }
  }, [text, speed])

  const displayed = text.slice(0, displayedLength)

  return (
    <span className="streaming-text">
      {displayed}
      {displayedLength < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-[--color-primary] ml-0.5 animate-pulse" />
      )}
    </span>
  )
}
