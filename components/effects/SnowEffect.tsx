'use client'

import { useEffect, useRef } from 'react'

export function SnowEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: {
      x: number; y: number; r: number; d: number; opacity: number; speed: number
    }[] = []

    const count = 80
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.5 + 0.5,
        d: Math.random() * count,
        opacity: Math.random() * 0.6 + 0.1,
        speed: Math.random() * 0.4 + 0.1,
      })
    }

    let angle = 0
    let raf: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(220, 240, 255, 0.8)'
      ctx.beginPath()

      for (const p of particles) {
        ctx.globalAlpha = p.opacity
        ctx.moveTo(p.x, p.y)
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      }

      ctx.fill()
      ctx.globalAlpha = 1
      update()
      raf = requestAnimationFrame(draw)
    }

    const update = () => {
      angle += 0.008
      for (const p of particles) {
        p.y += p.speed + Math.cos(angle + p.d) * 0.3
        p.x += Math.sin(angle) * 0.2

        if (p.y > canvas.height) {
          p.y = -p.r * 2
          p.x = Math.random() * canvas.width
        }
        if (p.x > canvas.width + 10) p.x = -10
        if (p.x < -10) p.x = canvas.width + 10
      }
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="snow-canvas"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.5 }}
    />
  )
}
