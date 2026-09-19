import React, { useEffect, useMemo, useRef, useState } from "react"

type Strike = {
  id: number
  /** horizontal origin of the bolt, in viewBox units (0-1600) */
  x: number
  /** jagged bolt path */
  path: string
  /** how strongly this strike lights the sky */
  intensity: number
  /** tint of the flash toward the bolt's side */
  glowX: number
}

/** Builds a jagged, forking lightning bolt starting near the cloud base. */
function makeBolt(x: number) {
  const segments = 7 + Math.floor(Math.random() * 4)
  let px = x
  let py = 40 + Math.random() * 40
  let d = `M ${px.toFixed(0)} ${py.toFixed(0)}`
  const step = (360 - py) / segments
  const branches: string[] = []

  for (let i = 0; i < segments; i++) {
    px += (Math.random() - 0.5) * 90
    py += step * (0.7 + Math.random() * 0.6)
    d += ` L ${px.toFixed(0)} ${py.toFixed(0)}`

    // occasional fork
    if (Math.random() < 0.35 && i > 1) {
      let bx = px
      let by = py
      let b = `M ${bx.toFixed(0)} ${by.toFixed(0)}`
      const bs = 2 + Math.floor(Math.random() * 2)
      for (let j = 0; j < bs; j++) {
        bx += (Math.random() - 0.3) * 70
        by += step * (0.5 + Math.random() * 0.5)
        b += ` L ${bx.toFixed(0)} ${by.toFixed(0)}`
      }
      branches.push(b)
    }
  }
  return [d, ...branches]
}

export const LightningLayer = React.memo(function LightningLayer() {
  const [strike, setStrike] = useState<Strike | null>(null)
  const idRef = useRef(0)

  const reduced = useMemo(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  useEffect(() => {
    if (reduced) return
    let timeout: ReturnType<typeof setTimeout>

    const schedule = () => {
      if (document.hidden) return
      const delay = 3200 + Math.random() * 5500
      timeout = setTimeout(() => {
        if (document.hidden) return
        const x = 200 + Math.random() * 1200
        idRef.current += 1
        setStrike({
          id: idRef.current,
          x,
          path: "",
          intensity: 0.4 + Math.random() * 0.6,
          glowX: (x / 1600) * 100,
        })
        schedule()
      }, delay)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timeout)
      } else {
        schedule()
      }
    }

    schedule()
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [reduced])

  if (!strike) return null

  const bolts = makeBolt(strike.x)
  // Only draw a visible bolt for the stronger strikes; weaker ones are
  // distant sky-glow rumbles.
  const showBolt = strike.intensity > 0.62

  return (
    <div
      key={strike.id}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Full-sky flash, biased toward the strike's side */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(90% 75% at ${strike.glowX}% 0%, rgba(214,230,255,${(
            0.55 * strike.intensity
          ).toFixed(3)}) 0%, rgba(170,200,255,${(0.28 * strike.intensity).toFixed(
            3,
          )}) 30%, rgba(120,160,255,0) 62%)`,
          mixBlendMode: "screen",
          animation: "lightning-flash 1.1s ease-out forwards",
        }}
      />

      {showBolt && (
        <svg
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMin slice"
          className="absolute inset-0 h-full w-full"
          style={{
            mixBlendMode: "screen",
            animation: "lightning-bolt 1.1s ease-out forwards",
          }}
        >
          <defs>
            <filter id="boltGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#boltGlow)">
            {bolts.map((d, i) => (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(150,190,255,0.85)"
                  strokeWidth={i === 0 ? 6 : 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(245,250,255,1)"
                  strokeWidth={i === 0 ? 2.4 : 1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}
          </g>
        </svg>
      )}
    </div>
  )
})

LightningLayer.displayName = "LightningLayer"
