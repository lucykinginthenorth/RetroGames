// Genera los íconos de la PWA (PNG + SVG) a partir del sprite del gato con gorra.
// Uso: node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Pequeño "document" falso: los módulos de arte solo lo usan para crear PNG en el navegador.
globalThis.document = {
  createElement: () => ({ getContext: () => ({ fillRect() {}, set fillStyle(v) {} }), toDataURL: () => '' }),
}

const { canvas, outline } = await import('../src/lib/pixelEngine.js')
const { head } = await import('../src/lib/trampArt.js')

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const outDir = path.join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// Sprite de la cabeza del gato
const cat = canvas(15, 14)
head(cat, 7, 7)
outline(cat)

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const TOP = hex('#2b1d5c')
const BOT = hex('#120b2e')

/** Dibuja el ícono: fondo degradado + gato escalado en píxeles enteros. `fill` = proporción del lado que ocupa el gato. */
function render(size, fill) {
  const scale = Math.max(1, Math.floor((size * fill) / cat.w))
  const ox = Math.floor((size - cat.w * scale) / 2)
  const oy = Math.floor((size - cat.h * scale) / 2)
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    const bg = lerp(TOP, BOT, y / (size - 1))
    for (let x = 0; x < size; x++) {
      let [r, g, b] = bg
      const cx = Math.floor((x - ox) / scale)
      const cy = Math.floor((y - oy) / scale)
      if (x >= ox && y >= oy && cx < cat.w && cy < cat.h && cat.g[cy][cx]) [r, g, b] = hex(cat.g[cy][cx].slice(0, 7))
      const i = (y * size + x) * 4
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255
    }
  }
  return buf
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (b) => {
  let c = 0xffffffff
  for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ])
}

const files = [
  ['icon-192.png', 192, 0.72],
  ['icon-512.png', 512, 0.72],
  ['icon-maskable-512.png', 512, 0.56], // zona segura de íconos "maskable" (~80% central)
  ['apple-touch-icon.png', 180, 0.7],
  ['favicon-32.png', 32, 0.9],
]
for (const [name, size, fill] of files) {
  writeFileSync(path.join(outDir, name), png(size, render(size, fill)))
  console.log('✓', name)
}

// SVG vectorial (favicon): un rect por tramo horizontal de color
const S = 64
const scale = Math.floor((S * 0.72) / cat.w)
const ox = Math.floor((S - cat.w * scale) / 2)
const oy = Math.floor((S - cat.h * scale) / 2)
let rects = ''
for (let y = 0; y < cat.h; y++) {
  let x = 0
  while (x < cat.w) {
    const col = cat.g[y][x]
    if (!col) { x++; continue }
    let e = x
    while (e + 1 < cat.w && cat.g[y][e + 1] === col) e++
    rects += `<rect x="${ox + x * scale}" y="${oy + y * scale}" width="${(e - x + 1) * scale}" height="${scale}" fill="${col}"/>`
    x = e + 1
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1d5c"/><stop offset="1" stop-color="#120b2e"/></linearGradient></defs><rect width="${S}" height="${S}" rx="10" fill="url(#g)"/>${rects}</svg>\n`
writeFileSync(path.join(outDir, 'icon.svg'), svg)
console.log('✓ icon.svg')
