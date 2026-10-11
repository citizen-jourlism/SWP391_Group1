import { useEffect, useState } from 'react'

const secondsUntil = (timestamp) => Math.max(0, Math.ceil(((timestamp ?? 0) - Date.now()) / 1000))

/** Đếm ngược tới một mốc thời gian (milliseconds). Trả về số giây còn lại, cập nhật mỗi giây. */
export function useCountdown(targetTimestamp) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (secondsUntil(targetTimestamp) === 0) return undefined
    const timer = setInterval(() => {
      setTick((tick) => tick + 1) // chỉ để vẽ lại giao diện mỗi giây
      if (secondsUntil(targetTimestamp) === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [targetTimestamp])

  return secondsUntil(targetTimestamp)
}

/** 125 -> "02:05" */
export const formatSeconds = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
