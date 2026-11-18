import { canvas, ellipse, outline, pxs, rect, toCanvas } from './pixelEngine.js'

/** Unidad de píxel del juego (px CSS por píxel de arte). */
export const U = 3

/* ---------- Sprites de bomba (16x18, centro del cuerpo en 8,10) ---------- */
function bomb(tones, shine, flash) {
  const c = canvas(16, 18)
  ellipse(c, 8, 10, 6.6, 6.6, tones)
  rect(c, 6, 1, 4, 2, ['#e3e6ee', '#9094a4'])
  pxs(c, [[4, 7], [5, 6], [6, 5]], shine)
  pxs(c, [[3, 9]], shine)
  // ojitos blancos verticales
  pxs(c, [[5, 8], [6, 8], [5, 9], [6, 9], [5, 10], [6, 10], [5, 11], [6, 11]], '#ffffff')
  pxs(c, [[9, 8], [10, 8], [9, 9], [10, 9], [9, 10], [10, 10], [9, 11], [10, 11]], '#ffffff')
  pxs(c, [[6, 10], [6, 11], [10, 10], [10, 11]], '#1a1030')
  outline(c)
  return toCanvas(c)
}

let sprites
export function getBombSprites() {
  if (!sprites) {
    sprites = {
      black: bomb(['#7d7da0', '#43435c', '#2b2b40', '#17171f'], '#ffffff', false),
      pink: bomb(['#ffc2de', '#ff5aa5', '#d62a7e', '#98155a'], '#fff0f7', false),
      flash: bomb(['#ffffff', '#fff0f0', '#ffc4c4', '#ff9a9a'], '#ffffff', true),
    }
  }
  return sprites
}

/* ---------- Fondo de la arena (metal + tapetes + compuertas) ---------- */
const HAZ_Y = '#f5c518'
const HAZ_K = '#17171c'
export const FR = 3 // grosor del marco de peligro (unidades)
export const GATE_H = 9
export const GATE_W = 34

export function zoneUnits(viewW) {
  return Math.round(Math.min(120, Math.max(78, viewW * 0.25)) / U)
}

export function buildArena(Wp, Hp, zwU) {
  const cv = document.createElement('canvas')
  cv.width = Wp
  cv.height = Hp
  const g = cv.getContext('2d')
  const P = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1) }
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h) }

  // Placas de metal antiderrapantes
  for (let y = 0; y < Hp; y++) {
    for (let x = 0; x < Wp; x++) {
      const odd = ((x >> 2) + (y >> 2)) & 1
      let col = odd ? '#a3a8af' : '#92989f'
      const lx = x & 3, ly = y & 3
      if (lx === 0 && ly === 0) col = odd ? '#cbcfd4' : '#b6bbc1'
      else if (lx === 3 && ly === 3) col = odd ? '#80868e' : '#757b83'
      if (x % 24 === 0 || y % 24 === 0) col = '#5f656d'
      else if (x % 24 === 1 || y % 24 === 1) col = '#c8cdd3'
      P(x, y, col)
    }
  }
  const screw = (x, y) => {
    R(x, y, 3, 3, '#8b9199')
    P(x, y, '#e6e9ed'); P(x + 2, y + 2, '#4b5057'); P(x + 1, y + 1, '#3c4147')
  }
  for (let gy = 0; gy < Hp; gy += 24) {
    for (let gx = 0; gx < Wp; gx += 24) {
      screw(gx + 3, gy + 3); screw(gx + 19, gy + 3); screw(gx + 3, gy + 19); screw(gx + 19, gy + 19)
    }
  }

  // Zonas: marco amarillo/negro + tapete cuadriculado
  const zone = (x0, x1, c1, c2) => {
    for (let y = 0; y < Hp; y++) {
      for (let x = x0; x < x1; x++) {
        const inner = x >= x0 + FR && x < x1 - FR && y >= FR && y < Hp - FR
        if (inner) P(x, y, (((x >> 1) + (y >> 1)) & 1) ? c1 : c2)
        else P(x, y, (Math.floor((x + y) / 3) & 1) ? HAZ_Y : HAZ_K)
      }
    }
    // sombra interior del marco
    R(x0 + FR, FR, x1 - x0 - 2 * FR, 1, '#00000055')
    R(x0 + FR, FR, 1, Hp - 2 * FR, '#00000040')
    for (const [sx, sy] of [[x0, 0], [x1 - FR, 0], [x0, Hp - FR], [x1 - FR, Hp - FR]]) {
      R(sx, sy, FR, FR, '#6d737b')
      P(sx, sy, '#d8dce0'); P(sx + 1, sy + 1, '#3c4147')
    }
  }
  zone(0, zwU, '#e83a78', '#c42662')
  zone(Wp - zwU, Wp, '#4d505b', '#393c47')
  // sombras sobre el suelo
  R(zwU, 0, 2, Hp, '#00000038')
  R(Wp - zwU - 2, 0, 2, Hp, '#00000038')

  // Compuertas arriba y abajo
  const gx0 = Math.floor((Wp - GATE_W) / 2)
  const gate = (top) => {
    const Y = (y) => (top ? y : Hp - 1 - y)
    const row = (y, x, w, col) => R(x, Y(y), w, 1, col)
    for (let y = 0; y < GATE_H; y++) row(y, gx0 - 2, GATE_W + 4, '#6b717a')
    row(0, gx0 - 2, GATE_W + 4, '#9aa0a8')
    for (let y = 0; y < GATE_H - 2; y++) {
      row(y, gx0, GATE_W, y % 2 ? '#23272e' : '#14161b')
    }
    for (let x = gx0 - 2; x < gx0 + GATE_W + 2; x++) {
      P(x, Y(GATE_H - 2), (Math.floor(x / 3) & 1) ? HAZ_Y : HAZ_K)
      P(x, Y(GATE_H - 1), (Math.floor((x + 1) / 3) & 1) ? HAZ_Y : HAZ_K)
    }
    for (const x of [gx0 - 1, gx0 + GATE_W]) { P(x, Y(2), '#ff4040'); P(x, Y(4), '#40ff7a') }
    // sombra bajo la compuerta
    R(gx0 - 2, Y(GATE_H), GATE_W + 4, 1, '#00000040')
  }
  gate(true)
  gate(false)
  return { canvas: cv, gx0 }
}
