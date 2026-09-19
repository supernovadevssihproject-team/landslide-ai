"use client"

import { useEffect, useRef } from "react"

type Drop = {
  x: number
  y: number
  len: number
  speed: number
  thickness: number
  alpha: number
}

/**
 * Light-to-moderate rainfall rendered on a canvas.
 * Fine, transparent streaks with a slight wind-driven angle so the
 * mountains stay clearly visible behind them.
 */
export function RainLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let drops: Drop[] = []
    let raf = 0

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // gentle wind angle (drops fall slightly to the left/right)
    const windX = 1.1

    const buildDrops = () => {
      // density scales with the visible area but stays elegant
      const count = Math.round((width * height) / 5200)
      drops = Array.from({ length: count }, () => makeDrop(true))
    }

    function makeDrop(randomY: boolean): Drop {
      const depth = Math.random() // 0 = far, 1 = near
      return {
        x: Math.random() * (width + 200) - 100,
        y: randomY ? Math.random() * height : -20,
        len: 10 + depth * 26,
        speed: 6 + depth * 12,
        thickness: 0.5 + depth * 1.1,
        alpha: 0.08 + depth * 0.22,
      }
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildDrops()
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = "round"
      for (const d of drops) {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(200, 220, 255, ${d.alpha})`
        ctx.lineWidth = d.thickness
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - windX * (d.len / d.speed) * 2.2, d.y + d.len)
        ctx.stroke()

        d.y += d.speed
        d.x -= windX

        if (d.y - d.len > height) {
          Object.assign(d, makeDrop(false))
          d.x = Math.random() * (width + 200) - 100
        }
      }
      raf = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener("resize", resize)
    if (!reduced) {
      raf = requestAnimationFrame(render)
    } else {
      render() // draw a single static frame
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
