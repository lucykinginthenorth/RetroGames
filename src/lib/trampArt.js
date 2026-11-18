import { canvas, ellipse, line, outline, poly, px, pxs, rect, toCanvas, toURI } from './pixelEngine.js'

/** Unidad de píxel de la escena (px CSS por píxel de arte). */
export const U = 3
/** Escala del gato (px CSS por píxel del sprite). */
export const CU = 2.2

/* ============================ Gato aventurero ============================ */
const OR = ['#ffd08a', '#ff9f1c', '#d9680f', '#a8480a']
const BL = ['#8bbcff', '#3b7ddd', '#2352a8', '#183a7a']

export function head(c, cx, cy) {
  poly(c, [[cx - 5.6, cy - 1], [cx - 5.2, cy - 6.4], [cx - 1.4, cy - 3.8]], OR)
  poly(c, [[cx + 5.6, cy - 1], [cx + 5.2, cy - 6.4], [cx + 1.4, cy - 3.8]], OR)
  pxs(c, [[cx - 4, cy - 4], [cx - 4, cy - 3]], '#ff9ec4')
  pxs(c, [[cx + 3, cy - 4], [cx + 3, cy - 3]], '#ff9ec4')
  ellipse(c, cx, cy, 6.2, 5, OR)
  ellipse(c, cx, cy + 2.6, 3.2, 2.1, ['#ffffff', '#fff0d6', '#f0d0a0'])
  // casco azul con visera
  ellipse(c, cx, cy - 3, 6, 3.4, BL)
  rect(c, cx - 6, cy - 1, 12, 1, ['#183a7a'])
  pxs(c, [[cx, cy - 5], [cx - 1, cy - 5], [cx, cy - 6]], '#ffffff')
  // ojos grandes con brillo
  for (const ex of [cx - 4, cx + 2]) {
    pxs(c, [[ex, cy], [ex + 1, cy], [ex, cy + 1], [ex + 1, cy + 1], [ex, cy + 2], [ex + 1, cy + 2]], '#ffffff')
  }
  pxs(c, [[cx - 3, cy + 1], [cx - 3, cy + 2], [cx + 2, cy + 1], [cx + 2, cy + 2]], '#1a1030')
  pxs(c, [[cx - 1, cy + 3], [cx, cy + 3]], '#ff7a9a')
  pxs(c, [[cx - 1, cy + 5], [cx, cy + 5]], '#5a2a1a')
}

function limb(c, x0, y0, x1, y1) {
  line(c, x0 + 1, y0, x1 + 1, y1, OR[2])
  line(c, x0, y0, x1, y1, OR[1])
  line(c, x0, y0 - 1, x1, y1 - 1, OR[0])
}

function catFrame(pose) {
  const c = canvas(22, 28)
  const P = {
    A: { l: [2, 10], r: [20, 12], fl: [6, 25], fr: [16, 23] },
    B: { l: [2, 16], r: [20, 8], fl: [9, 25], fr: [14, 25] },
    C: { l: [3, 7], r: [19, 7], fl: [9, 25], fr: [13, 25] },
  }[pose]
  const sh = { l: [8, 16], r: [14, 16] }
  const hip = { l: [9, 20], r: [13, 20] }
  limb(c, hip.l[0], hip.l[1], P.fl[0], P.fl[1])
  limb(c, hip.r[0], hip.r[1], P.fr[0], P.fr[1])
  limb(c, sh.l[0], sh.l[1], P.l[0], P.l[1])
  limb(c, sh.r[0], sh.r[1], P.r[0], P.r[1])
  // torso azul (chaleco) con cremallera
  ellipse(c, 11, 18, 4.2, 4, BL)
  rect(c, 10, 15, 1, 6, ['#dbe9ff'])
  ellipse(c, 11, 20.6, 3, 1.2, ['#d9680f'])
  head(c, 11, 8)
  // guantes y botas
  for (const h of [P.l, P.r]) { ellipse(c, h[0], h[1], 1.6, 1.6, ['#ffffff', '#e8eef8']) }
  for (const f of [P.fl, P.fr]) { rect(c, f[0] - 1, f[1], 4, 2, BL) }
  outline(c)
  pxs(c, [[3, 7], [2, 8], [19, 7], [20, 8]], '#ffe9c8')
  return toCanvas(c)
}

let cat
export function getCatSprites() {
  if (!cat) cat = { A: catFrame('A'), B: catFrame('B'), C: catFrame('C') }
  return cat
}

function headIcon() {
  const c = canvas(15, 14)
  head(c, 7, 7)
  outline(c)
  return c
}
export const HEAD_URI = toURI(headIcon())

/* ============================ Escena nocturna ============================ */
function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16))
const SKY = ['#06122f', '#0a1f4a', '#0f3563', '#175072', '#22707e']
export const FLOOR_H = 28 // separación entre pisos de la torre (unidades)

export function towerUnits(viewW) {
  return Math.max(15, Math.min(24, Math.round((viewW * 0.17) / U)))
}

/** spawn: { L:[fracciones], R:[fracciones] } alturas de las puertas de salida. */
export function buildScene(Wp, Hp, TWu, spawn) {
  const cv = document.createElement('canvas')
  cv.width = Wp
  cv.height = Hp
  const g = cv.getContext('2d')
  const P = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1) }
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h) }
  const rnd = rng(7)

  // Cielo con tramado (dithering)
  const horizon = Math.round(Hp * 0.68)
  for (let y = 0; y < Hp; y++) {
    const f = Math.min(1, y / horizon)
    const t = f * (SKY.length - 1)
    const i = Math.floor(t)
    for (let x = 0; x < Wp; x++) {
      const idx = i + (i < SKY.length - 1 && t - i > BAYER[y & 3][x & 3] ? 1 : 0)
      P(x, y, SKY[Math.min(idx, SKY.length - 1)])
    }
  }

  // Edificios (dos capas) con ventanas
  const city = (base, hMin, hMax, body, lit) => {
    let x = -2
    while (x < Wp) {
      const w = 7 + Math.floor(rnd() * 8)
      const h = Math.round((hMin + rnd() * (hMax - hMin)) * Hp)
      const top = Hp - 6 - h
      R(x, top, w, h + 6, body)
      R(x, top, w, 1, '#ffffff22')
      for (let wy = top + 3; wy < Hp - 10; wy += 5) {
        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
          if (rnd() < 0.5) R(wx, wy, 2, 2, lit[Math.floor(rnd() * lit.length)])
          else R(wx, wy, 2, 2, '#0b1950')
        }
      }
      x += w + (rnd() < 0.3 ? 2 : 0)
    }
  }
  city(0, 0.16, 0.34, '#10246b', ['#7fb8ff', '#5a8ee0'])
  city(0, 0.07, 0.22, '#1a37a0', ['#ffe9a0', '#9be7ff', '#ffb27a'])
  R(0, Hp - 6, Wp, 6, '#0a1230')

  // Torres de vigas rojas
  const FL = FLOOR_H
  const BEAM = ['#ff8a78', '#e5322d', '#8f1515']
  const tower = (x0, innerIsRight) => {
    R(x0 + 3, 0, TWu - 6, Hp, '#2b0b1d')
    // diagonales de refuerzo
    for (let fy = 0; fy < Hp; fy += FL) {
      const span = TWu - 7
      for (let t = 0; t <= span; t++) {
        const y1 = fy + 3 + Math.round((t * (FL - 4)) / span)
        const y2 = fy + FL - 1 - Math.round((t * (FL - 4)) / span)
        R(x0 + 3 + t, y1, 1, 2, '#6e1722')
        R(x0 + 3 + t, y2, 1, 1, '#4f1220')
      }
    }
    // escalera interior
    const mid = x0 + Math.floor(TWu / 2)
    R(mid - 3, 0, 1, Hp, '#b6bdca')
    R(mid + 3, 0, 1, Hp, '#8d95a6')
    for (let y = 1; y < Hp; y += 3) R(mid - 2, y, 5, 1, '#9aa2b3')
    // vigas horizontales (pisos)
    for (let fy = 0; fy < Hp; fy += FL) {
      for (let j = 0; j < 3; j++) R(x0, fy + j, TWu, 1, BEAM[j])
      for (let x = x0 + 4; x < x0 + TWu - 3; x += 7) P(x, fy + 1, '#ffd0c8')
    }
    // columnas verticales
    for (const cx of [x0, x0 + TWu - 3]) {
      for (let j = 0; j < 3; j++) R(cx + j, 0, 1, Hp, BEAM[j])
      for (let y = 4; y < Hp; y += 7) P(cx + 1, y, '#ffd0c8')
    }
    // puertas de salida de los gatos (en la columna interior)
    const innerX = innerIsRight ? x0 : x0 + TWu - 3
    const levels = spawn[innerIsRight ? 'R' : 'L']
    for (const fr of levels) {
      const sy = Math.round(fr * Hp) - 5
      R(innerX, sy, 3, 10, '#120510')
      R(innerX, sy - 1, 3, 1, '#7dff9a')
      R(innerX, sy + 10, 3, 1, '#c9ced6')
    }
    // sombra sobre el campo de juego
    R(innerIsRight ? x0 - 1 : x0 + TWu, 0, 1, Hp, '#00000066')
  }
  tower(0, false)
  tower(Wp - TWu, true)
  return cv
}

/* ============================ Red elástica ============================ */
export const NET_H = 14
export function buildNet(NWu, cooling) {
  const pal = cooling
    ? { base: '#7f8fb5', ring: '#5c6c94', light: '#a9b8da', star: '#d7deee', stripe: '#5c6c94' }
    : { base: '#ff7a59', ring: '#ff4a2e', light: '#ffa98a', star: '#ffd60a', stripe: '#ff7a59' }
  const rim = '#17102a'
  const c = canvas(NWu, NET_H)
  const cx = NWu / 2
  // frente (cara negra con franjas)
  for (let y = 0; y < NET_H; y++) {
    for (let x = 0; x < NWu; x++) {
      const nx = (x + 0.5 - cx) / (cx - 0.5)
      const ny = (y + 0.5 - 9) / 5
      if (nx * nx + ny * ny <= 1) px(c, x, y, x % 6 < 2 ? pal.stripe : rim)
    }
  }
  // superficie de lona con anillos
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < NWu; x++) {
      const nx = (x + 0.5 - cx) / (cx - 0.5)
      const ny = (y + 0.5 - 5) / 5
      const e = nx * nx + ny * ny
      if (e > 1) continue
      if (e > 0.8) px(c, x, y, rim)
      else px(c, x, y, Math.floor(e / 0.2) % 2 ? pal.ring : (y < 4 && x < cx ? pal.light : pal.base))
    }
  }
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? 3.6 : 1.5
    pts.push([cx + Math.cos(a) * r * 1.5, 5 + Math.sin(a) * r * 0.95])
  }
  poly(c, pts, [pal.star], 1)
  return toCanvas(c)
}
