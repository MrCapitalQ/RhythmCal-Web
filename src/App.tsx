import { Button } from "@/components/ui/button"
import { useCallback, useEffect, useRef, useState } from "react"

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
    // if (event.key !== "s") return

    lastEmittedRef.current = undefined
    setReadings((prev) => [...prev, event.timeStamp - lastEmitted])
  }

  const playBeep = () => {
    const oscillator = audioContext.createOscillator()
    oscillator.frequency.value = 1000
    // oscillator.type = "square";
    oscillator.connect(audioContext.destination)

    const startAudioTime = audioContext.currentTime

    oscillator.start(startAudioTime)
    oscillator.stop(startAudioTime + 0.1)
  }

  const startAudioTest = useCallback(async () => {
    if (isSampling) return

    lastEmittedRef.current = undefined
    setReadings([])
    setResult(undefined)
    setIsSampling(true)

    for (let i = 0; i < sampleSize; i++) {
      playBeep()
      lastEmittedRef.current = performance.now()

      if (i < sampleSize - 1)
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    setIsSampling(false)
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (readings.length === 0 || isSampling) return

    const sum = readings.reduce((acc, val) => acc + val, 0)
    setResult(sum / readings.length)
  }, [isSampling])

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2" onClick={startAudioTest}>
            Button
          </Button>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
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
