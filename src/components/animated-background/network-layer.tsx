"use client"

import { useEffect, useRef } from "react"

// Coordinates are authored in the image's native 1600 x 900 space and
// scaled to the rendered stage, so pulses sit on top of the existing
// glowing terrain network in the reference image.
const BASE_W = 1600
const BASE_H = 900

// Approximate polylines following the blue network ridges on the left,
// plus the lower-center blue strands, of the reference image.
const PATHS: [number, number][][] = [
  [
    [40, 250],
    [170, 330],
    [300, 420],
    [430, 465],
    [470, 560],
    [430, 690],
  ],
  [
    [0, 470],
    [150, 455],
    [300, 520],
    [365, 600],
    [300, 665],
  ],
  [
    [120, 610],
    [260, 690],
    [430, 700],
  ],
  [
    [1230, 470],
    [1330, 515],
    [1430, 470],
    [1540, 520],
  ],
]

// Bright monitoring nodes that softly pulse.
const NODES: [number, number][] = [
  [300, 420],
  [430, 465],
  [470, 690],
  [300, 520],
  [170, 330],
  [430, 700],
  [1330, 515],
]

type Particle = { path: number; t: number; speed: number }

export function NetworkLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let sx = 1
    let sy = 1
    let raf = 0
    let start = performance.now()

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // several light particles traveling along each path
    const particles: Particle[] = []
    PATHS.forEach((_, i) => {
      const n = 3
      for (let k = 0; k < n; k++) {
        particles.push({
          path: i,
          t: k / n,
          speed: 0.04 + Math.random() * 0.05,
        })
      }
    })

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sx = width / BASE_W
      sy = height / BASE_H
    }

    // position along a polyline given t in [0,1]
    const pointOnPath = (path: [number, number][], t: number) => {
      const segCount = path.length - 1
      const scaled = t * segCount
      const idx = Math.min(Math.floor(scaled), segCount - 1)
      const localT = scaled - idx
      const [ax, ay] = path[idx]
      const [bx, by] = path[idx + 1]
      return [ax + (bx - ax) * localT, ay + (by - ay) * localT] as const
    }

    const render = (now: number) => {
      const elapsed = (now - start) / 1000
      ctx.clearRect(0, 0, width, height)

      // faint flowing lines beneath the pulses
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      for (const path of PATHS) {
        ctx.beginPath()
        ctx.moveTo(path[0][0] * sx, path[0][1] * sy)
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i][0] * sx, path[i][1] * sy)
        }
        ctx.strokeStyle = "rgba(70, 190, 255, 0.12)"
        ctx.lineWidth = 1.4
        ctx.stroke()
      }

      // traveling light particles
      for (const p of particles) {
        p.t += p.speed * 0.016
        if (p.t > 1) p.t -= 1
        const path = PATHS[p.path]
        const [px, py] = pointOnPath(path, p.t)
        const x = px * sx
        const y = py * sy
        const r = 7
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, "rgba(180, 240, 255, 0.9)")
        g.addColorStop(0.4, "rgba(60, 190, 255, 0.5)")
        g.addColorStop(1, "rgba(60, 190, 255, 0)")
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // pulsing nodes
      NODES.forEach(([nx, ny], i) => {
        const phase = elapsed * 1.6 + i * 0.9
        const pulse = (Math.sin(phase) + 1) / 2 // 0..1
        const x = nx * sx
        const y = ny * sy
        const r = 5 + pulse * 9
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, `rgba(200, 245, 255, ${0.5 + pulse * 0.45})`)
        g.addColorStop(0.35, `rgba(60, 200, 255, ${0.35 + pulse * 0.35})`)
        g.addColorStop(1, "rgba(40, 170, 255, 0)")
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()

        // bright core
        ctx.fillStyle = `rgba(220, 250, 255, ${0.6 + pulse * 0.4})`
        ctx.beginPath()
        ctx.arc(x, y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      })

      raf = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener("resize", resize)
    if (!reduced) {
      start = performance.now()
      raf = requestAnimationFrame(render)
    } else {
      render(performance.now())
      cancelAnimationFrame(raf)
    }

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ mixBlendMode: "screen" }}
    />
  )
}
