import { useEffect, useRef, useState } from 'react'
import { useCoins } from '../store.jsx'
import GameOver from '../components/GameOver.jsx'
import {
  burst, clamp, drawFloaters, drawParticles, localPoint, rand, setupCanvas, startLoop, updateParticles,
} from '../lib/canvas.js'
import {
  CU, HEAD_URI, NET_H, U, buildNet, buildScene, getCatSprites, towerUnits,
} from '../lib/trampArt.js'

const MAX_LINES = 3
const MAX_LIVES = 5
const RADIUS = 16
const NET_COOL = 4 // segundos de enfriamiento de la red
const SPAWN_LEVELS = { L: [0.13, 0.24], R: [0.18, 0.29] }
const GOAL_LEVELS = [0.4, 0.52, 0.64]
const GOAL_H = 16 // alto de la meta (unidades)
const GOAL_W = 6
const SPARK = ['#ffd60a', '#ffffff', '#ff7a2f']
const STAR_COLORS = ['#ffd60a', '#ffffff', '#ff4d4d', '#4cc9f0']
const OUT = '2px 0 #000, -2px 0 #000, 0 2px #000, 0 -2px #000, 2px 2px #000, -2px -2px #000, 2px -2px #000, -2px 2px #000'

export default function Trampolines({ onExit }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [hud, setHud] = useState({ score: 0, lives: MAX_LIVES })
  const [result, setResult] = useState(null)
  const [run, setRun] = useState(0)
  const { addCoins, reportBest, best } = useCoins()
  const ext = useRef({})
  ext.current = { addCoins, reportBest, best: best.tramp || 0 }

  useEffect(() => {
    const canvas = canvasRef.current
    let stars = []
    const view = setupCanvas(canvas, wrapRef.current, (v) => {
      stars = Array.from({ length: 34 }, () => ({
        x: rand(v.w * 0.2, v.w * 0.8), y: rand(8, v.h * 0.45), col: STAR_COLORS[Math.floor(Math.random() * 4)], ph: rand(0, 6.28), sp: rand(1.5, 4),
      }))
    })
    const ctx = view.ctx
    const spr = getCatSprites()

    const s = {
      chars: [], lines: [], drawing: null, particles: [], floaters: [], drags: null,
      score: 0, lives: MAX_LIVES, spawnT: 0.8, time: 0, flash: 0, over: false, nextSide: 0,
      goals: { L: { lvl: 1, glow: 0 }, R: { lvl: 0, glow: 0 } },
      net: { cool: 0, sag: 0 },
    }
    const pushHud = () => setHud({ score: s.score, lives: s.lives })
    const scale = () => clamp(view.h / 700, 0.75, 1.25)
    const maxLen = () => Math.min(view.w * 0.5, 190)

    // ---------- Geometría / escena en caché ----------
    let L = null
    const layout = () => {
      const key = view.w + 'x' + view.h
      if (L && L.key === key) return L
      const TWu = towerUnits(view.w)
      const Wp = Math.ceil(view.w / U)
      const Hp = Math.ceil(view.h / U)
      const ox = (view.w - Wp * U) / 2
      const oy = (view.h - Hp * U) / 2
      const NWu = Wp - 2 * TWu
      L = {
        key, TWu, Wp, Hp, ox, oy, NWu,
        scene: buildScene(Wp, Hp, TWu, SPAWN_LEVELS),
        netOn: buildNet(NWu, false),
        netOff: buildNet(NWu, true),
        wallL: ox + TWu * U,
        wallR: ox + (Wp - TWu) * U,
      }
      return L
    }
    const goalY = (side) => GOAL_LEVELS[s.goals[side].lvl] * view.h

    // ---------- Entrada táctil: dibujar trampolines ----------
    const onDown = (e) => {
      if (s.over || s.drawing) return
      try { canvas.setPointerCapture(e.pointerId) } catch { /* puntero sintético */ }
      const p = localPoint(canvas, e)
      s.drawing = { id: e.pointerId, a: p, b: { ...p } }
    }
    const onMove = (e) => {
      const d = s.drawing
      if (!d || d.id !== e.pointerId) return
      const p = localPoint(canvas, e)
      const dx = p.x - d.a.x
      const dy = p.y - d.a.y
      const len = Math.hypot(dx, dy)
      const max = maxLen()
      d.b = len > max ? { x: d.a.x + (dx / len) * max, y: d.a.y + (dy / len) * max } : p
    }
    const onUp = (e) => {
      onMove(e) // usa también la posición final del dedo
      const d = s.drawing
      if (!d || d.id !== e.pointerId) return
      s.drawing = null
      if (s.over || Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) < 26) return
      const active = s.lines.filter((l) => !l.hit)
      if (active.length >= MAX_LINES) s.lines.splice(s.lines.indexOf(active[0]), 1) // el más antiguo desaparece
      s.lines.push({ a: d.a, b: d.b, born: s.time, hit: 0 })
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)

    // ---------- Lógica ----------
    const spawn = () => {
      const lay = layout()
      const side = s.nextSide++ % 2 === 0 ? (Math.random() < 0.5 ? 'L' : 'R') : (s.lastSide === 'L' ? 'R' : 'L')
      s.lastSide = side
      const levels = SPAWN_LEVELS[side]
      const fr = levels[Math.floor(Math.random() * levels.length)]
      const k = scale()
      s.chars.push({
        x: side === 'L' ? lay.wallL + RADIUS + 4 : lay.wallR - RADIUS - 4,
        y: fr * view.h,
        vx: (side === 'L' ? 1 : -1) * rand(70, 110) * k,
        vy: -rand(40, 110) * k,
        t: 0, rot: 0, spin: 0, bounces: 0, born: s.time,
      })
    }

    const bounce = (c, line, q) => {
      const dx = line.b.x - line.a.x
      const dy = line.b.y - line.a.y
      const len = Math.hypot(dx, dy)
      // Normal perpendicular a la línea, orientada hacia arriba
      let nx = -dy / len
      let ny = dx / len
      if (ny > 0) { nx = -nx; ny = -ny }
      // En líneas casi verticales, empujar hacia el lado donde está el gato
      if (Math.abs(ny) < 0.5 && (c.x - q.x) * nx < 0) nx = -nx
      if (ny > -0.18) {
        ny = -0.18
        const m = Math.hypot(nx, ny)
        nx /= m
        ny /= m
      }
      const k = scale()
      const vin = Math.hypot(c.vx, c.vy)
      const speed = clamp(0.7 * vin + 230 * k, 330 * k, 470 * k)
      c.vx = nx * speed
      c.vy = ny * speed
      c.x = q.x + nx * (RADIUS + 6)
      c.y = q.y + ny * (RADIUS + 6)
      c.bounces += 1
      c.spin = (nx >= 0 ? 1 : -1) * 8
      line.hit = s.time
      line.nx = nx
      line.ny = ny
      burst(s.particles, q.x, q.y, SPARK, 14, 220)
    }

    const loseLife = (c) => {
      s.lives -= 1
      s.flash = 0.35
      burst(s.particles, c.x, view.h - 20, ['#ff4d6d', '#ffd60a', '#ffffff'], 18, 260)
      if (s.lives <= 0) endGame()
      pushHud()
    }

    const endGame = () => {
      if (s.over) return
      s.over = true
      s.drawing = null
      const { addCoins: add, reportBest: rep, best: prev } = ext.current
      add(s.score)
      rep('tramp', s.score)
      setResult({ score: s.score, best: Math.max(prev, s.score), isRecord: s.score > prev })
    }

    const scoreGoal = (c, side) => {
      const pts = c.bounces >= 2 ? 2 : 1
      s.score += pts
      const lay = layout()
      const gx = side === 'L' ? lay.wallL : lay.wallR
      const gy = goalY(side) + (GOAL_H * U) / 2
      burst(s.particles, gx, gy, ['#fff6a8', '#ffd60a', '#ffffff', '#ff9f1c'], 26, 300)
      s.floaters.push({ x: clamp(gx + (side === 'L' ? 36 : -36), 40, view.w - 40), y: gy - 10, t: 0, text: pts > 1 ? '+2 COMBO!' : '+1', color: '#ffe14d' })
      const g = s.goals[side]
      g.glow = 1
      // la meta cambia de altura
      let n = g.lvl
      while (n === g.lvl) n = Math.floor(Math.random() * GOAL_LEVELS.length)
      g.lvl = n
      pushHud()
    }

    const update = (dt) => {
      s.time += dt
      s.flash = Math.max(0, s.flash - dt)
      s.net.sag = Math.max(0, s.net.sag - dt * 2.2)
      s.net.cool = Math.max(0, s.net.cool - dt)
      s.goals.L.glow = Math.max(0, s.goals.L.glow - dt * 2)
      s.goals.R.glow = Math.max(0, s.goals.R.glow - dt * 2)
      updateParticles(s.particles, dt, 260)
      for (let i = s.lines.length - 1; i >= 0; i--) {
        const l = s.lines[i]
        if (l.hit) {
          const age = s.time - l.hit
          if (age < 0.35 && Math.random() < 0.5) {
            burst(s.particles, (l.a.x + l.b.x) / 2 + rand(-20, 20), (l.a.y + l.b.y) / 2 + rand(-6, 6), SPARK, 2, 120)
          }
          if (age > 0.45) s.lines.splice(i, 1)
        }
      }
      if (s.over) return
      const W = view.w
      const H = view.h
      const lay = layout()
      const k = scale()
      const g = 300 * k // gravedad baja: caída suave y flotante
      const vt = 200 * k

      // Aparición equilibrada: 1 gato cada 3.5 s, acelera muy poco a poco
      s.spawnT -= dt
      if (s.spawnT <= 0 && s.chars.length < 6) {
        spawn()
        s.spawnT = Math.max(1.7, 3.5 - s.score * 0.06) * rand(0.9, 1.1)
      }

      for (let i = s.chars.length - 1; i >= 0; i--) {
        const c = s.chars[i]
        c.t += dt
        c.vy = Math.min(vt * 1.6, c.vy + g * dt)
        if (c.vy > vt) c.vy = vt + (c.vy - vt) * Math.exp(-8 * dt)
        c.x += c.vx * dt
        c.y += c.vy * dt
        // Giro en el aire al rebotar; luego se estabiliza
        if (Math.abs(c.spin) > 0.4) {
          c.rot += c.spin * dt
          c.spin *= Math.exp(-1.1 * dt)
        } else {
          const twoPi = Math.PI * 2
          c.rot = ((c.rot + Math.PI) % twoPi + twoPi) % twoPi - Math.PI
          c.rot += (Math.sin(c.t * 3) * 0.12 - c.rot) * Math.min(1, 6 * dt)
        }

        // Metas iluminadas en las paredes internas
        let scored = false
        for (const side of ['L', 'R']) {
          const gy = goalY(side)
          const hitWall = side === 'L' ? c.x <= lay.wallL + RADIUS + 2 : c.x >= lay.wallR - RADIUS - 2
          if (hitWall && c.y > gy - 4 && c.y < gy + GOAL_H * U + 4 && c.born + 0.6 < s.time) {
            scoreGoal(c, side)
            scored = true
            break
          }
        }
        if (scored) { s.chars.splice(i, 1); continue }

        // Paredes de las torres
        if (c.x < lay.wallL + RADIUS) { c.x = lay.wallL + RADIUS; c.vx = Math.abs(c.vx) * 0.75 }
        if (c.x > lay.wallR - RADIUS) { c.x = lay.wallR - RADIUS; c.vx = -Math.abs(c.vx) * 0.75 }

        // Colisión con trampolines
        for (const ln of s.lines) {
          if (ln.hit) continue
          const dx = ln.b.x - ln.a.x
          const dy = ln.b.y - ln.a.y
          const L2 = dx * dx + dy * dy
          const tt = clamp(((c.x - ln.a.x) * dx + (c.y - ln.a.y) * dy) / L2, 0, 1)
          const q = { x: ln.a.x + dx * tt, y: ln.a.y + dy * tt }
          const dist = Math.hypot(c.x - q.x, c.y - q.y)
          if (dist > RADIUS + 4) continue
          let nx = -dy
          let ny = dx
          if (ny > 0) { nx = -nx; ny = -ny }
          if (c.vx * nx + c.vy * ny >= 0 && c.vy <= 0) continue
          bounce(c, ln, q)
          break
        }

        // Red elástica gigante
        const netSurface = H - NET_H * U + 14
        if (s.net.cool <= 0 && c.y + 8 > netSurface && c.vy > 0) {
          c.vy = -440 * k
          c.vx = clamp((W / 2 - c.x) * 0.7 + rand(-40, 40), -170, 170)
          c.spin = (c.x < W / 2 ? 1 : -1) * 8
          c.bounces += 1
          s.net.sag = 1
          s.net.cool = NET_COOL
          burst(s.particles, c.x, netSurface, ['#ff7a59', '#ffd60a', '#ffffff'], 16, 240)
          continue
        }
        // Red desactivada: el gato se cae al vacío
        if (s.net.cool > 0 && c.y > H - 16) {
          s.chars.splice(i, 1)
          loseLife(c)
          if (s.over) break
        }
      }
    }

    // ---------- Dibujo ----------
    const drawCat = (c) => {
      const f = c.vy < -40 ? 'C' : Math.floor(c.t * 8) % 2 ? 'B' : 'A'
      const w = 22 * CU
      const h = 28 * CU
      const pop = Math.min(1, (s.time - c.born) * 5)
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(c.rot)
      ctx.scale(pop, pop)
      ctx.drawImage(spr[f], -w / 2, -h * 0.52, w, h)
      ctx.restore()
    }

    const drawTramp = (ln) => {
      const age = s.time - ln.born
      const pop = Math.min(1, age * 8)
      const mx = (ln.a.x + ln.b.x) / 2
      const my = (ln.a.y + ln.b.y) / 2
      const a = { x: mx + (ln.a.x - mx) * pop, y: my + (ln.a.y - my) * pop }
      const b = { x: mx + (ln.b.x - mx) * pop, y: my + (ln.b.y - my) * pop }
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      // normal "hacia abajo" para hundir la lona
      let nx = -dy / len
      let ny = dx / len
      if (ny < 0) { nx = -nx; ny = -ny }
      let bend = 0
      if (ln.hit) {
        const t = s.time - ln.hit
        bend = (Math.exp(-t * 7) * Math.cos(t * 45) * 16)
      }
      const cx = mx + nx * bend * 2
      const cy = my + ny * bend * 2
      const alpha = ln.hit ? Math.max(0, 1 - (s.time - ln.hit - 0.25) / 0.2) : 1
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const path = () => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cx, cy, b.x, b.y) }
      // centro ovalado rojo/naranja (debajo de la barra)
      const px0 = 0.25 * a.x + 0.5 * cx + 0.25 * b.x + nx * 5
      const py0 = 0.25 * a.y + 0.5 * cy + 0.25 * b.y + ny * 5
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      ctx.save()
      ctx.translate(px0, py0)
      ctx.rotate(ang)
      ctx.fillStyle = '#17102a'
      ctx.beginPath(); ctx.ellipse(0, 0, len * 0.3 + 3, 11, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ff3b2f'
      ctx.beginPath(); ctx.ellipse(0, 0, len * 0.3, 8, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ff9f1c'
      ctx.beginPath(); ctx.ellipse(0, -1, len * 0.2, 4.5, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff3a0'
      ctx.beginPath(); ctx.ellipse(-len * 0.06, -2, len * 0.07, 1.8, 0, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      // barra blanca sólida
      ctx.strokeStyle = '#17102a'
      ctx.lineWidth = 11
      path(); ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 6
      path(); ctx.stroke()
      ctx.strokeStyle = '#cfe0ff'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(a.x + nx * 1.5, a.y + ny * 1.5); ctx.quadraticCurveTo(cx + nx * 1.5, cy + ny * 1.5, b.x + nx * 1.5, b.y + ny * 1.5); ctx.stroke()
      ctx.restore()
    }

    const drawGoal = (side) => {
      const lay = layout()
      const gy = goalY(side)
      const gw = GOAL_W * U
      const gh = GOAL_H * U
      const left = side === 'L'
      const x = left ? lay.wallL - gw : lay.wallR
      const pulse = 0.5 + 0.5 * Math.sin(s.time * 5 + (left ? 0 : 2))
      const glow = s.goals[side].glow
      // halo hacia el campo de juego
      const hx = left ? lay.wallL : lay.wallR
      const grad = ctx.createLinearGradient(hx, 0, hx + (left ? 1 : -1) * 40, 0)
      grad.addColorStop(0, `rgba(255,236,120,${0.35 + 0.2 * pulse + 0.4 * glow})`)
      grad.addColorStop(1, 'rgba(255,236,120,0)')
      ctx.fillStyle = grad
      ctx.fillRect(left ? hx : hx - 40, gy - 6, 40, gh + 12)
      // marco metálico
      ctx.fillStyle = '#4b5160'
      ctx.fillRect(x - 3, gy - 3, gw + 6, gh + 6)
      ctx.fillStyle = '#c9ced6'
      ctx.fillRect(x - 3, gy - 3, gw + 6, 3)
      ctx.fillStyle = '#17102a'
      ctx.fillRect(x - 1, gy - 1, gw + 2, gh + 2)
      // interior iluminado
      for (let r = 0; r < GOAL_H; r++) {
        ctx.fillStyle = r % 2 ? '#ffe14d' : '#fff7b0'
        if (glow > 0.3 && r % 4 < 2) ctx.fillStyle = '#ffffff'
        ctx.fillRect(x, gy + r * U, gw, U)
      }
      // flechas parpadeantes
      ctx.fillStyle = pulse > 0.5 ? '#e08a00' : '#ffbf3d'
      const dirx = left ? 1 : -1
      for (let r = 0; r < 3; r++) {
        const ay = gy + gh / 2 + (r - 1) * 11
        const ax = left ? x + 4 : x + gw - 4
        ctx.beginPath()
        ctx.moveTo(ax, ay - 4); ctx.lineTo(ax - dirx * 5, ay); ctx.lineTo(ax, ay + 4)
        ctx.lineTo(ax - dirx * 2, ay); ctx.closePath()
        ctx.fill()
      }
    }

    const drawNet = (lay) => {
      const cooling = s.net.cool > 0
      const sprite = cooling ? lay.netOff : lay.netOn
      const x = lay.wallL
      const y = view.h - NET_H * U + 2
      const sag = s.net.sag
      if (sag < 0.02) {
        ctx.drawImage(sprite, x, y, lay.NWu * U, NET_H * U)
      } else {
        // la lona se hunde en el centro y vibra al recuperarse
        const amp = sag * Math.cos((1 - sag) * 18) * 7
        for (let i = 0; i < lay.NWu; i++) {
          const off = Math.round(amp * Math.sin((Math.PI * (i + 0.5)) / lay.NWu)) * U
          ctx.drawImage(sprite, i, 0, 1, NET_H, x + i * U, y + off, U, NET_H * U)
        }
      }
      if (cooling) {
        // barra de recuperación
        const p = 1 - s.net.cool / NET_COOL
        const bw = lay.NWu * U * 0.5
        const bx = x + (lay.NWu * U - bw) / 2
        ctx.fillStyle = '#17102a'
        ctx.fillRect(bx - 2, y - 12, bw + 4, 9)
        ctx.fillStyle = '#ffd60a'
        ctx.fillRect(bx, y - 10, bw * p, 5)
      }
    }

    const draw = () => {
      const W = view.w
      const H = view.h
      const lay = layout()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(lay.scene, lay.ox, lay.oy, lay.Wp * U, lay.Hp * U)

      // Estrellas parpadeantes pixeladas
      for (const st of stars) {
        const on = Math.sin(s.time * st.sp + st.ph) > -0.2
        if (!on) continue
        ctx.fillStyle = st.col
        ctx.fillRect(Math.round(st.x / U) * U, Math.round(st.y / U) * U, U, U)
      }

      drawGoal('L')
      drawGoal('R')
      drawNet(lay)

      for (const ln of s.lines) drawTramp(ln)
      if (s.drawing) {
        const d = s.drawing
        ctx.save()
        ctx.globalAlpha = 0.75
        ctx.lineCap = 'round'
        ctx.setLineDash([10, 8])
        ctx.strokeStyle = '#17102a'
        ctx.lineWidth = 9
        ctx.beginPath(); ctx.moveTo(d.a.x, d.a.y); ctx.lineTo(d.b.x, d.b.y); ctx.stroke()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 5
        ctx.beginPath(); ctx.moveTo(d.a.x, d.a.y); ctx.lineTo(d.b.x, d.b.y); ctx.stroke()
        ctx.restore()
      }

      for (const c of s.chars) drawCat(c)
      drawParticles(ctx, s.particles)
      drawFloaters(ctx, s.floaters, 1 / 60)

      // Tutorial inicial
      if (s.time < 5 && !s.over) {
        ctx.globalAlpha = Math.min(1, (5 - s.time) * 1.5)
        ctx.textAlign = 'center'
        ctx.font = '10px "Silkscreen", monospace'
        const cx = W / 2
        const cy = H * 0.5
        ctx.fillStyle = '#0b1230'
        ctx.fillRect(lay.wallL + 8, cy - 26, lay.wallR - lay.wallL - 16, 52)
        ctx.fillStyle = '#ffffff'
        ctx.fillText('DESLIZA PARA DIBUJAR', cx, cy - 8)
        ctx.fillText('UN TRAMPOLIN', cx, cy + 6)
        ctx.fillStyle = '#ffe14d'
        ctx.fillText('LLEVA A LOS GATOS A LA META', cx, cy + 20)
        ctx.globalAlpha = 1
      }

      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,56,100,${s.flash})`
        ctx.fillRect(0, 0, W, H)
      }
    }

    const stop = startLoop((dt) => { update(dt); draw() })
    return () => {
      stop()
      view.destroy()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [run])

  const retry = () => {
    setResult(null)
    setHud({ score: 0, lives: MAX_LIVES })
    setRun((r) => r + 1)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="flex shrink-0 items-center justify-between gap-2 px-3 py-2"
        style={{ background: 'linear-gradient(#0d1d45, #09142f)', borderBottom: '4px solid #04091c' }}
      >
        <button
          onClick={onExit}
          className="pixel-btn shrink-0 rounded-[4px] bg-white px-2 py-1.5 font-pixel text-[10px] text-[#1b0b3a]"
          style={{ border: '2px solid #04091c' }}
        >
          ◀ MENÚ
        </button>
        <div className="flex items-center gap-[3px]" aria-label={`Vidas: ${hud.lives}`}>
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <img
              key={i}
              src={HEAD_URI}
              alt=""
              draggable={false}
              className={i < hud.lives ? '' : 'opacity-25 grayscale'}
              style={{ width: 25, imageRendering: 'pixelated' }}
            />
          ))}
        </div>
        <div className="flex flex-col items-end font-pixel leading-none" style={{ color: '#fff', textShadow: OUT }}>
          <span className="text-[8px]">SCORE</span>
          <span className="mt-1 text-[16px] tabular-nums">{hud.score}</span>
        </div>
      </header>
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#0a1f4a]">
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />
        {result && (
          <GameOver
            reason="Se acabaron las vidas"
            score={result.score}
            best={result.best}
            isRecord={result.isRecord}
            coinsEarned={result.score}
            onRetry={retry}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  )
}
