import React, { useEffect, useRef } from "react"

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
export const RainLayer = React.memo(function RainLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let drops: Drop[] = []
    let raf = 0
    let isVisible = true
    let isIntersecting = true

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const windX = 1.1

    function resetDrop(d: Drop, randomY: boolean) {
      const depth = Math.random()
      d.x = Math.random() * (width + 200) - 100
      d.y = randomY ? Math.random() * height : -20
      d.len = 10 + depth * 26
      d.speed = 6 + depth * 12
      d.thickness = 0.5 + depth * 1.1
      d.alpha = 0.08 + depth * 0.22
    }

    function createDrop(randomY: boolean): Drop {
      const d = { x: 0, y: 0, len: 0, speed: 0, thickness: 0, alpha: 0 }
      resetDrop(d, randomY)
      return d
    }

    const buildDrops = () => {
      const count = Math.min(Math.round((width * height) / 5400), 200)
      drops = Array.from({ length: count }, () => createDrop(true))
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildDrops()
    }

    const render = () => {
      if (!isVisible || !isIntersecting) {
        raf = 0
        return
      }

      ctx.clearRect(0, 0, width, height)
      ctx.lineCap = "round"
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        ctx.beginPath()
        ctx.strokeStyle = `rgba(200, 220, 255, ${d.alpha})`
        ctx.lineWidth = d.thickness
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - windX * (d.len / d.speed) * 2.2, d.y + d.len)
        ctx.stroke()

        d.y += d.speed
        d.x -= windX

        if (d.y - d.len > height) {
          resetDrop(d, false)
        }
      }
      raf = requestAnimationFrame(render)
    }

    const startAnimation = () => {
      if (!raf && !reduced && isVisible && isIntersecting) {
        raf = requestAnimationFrame(render)
      }
    }

    const stopAnimation = () => {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const handleVisibilityChange = () => {
      isVisible = !document.hidden
      if (isVisible) {
        startAnimation()
      } else {
        stopAnimation()
      }
    }

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          isIntersecting = entries[0]?.isIntersecting ?? true
          if (isIntersecting) {
            startAnimation()
          } else {
            stopAnimation()
          }
        },
        { threshold: 0.05 }
      )
      observer.observe(canvas)
    }

    resize()
    window.addEventListener("resize", resize)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    if (!reduced) {
      startAnimation()
    } else {
      render()
      stopAnimation()
    }

    return () => {
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (observer) observer.disconnect()
      stopAnimation()
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
})

RainLayer.displayName = "RainLayer"
