import { Button } from "@/components/ui/button"
import { useCallback, useEffect, useRef, useState } from "react"
import { Progress } from "./components/ui/progress"

const samplingInterval = 1000
const samplingIntervalJitter = 50
const sampleDelayMs = 0
const warmUps = 2
const sampleSize = 15
const flashDurationMs = 100
const beepDurationMs = 100
const audioContext = new window.AudioContext()

function delayWithJitter(): Promise<void> {
  const jitterOffset =
    Math.floor(Math.random() * samplingIntervalJitter) -
    Math.floor(samplingIntervalJitter / 2)
  const delay = samplingInterval + jitterOffset
  return new Promise((resolve) => setTimeout(resolve, delay))
}

export function App() {
  const [isSampling, setIsSampling] = useState<boolean>(false)
  const [readings, setReadings] = useState<number[]>([])
  const [result, setResult] = useState<number | undefined>(undefined)
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false)
  const samplingtTypeRef = useRef<"audio" | "video" | undefined>(undefined)
  const lastEmittedRef = useRef<number | undefined>(undefined)

  const handleKeyDown = (event: { key: string; timeStamp: number }) => {
    const samplingType = samplingtTypeRef.current
    const lastEmitted = lastEmittedRef.current
    if (lastEmitted === undefined) return

    if (
      !samplingType ||
      (samplingType == "video" && event.key !== "F13") ||
      (samplingType == "audio" && event.key !== "F14")
    )
      return

    lastEmittedRef.current = undefined
    setReadings((prev) => [...prev, event.timeStamp - lastEmitted])
  }

  const showFlash = (): number => {
    const oscillator = audioContext.createOscillator()
    oscillator.frequency.value = 1000
    oscillator.connect(audioContext.destination)

    setTimeout(() => {
      setIsOverlayVisible(true)
    }, sampleDelayMs)

    setTimeout(() => {
      setIsOverlayVisible(false)
    }, sampleDelayMs + flashDurationMs)

    return performance.now() + sampleDelayMs
  }

  const playBeep = (): number => {
    const oscillator = audioContext.createOscillator()
    oscillator.frequency.value = 1000
    oscillator.connect(audioContext.destination)

    const startAudioTime = audioContext.currentTime + sampleDelayMs / 1000

    oscillator.start(startAudioTime)
    oscillator.stop(startAudioTime + beepDurationMs / 1000)

    return performance.now() + sampleDelayMs
  }

  const startVideoTest = useCallback(async () => {
    if (isSampling) return

    samplingtTypeRef.current = "video"
    lastEmittedRef.current = undefined
    setReadings([])
    setResult(undefined)
    setIsSampling(true)

    try {
      for (let i = 0; i < warmUps + sampleSize; i++) {
        const flashTimestamp = showFlash()

        if (i > warmUps - 1) lastEmittedRef.current = flashTimestamp

        await delayWithJitter()
      }
    } catch (err) {
      alert(`Failed to run test: ${err}`)
    }

    setIsSampling(false)
    samplingtTypeRef.current = undefined
  }, [isSampling])

  const startAudioTest = useCallback(async () => {
    if (isSampling) return

    samplingtTypeRef.current = "audio"
    lastEmittedRef.current = undefined
    setReadings([])
    setResult(undefined)
    setIsSampling(true)

    try {
      for (let i = 0; i < warmUps + sampleSize; i++) {
        const beepTimestamp = playBeep()

        if (i > warmUps - 1) lastEmittedRef.current = beepTimestamp

        await delayWithJitter()
      }
    } catch (err) {
      alert(`Failed to run test: ${err}`)
    }

    setIsSampling(false)
    samplingtTypeRef.current = undefined
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
    <>
      <div className="flex min-h-svh p-6">
        <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
          <div>
            <Button
              className="mt-2"
              onClick={startVideoTest}
              disabled={isSampling}
            >
              Test Video Latency
            </Button>
            <Button
              className="mt-2"
              onClick={startAudioTest}
              disabled={isSampling}
            >
              Test Audio Latency
            </Button>
          </div>
          {isSampling && <Progress value={readings.length} max={sampleSize} />}
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
      <div
        className="absolute top-0 right-0 bottom-0 left-0 bg-white"
        style={{ display: isOverlayVisible ? "block" : "none" }}
      ></div>
    </>
  )
}

export default App
