import { canvas, ellipse, line, outline, poly, px, pxs, rect, toURI } from './pixelEngine.js'

/* Escena 120x112 px lógicos (se escala con image-rendering: pixelated). */
export const W = 120
export const H = 112

const stamp = (dst, src) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (src.g[y][x]) dst.g[y][x] = src.g[y][x]
}
const obj = (dst, fn) => {
  const o = canvas(W, H)
  fn(o)
  outline(o)
  stamp(dst, o)
}
const fillRect = (c, x, y, w, h, col) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(c, x + i, y + j, col)
}
const flipX = (c) => {
  for (const row of c.g) row.reverse()
  return c
}

/* ---------- Fondo: salón casino nocturno ---------- */
function buildBg() {
  const c = canvas(W, H)
  // pared / techo oscuro con bandas
  const bands = ['#0b0628', '#0f0833', '#150a3f', '#1a0d4b', '#211156', '#281561', '#2e186c', '#341b76']
  for (let y = 0; y < 64; y++) fillRect(c, 0, y, W, 1, bands[Math.min(7, Math.floor(y / 8))])
  // estrellitas del techo
  for (const [x, y] of [[6, 3], [20, 9], [34, 2], [52, 8], [66, 3], [82, 10], [96, 4], [112, 8], [44, 14], [104, 16], [14, 20], [74, 18]])
    px(c, x, y, '#fff3a0')
  // friso dorado con pilastras
  fillRect(c, 0, 44, W, 1, '#e8b04a')
  fillRect(c, 0, 45, W, 2, '#a8721f')
  fillRect(c, 0, 47, W, 1, '#5a3a10')
  for (let x = 6; x < W; x += 18) {
    rect(c, x, 48, 4, 16, ['#5b3aa8', '#3a2478', '#241650'], 'h')
    fillRect(c, x, 48, 4, 1, '#e8b04a')
  }
  // piso oscuro con puntos dorados
  for (let y = 64; y < H; y++) fillRect(c, 0, y, W, 1, y < 66 ? '#3b2a6e' : y < 84 ? '#170d30' : '#1d1140')
  for (let y = 67; y < H; y += 5) {
    for (let x = ((y / 5) % 2 ? 3 : 0); x < W; x += 6) {
      px(c, x, y, '#e0a924')
      px(c, x + 1, y, '#8a6a10')
    }
  }

  // guirnaldas de luces amarillas
  const garland = (x0, x1, y0, sag, off = 0) => {
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / (x1 - x0)
      px(c, x, y0 + sag * 4 * t * (1 - t), '#4a3a7a')
    }
    for (let x = x0 + 3; x < x1; x += 6) {
      const t = (x - x0) / (x1 - x0)
      const y = y0 + sag * 4 * t * (1 - t)
      const hot = ((x + off) / 6) % 2 === 0
      fillRect(c, x, y + 1, 2, 2, hot ? '#ffe45e' : '#ffb347')
      px(c, x, y + 1, '#fffbd0')
      px(c, x - 1, y + 2, '#6a5a2a')
      px(c, x + 2, y + 2, '#6a5a2a')
    }
  }
  garland(0, 40, 2, 9)
  garland(40, 80, 2, 10, 6)
  garland(80, 120, 2, 9)
  garland(0, 60, 14, 8, 6)
  garland(60, 120, 14, 8)

  // estrellas colgantes
  const star = (x, y) => {
    const pat = ['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.']
    line(c, x + 2, 0, x + 2, y, '#4a3a7a')
    pat.forEach((r, j) => [...r].forEach((ch, i) => ch === 'y' && px(c, x + i, y + j, j < 2 ? '#fff3a0' : '#ffd23f')))
  }
  star(96, 30)
  star(108, 24)
  star(12, 30)

  // tragamonedas
  const slot = (x, y, w, h, tones, symCol) => {
    obj(c, (o) => {
      rect(o, x, y, w, h, tones, 'h')
      rect(o, x + 1, y + 1, w - 2, 6, ['#fff3a0', '#ffd23f', '#e8a500'])
      for (let i = 0; i < w - 5; i += 3) px(o, x + 3 + i, y + 3, '#ff3d5a')
      const sx = x + Math.floor((w - 14) / 2)
      fillRect(o, sx - 1, y + 8, 16, 12, '#0b0b12')
      for (let r = 0; r < 3; r++) {
        fillRect(o, sx + r * 5, y + 9, 4, 10, '#f4f4ff')
        fillRect(o, sx + r * 5 + 1, y + 12 + (r % 2), 2, 3, symCol[r])
        px(o, sx + r * 5, y + 9, '#ffffff')
      }
      fillRect(o, x + 3, y + 22, 3, 2, '#ff4d6d')
      fillRect(o, x + 8, y + 22, 3, 2, '#ffd23f')
      fillRect(o, x + 13, y + 22, 3, 2, '#3fbf5a')
      fillRect(o, x + 3, y + h - 9, w - 6, 4, '#0b0b12')
      line(o, x + w, y + 14, x + w + 2, y + 5, '#c9d0e0')
      ellipse(o, x + w + 2, y + 4, 1.8, 1.8, ['#ff9aa8', '#ff3d5a', '#a8122e'])
    })
  }
  slot(15, 44, 22, 48, ['#9a7dff', '#5b45d6', '#3a2a9a', '#241a66'], ['#ff3d5a', '#4cc9f0', '#ffd23f'])
  slot(0, 36, 24, 58, ['#7fd8ff', '#2b8fd8', '#1b5fa0', '#123d6a'], ['#ffd23f', '#ff3d5a', '#3fbf5a'])

  // taburetes rojos
  for (const sx of [29, 40]) {
    obj(c, (o) => {
      rect(o, sx, 86, 1, 8, ['#c9d0e0', '#7a849c'], 'h')
      ellipse(o, sx, 96, 3.2, 1.2, ['#c9d0e0', '#7a849c'])
      ellipse(o, sx, 84.5, 5.5, 2.4, ['#ff8a9a', '#e63a4a', '#b01e3a', '#7d1230'])
    })
  }

  // barandal curvo a la derecha
  obj(c, (o) => {
    for (let x = 82; x < W; x++) {
      const top = Math.round(54 + (((W - x) / 38) ** 2) * 16)
      fillRect(o, x, top, 1, 1, '#ffd27f')
      fillRect(o, x, top + 1, 1, 1, '#ff9f1c')
      fillRect(o, x, top + 2, 1, 1, '#c4570f')
      if (x % 4 === 0) rect(o, x, top + 3, 2, 84 - top - 3, ['#ffb347', '#c4570f'], 'h')
    }
    rect(o, 82, 84, 38, 3, ['#ffd27f', '#ff9f1c', '#c4570f'])
    rect(o, 82, 56, 3, 31, ['#ffd27f', '#ff9f1c', '#c4570f'], 'h')
  })
  return c
}

/* ---------- Mesa verde (por delante del cuerpo) ---------- */
function buildTable() {
  const c = canvas(W, H)
  const bands = ['#2db066', '#29a45e', '#23964f', '#1d8645', '#18763c']
  for (let y = 90; y < H; y++) fillRect(c, 0, y, W, 1, bands[Math.min(4, Math.floor((y - 90) / 5))])
  for (let y = 91; y < H; y += 3) for (let x = (y % 2 ? 1 : 0); x < W; x += 4) px(c, x, y, '#33bd70')
  fillRect(c, 0, 86, W, 1, '#f0b866')
  fillRect(c, 0, 87, W, 1, '#d9983f')
  fillRect(c, 0, 88, W, 1, '#a8651f')
  fillRect(c, 0, 89, W, 1, '#6a3d12')
  return c
}

/* ---------- Cuerpo: chaleco, camisa, moño verde ---------- */
function buildBody() {
  const c = canvas(W, H)
  const j = ['#5a5a76', '#2c2c3d', '#17171f', '#0d0d12']
  poly(c, [[34, 112], [37, 66], [46, 57], [74, 57], [83, 66], [86, 112]], j)
  poly(c, [[30, 96], [32, 68], [42, 61], [45, 66], [42, 96]], j)
  poly(c, [[90, 96], [88, 68], [78, 61], [75, 66], [78, 96]], j)
  poly(c, [[51, 57], [69, 57], [60, 90]], ['#ffffff', '#f0f4ff', '#c9d3ee'])
  line(c, 50, 58, 59, 86, '#3a3a52')
  line(c, 70, 58, 61, 86, '#0d0d12')
  poly(c, [[51, 57], [60, 64], [53, 67]], ['#ffffff', '#dfe6f8'])
  poly(c, [[69, 57], [60, 64], [67, 67]], ['#f0f4ff', '#c9d3ee'])
  // cadena de reloj dorada
  line(c, 45, 76, 52, 71, '#ffd23f')
  ellipse(c, 45, 77, 1.5, 1.5, ['#fff3a0', '#ffd23f', '#a86e00'])
  outline(c)
  // moño verde
  const g = ['#b6f3bd', '#3fbf5a', '#1f7d3a', '#14502a']
  const bow = canvas(W, H)
  poly(bow, [[60, 63], [49, 57], [49, 69]], g)
  poly(bow, [[60, 63], [71, 57], [71, 69]], g)
  rect(bow, 58, 60, 4, 6, ['#3fbf5a', '#1f7d3a', '#14502a'], 'h')
  outline(bow)
  stamp(c, bow)
  return c
}

/* ---------- Manos enguantadas (se animan al repartir) ---------- */
function buildHand() {
  const c = canvas(W, H)
  ellipse(c, 41, 96.4, 7.5, 1.4, ['#16703a']) // sombra sobre el tapete
  const o = canvas(W, H)
  poly(o, [[33, 78], [46, 78], [47, 88], [32, 88]], ['#4a4a62', '#2c2c3d', '#17171f'])
  rect(o, 32, 87, 15, 2, ['#ffffff', '#c9d3ee'])
  ellipse(o, 40, 92.5, 7, 4.6, ['#ffffff', '#f4f7ff', '#c9d3ee', '#9aa6c8'])
  ellipse(o, 46.6, 91.2, 2.2, 1.8, ['#ffffff', '#e4ebfa', '#c9d3ee'])
  pxs(o, [[36, 91], [36, 92], [39, 90], [39, 91], [42, 90], [42, 91]], '#aab6d6')
  outline(o)
  stamp(c, o)
  return c
}

/* ---------- Cabeza del gato ---------- */
function buildHead() {
  const c = canvas(W, H)
  const o = ['#ffc470', '#ff9f1c', '#d9680f', '#a8480a']
  poly(c, [[42, 38], [42.5, 18], [57, 32]], o)
  poly(c, [[78, 38], [77.5, 18], [63, 32]], o)
  poly(c, [[44.5, 34], [45, 24.5], [52, 31]], ['#ffc2d8', '#ff9ec4', '#d9688f'])
  poly(c, [[75.5, 34], [75, 24.5], [68, 31]], ['#ffc2d8', '#ff9ec4', '#d9688f'])
  ellipse(c, 60, 45, 18.6, 14.6, o)
  ellipse(c, 60, 54, 9.8, 5.6, ['#ffffff', '#fff1d6', '#f3d5a3', '#d9b27a'])
  // rayas de la mejilla
  pxs(c, [[43, 47], [44, 47], [45, 47], [43, 49], [44, 49]], '#d9680f')
  pxs(c, [[77, 47], [76, 47], [75, 47], [77, 49], [76, 49]], '#a8480a')
  // nariz
  pxs(c, [[58, 51], [59, 51], [60, 51], [61, 51], [62, 51], [59, 52], [60, 52], [61, 52], [60, 53]], '#ff7a9a')
  pxs(c, [[58, 51], [59, 51]], '#ffc2d0')
  // visera verde de casino
  const gr = ['#8bf5bb', '#2fbf71', '#1f8f55', '#146b3d']
  poly(c, [[40, 36], [80, 36], [76, 42], [44, 42]], gr)
  poly(c, [[42, 30], [78, 30], [80, 36], [40, 36]], ['#1f8f55', '#146b3d'])
  fillRect(c, 41, 36, 38, 1, '#7cf0b0')
  pxs(c, [[48, 38], [49, 38], [50, 39]], '#d6ffe9')
  outline(c)
  // bigotes
  line(c, 47, 54, 36, 51, '#fff0d6')
  line(c, 47, 56, 37, 58, '#fff0d6')
  line(c, 73, 54, 84, 51, '#fff0d6')
  line(c, 73, 56, 83, 58, '#fff0d6')
  return c
}

const DARK = '#1a1030'

function eyes(kind) {
  const c = canvas(W, H)
  for (const ex of [53, 67]) {
    if (kind === 'open' || kind === 'wide') {
      const wide = kind === 'wide'
      const eye = canvas(W, H)
      ellipse(eye, ex, 47, wide ? 4.5 : 3.8, wide ? 5.4 : 4.6, ['#ffffff', '#f1f4ff', '#cfd6ee'])
      if (wide) {
        ellipse(eye, ex, 47.6, 1.9, 2.5, [DARK])
        px(eye, ex - 1, 46, '#ffffff')
      } else {
        ellipse(eye, ex + 0.4, 47.8, 2.7, 3.6, ['#8be28b', '#3fbf5a', '#1f7d3a'])
        ellipse(eye, ex + 0.4, 48, 1.2, 2.8, [DARK])
        fillRect(eye, ex - 2, 45, 2, 2, '#ffffff')
        px(eye, ex + 1, 50, '#ffffff')
      }
      outline(eye)
      stamp(c, eye)
    } else if (kind === 'closed') {
      pxs(c, [[ex - 3, 47], [ex - 2, 48], [ex - 1, 48], [ex, 48], [ex + 1, 48], [ex + 2, 48], [ex + 3, 47]], DARK)
    } else {
      pxs(c, [[ex - 3, 50], [ex - 2, 49], [ex - 1, 48], [ex, 47], [ex + 1, 48], [ex + 2, 49], [ex + 3, 50]], DARK)
      pxs(c, [[ex - 2, 50], [ex - 1, 49], [ex, 48], [ex + 1, 49], [ex + 2, 50]], DARK)
    }
  }
  return c
}

function mouth(kind) {
  const c = canvas(W, H)
  const col = '#4a2418'
  if (kind === 'neutral') {
    pxs(c, [[60, 54], [59, 55], [58, 55], [57, 54], [61, 55], [62, 55], [63, 54]], col)
  } else if (kind === 'smile') {
    pxs(c, [[60, 54], [59, 55], [58, 56], [57, 56], [56, 56], [55, 55], [54, 54], [53, 53]], col)
    pxs(c, [[61, 55], [62, 56], [63, 56], [64, 56], [65, 55], [66, 54], [67, 53]], col)
    pxs(c, [[58, 57], [59, 57], [60, 56], [61, 57], [62, 57]], '#ff7a9a')
  } else {
    pxs(c, [[60, 54], [56, 56], [57, 57], [58, 56], [59, 57], [60, 56], [61, 57], [62, 56], [63, 57], [64, 56]], col)
  }
  return c
}

function sweat() {
  const c = canvas(W, H)
  poly(c, [[76.5, 37], [79, 41], [74, 41]], ['#d8f6ff', '#7fd4ff'])
  ellipse(c, 76.5, 43.2, 2.4, 2.8, ['#d8f6ff', '#7fd4ff', '#3b9ee8'])
  px(c, 75, 42, '#ffffff')
  outline(c)
  return c
}

export const ART = {
  bg: toURI(buildBg()),
  table: toURI(buildTable()),
  body: toURI(buildBody()),
  handL: toURI(buildHand()),
  handR: toURI(flipX(buildHand())),
  head: toURI(buildHead()),
  eyes: { open: toURI(eyes('open')), wide: toURI(eyes('wide')), closed: toURI(eyes('closed')), happy: toURI(eyes('happy')) },
  mouth: { neutral: toURI(mouth('neutral')), smile: toURI(mouth('smile')), nervous: toURI(mouth('nervous')) },
  sweat: toURI(sweat()),
}
