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
  const [isVideoSampling, setIsVideoSampling] = useState<boolean>(false)
  const [isAudioSampling, setIsAudioSampling] = useState<boolean>(false)
  const [readings, setReadings] = useState<number[]>([])
  const [videoResult, setVideoResult] = useState<number | undefined>(undefined)
  const [audioResult, setAudioResult] = useState<number | undefined>(undefined)
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false)
  const lastEmittedRef = useRef<number | undefined>(undefined)
  const readingsRef = useRef<number[]>([])

  const handleKeyDown = (event: { key: string; timeStamp: number }) => {
    const lastEmitted = lastEmittedRef.current
    if (lastEmitted === undefined) return

    if (
      !(isVideoSampling && event.key === "F13") &&
      !(isAudioSampling && event.key === "F14")
    )
      return

    lastEmittedRef.current = undefined
    const next = [...readingsRef.current, event.timeStamp - lastEmitted]
    readingsRef.current = next
    setReadings(next)
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
    if (isVideoSampling) return

    lastEmittedRef.current = undefined
    readingsRef.current = []
    setReadings([])
    setVideoResult(undefined)
    setIsVideoSampling(true)

    try {
      for (let i = 0; i < warmUps + sampleSize; i++) {
        const flashTimestamp = showFlash()

        if (i > warmUps - 1) lastEmittedRef.current = flashTimestamp

        await delayWithJitter()
      }

      var readings = readingsRef.current
      const sum = readings.reduce((acc, val) => acc + val, 0)
      const result = Math.round(sum / readings.length)
      setVideoResult(result)
    } catch (err) {
      alert(`Failed to run test: ${err}`)
    }

    setIsVideoSampling(false)
  }, [isVideoSampling])

  const startAudioTest = useCallback(async () => {
    if (isAudioSampling) return

    lastEmittedRef.current = undefined
    readingsRef.current = []
    setReadings([])
    setAudioResult(undefined)
    setIsAudioSampling(true)

    try {
      for (let i = 0; i < warmUps + sampleSize; i++) {
        const beepTimestamp = playBeep()

        if (i > warmUps - 1) lastEmittedRef.current = beepTimestamp

        await delayWithJitter()
      }

      var readings = readingsRef.current
      const sum = readings.reduce((acc, val) => acc + val, 0)
      const result = Math.round(sum / readings.length)
      setAudioResult(result)
    } catch (err) {
      alert(`Failed to run test: ${err}`)
    }

    setIsAudioSampling(false)
  }, [isAudioSampling])

  async function startTest() {
    setVideoResult(undefined)
    setAudioResult(undefined)

    await startVideoTest()
    await startAudioTest()
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVideoSampling, isAudioSampling])

  return (
    <>
      <div className="flex min-h-svh p-6">
        <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
          <div>
            <Button
              className="mt-2"
              onClick={startTest}
              disabled={isVideoSampling || isAudioSampling}
            >
              Start
            </Button>
          </div>
          {isVideoSampling ||
            (isAudioSampling && (
              <Progress value={readings.length} max={sampleSize} />
            ))}
          {videoResult && <div>Video Result: {videoResult}</div>}
          {audioResult && <div>Audio Result: {audioResult}</div>}
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
