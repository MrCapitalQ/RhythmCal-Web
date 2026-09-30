import { Button } from "@/components/ui/button"
import { useCallback, useEffect, useRef, useState } from "react"
import { Progress } from "./components/ui/progress"

const samplingInterval = 1000
const samplingIntervalJitter = 50
const samplingDelayMs = 0
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

type TestingState =
  "Idle" | "VideoStarting" | "Video" | "AudioStarting" | "Audio"

export function App() {
  const [currentState, setCurrentState] = useState<TestingState>("Idle")
  const [videoReadings, setVideoReadings] = useState<number[]>([])
  const [audioReadings, setAudioReadings] = useState<number[]>([])
  const [videoResult, setVideoResult] = useState<number | undefined>(undefined)
  const [audioResult, setAudioResult] = useState<number | undefined>(undefined)
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false)
  const lastEmittedRef = useRef<number | undefined>(undefined)

  const handleKeyDown = (event: { key: string; timeStamp: number }) => {
    const lastEmitted = lastEmittedRef.current
    if (lastEmitted === undefined) return

    if (
      !(currentState === "Video" && event.key === "F13") &&
      !(currentState === "Audio" && event.key === "F14")
    )
      return

    lastEmittedRef.current = undefined
    const latency = event.timeStamp - lastEmitted

    if (currentState === "Video")
      setVideoReadings((current) => [...current, latency])
    else if (currentState === "Audio")
      setAudioReadings((current) => [...current, latency])
  }

  const showFlash = (): number => {
    const oscillator = audioContext.createOscillator()
    oscillator.frequency.value = 1000
    oscillator.connect(audioContext.destination)

    setTimeout(() => {
      setIsOverlayVisible(true)
    }, samplingDelayMs)

    setTimeout(() => {
      setIsOverlayVisible(false)
    }, samplingDelayMs + flashDurationMs)

    return performance.now() + samplingDelayMs
  }

  const playBeep = (): number => {
    const oscillator = audioContext.createOscillator()
    oscillator.frequency.value = 1000
    oscillator.connect(audioContext.destination)

    const startAudioTime = audioContext.currentTime + samplingDelayMs / 1000

    oscillator.start(startAudioTime)
    oscillator.stop(startAudioTime + beepDurationMs / 1000)

    return performance.now() + samplingDelayMs
  }

  const startVideoTest = useCallback(async () => {
    if (currentState === "Video" || currentState === "VideoStarting") return

    lastEmittedRef.current = undefined
    setVideoReadings([])
    setVideoResult(undefined)

    setCurrentState("VideoStarting")
    await new Promise((resolve) => setTimeout(resolve, 5000))

    setCurrentState("Video")

    try {
      for (let i = 0; i < warmUps + sampleSize; i++) {
        const flashTimestamp = showFlash()

        if (i > warmUps - 1) lastEmittedRef.current = flashTimestamp

        await delayWithJitter()
      }
    } catch (err) {
      alert(`Failed to run test: ${err}`)
    }

    setCurrentState("Idle")
  }, [currentState])

  const startAudioTest = useCallback(async () => {
    if (currentState === "Audio" || currentState === "AudioStarting") return

    lastEmittedRef.current = undefined
    setAudioReadings([])
    setAudioResult(undefined)

    setCurrentState("AudioStarting")
    await new Promise((resolve) => setTimeout(resolve, 5000))

    setCurrentState("Audio")

    try {
      for (let i = 0; i < warmUps + sampleSize; i++) {
        const beepTimestamp = playBeep()

        if (i > warmUps - 1) lastEmittedRef.current = beepTimestamp

        await delayWithJitter()
      }
    } catch (err) {
      alert(`Failed to run test: ${err}`)
    }

    setCurrentState("Idle")
  }, [currentState])

  async function startTest() {
    setVideoResult(undefined)
    setVideoReadings([])
    setAudioResult(undefined)
    setAudioReadings([])

    await startVideoTest()
    await startAudioTest()
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentState])

  useEffect(() => {
    if (videoReadings.length === 0) {
      setVideoResult(undefined)
      return
    }

    const sum = videoReadings.reduce((acc, val) => acc + val, 0)
    const result = Math.round(sum / videoReadings.length)
    setVideoResult(result)
  }, [videoReadings, videoReadings.length])

  useEffect(() => {
    if (audioReadings.length === 0) {
      setAudioResult(undefined)
      return
    }

    const sum = audioReadings.reduce((acc, val) => acc + val, 0)
    const result = Math.round(sum / audioReadings.length)
    setAudioResult(result)
  }, [audioReadings, audioReadings.length])

  return (
    <>
      <div className="mx-auto flex max-w-xl flex-col gap-4 p-6">
        <Button className="mt-2" onClick={startTest}>
          Start
        </Button>

        {currentState === "VideoStarting" && (
          <div>Video test is starting! Get ready!</div>
        )}
        {currentState === "Video" && (
          <Progress value={videoReadings.length} max={sampleSize} />
        )}
        {currentState === "AudioStarting" && (
          <div>Audio test is starting! Get ready!</div>
        )}
        {currentState === "Audio" && (
          <Progress value={audioReadings.length} max={sampleSize} />
        )}
        <div className="grid grid-cols-2 gap-x-2 gap-y-8">
          <div className="text-center">
            {currentState !== "Video" && videoResult && (
              <>
                <div className="text-xl">Video Latency</div>
                <div className="text-2xl">{videoResult}</div>
              </>
            )}
          </div>
          <div className="text-center">
            {currentState !== "Audio" && audioResult && (
              <>
                <div className="text-xl">Audio Latency</div>
                <div className="text-2xl">{audioResult}</div>
              </>
            )}
          </div>

          <div className="text-center">
            {videoReadings && videoReadings.length > 0 && (
              <div>
                Video readings
                <ul className="text-sm text-foreground/80">
                  {videoReadings.map((reading, index) => (
                    <li key={index}>{reading.toFixed(1)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="text-center">
            {audioReadings && audioReadings.length > 0 && (
              <div>
                Audio readings
                <ul className="text-sm text-foreground/80">
                  {audioReadings.map((reading, index) => (
                    <li key={index}>{reading.toFixed(1)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="absolute top-0 right-0 bottom-0 left-0 bg-white"
        style={{ display: isOverlayVisible ? "block" : "none" }}
      />
    </>
  )
}

export default App
