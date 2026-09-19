import React from "react"
import { RainLayer } from "./rain-layer"
import { NetworkLayer } from "./network-layer"
import { LightningLayer } from "./lightning-layer"

/**
 * Builds a seamless, tileable cloud texture from SVG fractal noise.
 * `light` produces bright sunlit clouds, otherwise dark storm masses.
 */
function cloudTile(light: boolean, freq: string, seed: number, size = 800) {
  const rgb = light ? 1 : 0.05
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
    <filter id='c'>
      <feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='4' seed='${seed}' stitchTiles='stitch' result='n'/>
      <feColorMatrix in='n' type='matrix' values='0 0 0 0 ${rgb} 0 0 0 0 ${rgb} 0 0 0 0 ${rgb} 0 0 0 1.5 -0.5'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#c)'/>
  </svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const SKY_MASK =
  "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.35) 56%, rgba(0,0,0,0) 66%)"

const VALLEY_MASK =
  "linear-gradient(to bottom, rgba(0,0,0,0) 38%, rgba(0,0,0,0.85) 58%, rgba(0,0,0,0.9) 80%, rgba(0,0,0,0) 96%)"

export const CinematicScene = React.memo(function CinematicScene() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black pointer-events-none">
      {/* Ambient blurred fill — shown in portrait, behind the fully-fitted scene */}
      <div
        aria-hidden="true"
        className="scene-ambient absolute inset-0"
        style={{
          backgroundImage: "url(/landscape.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(40px) brightness(1) saturate(1.1)",
          transform: "scale(1.3)",
        }}
      />

      {/* 16:9 stage — covers the viewport in landscape, fully fitted in portrait */}
      <div className="scene-stage absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {/* Slow cinematic camera push — moves the whole environment together */}
        <div
          className="cine-animated absolute inset-0 will-change-transform"
          style={{
            animation: "camera-push 46s ease-in-out infinite",
            transformOrigin: "58% 55%",
          }}
        >
          {/* Base reference image */}
          <img
            src="/landscape.png"
            alt="Cinematic mountain valley at dusk with a winding river, a glowing blue terrain-monitoring network across the left ridges, and a red-orange landslide-risk zone on the right, beneath dramatic storm clouds"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />

          {/* Dark storm cloud mass — slow layer */}
          <div
            className="cine-animated absolute inset-0"
            style={{
              backgroundImage: cloudTile(false, "0.010 0.016", 11),
              backgroundSize: "800px 800px",
              backgroundRepeat: "repeat",
              WebkitMaskImage: SKY_MASK,
              maskImage: SKY_MASK,
              mixBlendMode: "multiply",
              opacity: 0.55,
              animation: "cloud-drift-a 90s linear infinite",
            }}
          />
          {/* Dark storm cloud mass — faster, reshaping layer for depth */}
          <div
            className="cine-animated absolute inset-0"
            style={{
              backgroundImage: cloudTile(false, "0.016 0.024", 42),
              backgroundSize: "800px 800px",
              backgroundRepeat: "repeat",
              WebkitMaskImage: SKY_MASK,
              maskImage: SKY_MASK,
              mixBlendMode: "multiply",
              // @ts-expect-error custom props consumed by keyframes
              "--cloud-min": 0.28,
              "--cloud-max": 0.5,
              animation: "cloud-drift-b 58s linear infinite, cloud-swell 20s ease-in-out infinite",
            }}
          />
          {/* Bright sunlit clouds drifting near the sun break */}
          <div
            className="cine-animated absolute inset-0"
            style={{
              backgroundImage: cloudTile(true, "0.013 0.02", 7),
              backgroundSize: "800px 800px",
              backgroundRepeat: "repeat",
              WebkitMaskImage:
                "radial-gradient(60% 45% at 72% 22%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 70%)",
              maskImage:
                "radial-gradient(60% 45% at 72% 22%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 70%)",
              mixBlendMode: "screen",
              opacity: 0.5,
              animation: "cloud-drift-c 72s linear infinite",
            }}
          />

          {/* Warm sunlight breaking through the clouds */}
          <div
            className="cine-animated absolute inset-0"
            style={{
              background:
                "radial-gradient(38% 32% at 72% 21%, rgba(255,180,90,0.55) 0%, rgba(255,150,70,0.25) 35%, rgba(255,120,50,0) 70%)",
              mixBlendMode: "screen",
              animation: "sun-flicker 14s ease-in-out infinite",
            }}
          />

          {/* Soft valley fog drifting between the mountains */}
          <div
            className="cine-animated absolute inset-0"
            style={{
              backgroundImage: cloudTile(true, "0.006 0.012", 23),
              backgroundSize: "1100px 1100px",
              backgroundRepeat: "repeat",
              WebkitMaskImage: VALLEY_MASK,
              maskImage: VALLEY_MASK,
              mixBlendMode: "screen",
              animation: "fog-drift 120s linear infinite, fog-breathe 26s ease-in-out infinite",
            }}
          />

          {/* Blue terrain-monitoring network pulses + traveling particles */}
          <NetworkLayer />

          {/* River flowing downstream */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1600 900"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            style={{ mixBlendMode: "screen" }}
          >
            <path
              d="M 985 515 C 1035 548 1002 590 1058 614 C 1120 640 1150 668 1214 702 C 1290 742 1330 772 1402 806 C 1470 838 1502 852 1548 872"
              fill="none"
              stroke="rgba(150,205,255,0.18)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <path
              className="cine-animated"
              d="M 985 515 C 1035 548 1002 590 1058 614 C 1120 640 1150 668 1214 702 C 1290 742 1330 772 1402 806 C 1470 838 1502 852 1548 872"
              fill="none"
              stroke="rgba(210,240,255,0.7)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="14 30"
              style={{ animation: "river-flow 3.2s linear infinite" }}
            />
          </svg>

          {/* Red / orange landslide-risk zone active glow */}
          <div
            className="cine-animated absolute inset-0"
            style={{
              background:
                "radial-gradient(18% 20% at 76% 42%, rgba(255,90,30,0.55) 0%, rgba(255,60,20,0.22) 45%, rgba(255,50,20,0) 75%)",
              mixBlendMode: "screen",
              animation: "risk-pulse 5.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Rainfall — kept crisp across the full frame */}
        <RainLayer />

        {/* Thunderstorm lightning — random flashes and forked bolts */}
        <LightningLayer />

        {/* Cinematic grade + vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
          }}
        />
      </div>
    </div>
  )
})

CinematicScene.displayName = "CinematicScene"
