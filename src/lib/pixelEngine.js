/* Mini motor de pixel-art: dibuja formas con sombreado (luz arriba-izquierda),
   contorno automático y lo convierte a PNG nítido (sin suavizado). */
export const OUTLINE = '#1a1030'

export function canvas(w, h) {
  return { w, h, g: Array.from({ length: h }, () => new Array(w).fill(null)) }
}

export function px(c, x, y, col) {
  x = Math.floor(x)
  y = Math.floor(y)
  if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.g[y][x] = col
}

export function pxs(c, list, col) {
  for (const [x, y] of list) px(c, x, y, col)
}

/** l en [-1,1]; positivo = lado iluminado. tones = [luz, base, sombra, sombra profunda] */
function pick(tones, l) {
  const n = tones.length
  if (n === 1) return tones[0]
  if (l > 0.45) return tones[0]
  if (l > -0.2) return tones[1]
  if (l > -0.6 || n < 4) return tones[Math.min(2, n - 1)]
  return tones[3]
}

export function ellipse(c, cx, cy, rx, ry, tones) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx
      const ny = (y + 0.5 - cy) / ry
      if (nx * nx + ny * ny <= 1) px(c, x, y, pick(tones, -(nx * 0.55 + ny * 0.83)))
    }
  }
}

function inside(pts, x, y) {
  let ins = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins
  }
  return ins
}

export function poly(c, pts, tones, k = 1) {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const R = Math.max(x1 - x0, y1 - y0) / 2 || 1
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      if (inside(pts, x + 0.5, y + 0.5)) px(c, x, y, pick(tones, -(((x + 0.5 - cx) * 0.55 + (y + 0.5 - cy) * 0.83) / R) * k))
    }
  }
}

/** mode 'v' = degradado vertical (arriba claro), 'h' = horizontal (izquierda claro) */
export function rect(c, x, y, w, h, tones, mode = 'v') {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const t = mode === 'v' ? (j + 0.5) / h : (i + 0.5) / w
      px(c, x + i, y + j, pick(tones, 1 - 2 * t))
    }
  }
}

export function line(c, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1)
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    px(c, x0, y0, col)
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
}

export function outline(c, col = OUTLINE) {
  const add = []
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (c.g[y][x]) continue
      if (
        (y > 0 && c.g[y - 1][x]) || (y < c.h - 1 && c.g[y + 1][x]) ||
        (x > 0 && c.g[y][x - 1]) || (x < c.w - 1 && c.g[y][x + 1])
      ) add.push([x, y])
    }
  }
  for (const [x, y] of add) c.g[y][x] = col
}

export function toCanvas(c) {
  const cv = document.createElement('canvas')
  cv.width = c.w
  cv.height = c.h
  const ctx = cv.getContext('2d')
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const col = c.g[y][x]
      if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1) }
    }
  }
  return cv
}

export function toURI(c) {
  return toCanvas(c).toDataURL('image/png')
}
