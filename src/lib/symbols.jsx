import { canvas, ellipse, outline, poly, px, pxs, rect, toURI } from './pixelEngine.js'

/* 6 sprites 16x16 con sombreado y brillos (de menor a mayor valor):
   0 Nube · 1 Bellota · 2 Flor · 3 Gato · 4 Corona · 5 Estrella */
const S = 16

function cloud() {
  const c = canvas(S, S)
  const t = ['#ffffff', '#eaf5ff', '#bcd9f2', '#94bde6']
  ellipse(c, 4.6, 9.4, 3.5, 3.5, t)
  ellipse(c, 8, 7, 4.2, 4.2, t)
  ellipse(c, 11.6, 9.2, 3.8, 3.8, t)
  ellipse(c, 8, 10.6, 6.6, 3.4, t)
  pxs(c, [[6, 8], [6, 9], [10, 8], [10, 9]], '#3a2a5a')
  pxs(c, [[5, 6], [6, 5]], '#ffffff')
  pxs(c, [[6, 11], [7, 12], [8, 12], [9, 12], [10, 11]], '#3a2a5a')
  pxs(c, [[4, 10], [12, 10]], '#ffb3c8')
  outline(c)
  return c
}

function acorn() {
  const c = canvas(S, S)
  ellipse(c, 8, 14.3, 1.3, 1.1, ['#c98f45'])
  ellipse(c, 8, 10.6, 4.7, 4.4, ['#ffe9bd', '#f2c27a', '#c98f45', '#a56a2c'])
  ellipse(c, 8, 6.9, 6.3, 3.7, ['#ff8a8a', '#e63a4a', '#b01e3a', '#7d1230'])
  pxs(c, [[5, 6], [6, 6], [9, 4], [10, 4], [11, 7], [10, 7], [7, 8], [8, 8], [4, 8]], '#fff3d6')
  pxs(c, [[8, 1], [8, 2], [8, 3], [9, 1]], '#7a4a21')
  pxs(c, [[5, 11], [5, 12], [6, 10]], '#fff6d6')
  outline(c)
  return c
}

function flower() {
  const c = canvas(S, S)
  // tallo y hojas
  rect(c, 8, 11, 1, 5, ['#3fbf5a', '#1f7d3a'], 'h')
  ellipse(c, 4.6, 13, 2.7, 1.5, ['#b6f3bd', '#3fbf5a', '#1f7d3a'])
  ellipse(c, 11.4, 13.3, 2.7, 1.5, ['#b6f3bd', '#3fbf5a', '#1f7d3a'])
  // pétalos
  const pt = ['#fff3a0', '#ffd23f', '#ff9f1c', '#d9680f']
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    ellipse(c, 8 + Math.cos(a) * 4.1, 6.4 + Math.sin(a) * 4.1, 2.1, 2.1, pt)
  }
  // centro con semillas
  ellipse(c, 8, 6.4, 3.1, 3.1, ['#b57a3a', '#7a4a21', '#4f2f14', '#34200e'])
  pxs(c, [[7, 5], [9, 6], [7, 7], [8, 8], [9, 4]], '#d9a05a')
  outline(c)
  return c
}

function cat() {
  const c = canvas(S, S)
  const o = ['#ffc470', '#ff9f1c', '#d9680f', '#a8480a']
  poly(c, [[2, 8], [2.4, 1.6], [7.4, 6]], o)
  poly(c, [[14, 8], [13.6, 1.6], [8.6, 6]], o)
  pxs(c, [[3, 4], [3, 5], [4, 5]], '#ff9ec4')
  pxs(c, [[13, 4], [13, 5], [12, 5]], '#ff9ec4')
  ellipse(c, 8, 9.6, 6.1, 5, o)
  // muzzle
  ellipse(c, 8, 12, 3.2, 2, ['#ffffff', '#fff0d6', '#f0d0a0'])
  // gorra azul
  ellipse(c, 8, 5.6, 4.8, 2.7, ['#8bbcff', '#3b7ddd', '#2352a8', '#183a7a'])
  poly(c, [[7, 6.6], [13.6, 6.6], [13.6, 8], [7, 8]], ['#3b7ddd', '#2352a8', '#183a7a'])
  pxs(c, [[8, 4], [9, 4]], '#ffffff')
  // ojos grandes con brillo
  pxs(c, [[5, 9], [5, 10], [5, 11], [6, 9], [6, 10], [6, 11]], '#1a1030')
  pxs(c, [[10, 9], [10, 10], [10, 11], [11, 9], [11, 10], [11, 11]], '#1a1030')
  pxs(c, [[5, 9], [10, 9]], '#ffffff')
  pxs(c, [[7, 12], [8, 12]], '#ff7a9a')
  pxs(c, [[7, 13], [9, 13]], '#5a2a1a')
  outline(c)
  pxs(c, [[1, 12], [0, 13], [14, 12], [15, 13]], '#ffe9c8')
  return c
}

function crown() {
  const c = canvas(S, S)
  const g = ['#fff3a0', '#ffd23f', '#e8a500', '#a86e00']
  poly(c, [[2, 13], [2, 3.5], [5.2, 7], [8, 2.5], [10.8, 7], [14, 3.5], [14, 13]], g, 0.9)
  rect(c, 2, 9, 12, 1, ['#b87d00'])
  rect(c, 2, 13, 12, 1, ['#8a5a00'])
  for (const [x, y] of [[2.2, 3.2], [8, 2], [13.8, 3.2]]) ellipse(c, x, y, 1.2, 1.2, ['#ffffff', '#ffe27a', '#e8a500'])
  const jewel = (x, base, hi, dark) => {
    pxs(c, [[x, 10], [x + 1, 10], [x, 11], [x + 1, 11]], base)
    px(c, x, 10, hi)
    px(c, x + 1, 11, dark)
  }
  jewel(3, '#ff3d5a', '#ffc2cc', '#a8122e')
  jewel(7, '#4cc9f0', '#d8f6ff', '#2b6fd0')
  jewel(11, '#3fbf5a', '#c6f5cd', '#1f7d3a')
  outline(c)
  return c
}

function star() {
  const c = canvas(S, S)
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? 7.3 : 3.3
    pts.push([8 + Math.cos(a) * r, 8.6 + Math.sin(a) * r])
  }
  poly(c, pts, ['#fff3a0', '#ffd23f', '#ff9f1c', '#d9680f'], 1.15)
  pxs(c, [[6, 8], [6, 9], [6, 10], [10, 8], [10, 9], [10, 10]], '#1a1030')
  pxs(c, [[6, 8], [10, 8]], '#ffffff')
  pxs(c, [[7, 11], [8, 12], [9, 11]], '#1a1030')
  pxs(c, [[5, 11], [11, 11]], '#ff7a5c')
  outline(c)
  return c
}

function coin() {
  const c = canvas(14, 14)
  ellipse(c, 7, 7, 6, 6, ['#fff3a0', '#ffd23f', '#e8a500', '#b87d00'])
  ellipse(c, 7, 7, 3.6, 3.6, ['#e8a500', '#ffc21f', '#fff3a0'])
  rect(c, 6, 4, 2, 6, ['#fff3a0', '#e8a500'], 'h')
  outline(c)
  return c
}

export const SPRITES = [cloud(), acorn(), flower(), cat(), crown(), star()].map(toURI)
const COIN_URI = toURI(coin())

const base = { imageRendering: 'pixelated', objectFit: 'contain' }

export function Sym({ i, className = '', style }) {
  return <img src={SPRITES[i]} alt="" draggable={false} className={className} style={{ ...base, ...style }} />
}

export function PixelCoin({ className = '' }) {
  return <img src={COIN_URI} alt="" draggable={false} className={className} style={base} />
}
