import { Button } from "@/components/ui/button"
import { useCallback, useEffect, useRef, useState } from "react"

const warmUps = 2
const sampleSize = 10
const audioContext = new window.AudioContext()

export function App() {
  const [isSampling, setIsSampling] = useState<boolean>(false)
  const [readings, setReadings] = useState<number[]>([])
  const [result, setResult] = useState<number | undefined>(undefined)
  const lastEmittedRef = useRef<number | undefined>(undefined)

  const handleKeyDown = (event: { key: string; timeStamp: number }) => {
    const lastEmitted = lastEmittedRef.current
    if (lastEmitted === undefined) return

    if (event.key !== "F14") return

    lastEmittedRef.current = undefined
    setReadings((prev) => [...prev, event.timeStamp - lastEmitted])
  }

  const playBeep = (): number => {
    const oscillator = audioContext.createOscillator()
    oscillator.frequency.value = 1000
    oscillator.connect(audioContext.destination)

    const startAudioTime = audioContext.currentTime

    oscillator.start(startAudioTime + 0.2)
    oscillator.stop(startAudioTime + 0.3)

    return performance.now() + 200
  }

  const startAudioTest = useCallback(async () => {
    if (isSampling) return

    lastEmittedRef.current = undefined
    setReadings([])
    setResult(undefined)
    setIsSampling(true)

    for (let i = 0; i < warmUps + sampleSize; i++) {
      const beepTimestamp = playBeep()

      if (i > warmUps - 1) lastEmittedRef.current = beepTimestamp

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    setIsSampling(false)
  }, [isSampling])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (readings.length === 0 || isSampling) return

    const sum = readings.reduce((acc, val) => acc + val, 0)
    setResult(Math.round(sum / readings.length))
  }, [isSampling])

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <Button className="mt-2" onClick={startAudioTest}>
            Test Audio Latency
          </Button>
        </div>
        {result && <div>Result: {result}</div>}
        <div>
          <ul>
            {readings.map((reading, index) => (
              <li key={index}>{reading}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
