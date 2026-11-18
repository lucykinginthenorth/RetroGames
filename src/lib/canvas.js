/** Ajusta un canvas al tamaño de su contenedor (con soporte de pantallas retina). */
export function setupCanvas(canvas, wrap, onResize) {
  const ctx = canvas.getContext('2d')
  const view = { w: 1, h: 1, dpr: 1, ctx }
  const resize = () => {
    const r = wrap.getBoundingClientRect()
    view.dpr = Math.min(window.devicePixelRatio || 1, 2)
    view.w = Math.max(1, r.width)
    view.h = Math.max(1, r.height)
    canvas.width = Math.round(view.w * view.dpr)
    canvas.height = Math.round(view.h * view.dpr)
    canvas.style.width = view.w + 'px'
    canvas.style.height = view.h + 'px'
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0)
    onResize?.(view)
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(wrap)
  view.destroy = () => ro.disconnect()
  return view
}

/** Bucle de animación con delta de tiempo limitado (evita saltos al volver de otra pestaña). */
export function startLoop(fn) {
  let raf
  let last = performance.now()
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    fn(dt)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

export function localPoint(canvas, e) {
  const r = canvas.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

export const rand = (a, b) => a + Math.random() * (b - a)
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/** Partículas simples compartidas por los juegos de canvas. */
export function burst(list, x, y, colors, n = 14, speed = 220) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const s = speed * (0.3 + Math.random() * 0.7)
    list.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.4, 0.9),
      max: 0.9,
      size: rand(3, 6),
      color: colors[i % colors.length],
    })
  }
}

export function updateParticles(list, dt, gravity = 500) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]
    p.life -= dt
    if (p.life <= 0) { list.splice(i, 1); continue }
    p.vy += gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
}

export function drawParticles(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max)
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
  }
  ctx.globalAlpha = 1
}

/** Textos flotantes "+1". */
export function drawFloaters(ctx, list, dt) {
  ctx.textAlign = 'center'
  ctx.font = '12px "Silkscreen", monospace'
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i]
    f.t += dt
    if (f.t > 0.9) { list.splice(i, 1); continue }
    ctx.globalAlpha = 1 - f.t / 0.9
    ctx.fillStyle = '#1b0b3a'
    ctx.fillText(f.text, f.x + 2, f.y - f.t * 50 + 2)
    ctx.fillStyle = f.color || '#ffd60a'
    ctx.fillText(f.text, f.x, f.y - f.t * 50)
  }
  ctx.globalAlpha = 1
}
