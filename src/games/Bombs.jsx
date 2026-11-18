import { useEffect, useRef, useState } from 'react'
import { useCoins } from '../store.jsx'
import GameOver from '../components/GameOver.jsx'
import {
  burst, clamp, drawFloaters, drawParticles, localPoint, rand, setupCanvas, startLoop, updateParticles,
} from '../lib/canvas.js'
import { FR, GATE_H, GATE_W, U, buildArena, getBombSprites, zoneUnits } from '../lib/bombArt.js'

const FUSE = 8 // segundos de mecha
const R = 19
const MAX_SORTED_PER_ZONE = 10
const PINK = '#ff5ca8'

// Zona izquierda = ROSAS, zona derecha = NEGRAS (como en la arena de referencia)

function Rivet({ className }) {
  return (
    <span
      className={`absolute h-[6px] w-[6px] rounded-full ${className}`}
      style={{ background: 'radial-gradient(circle at 30% 30%, #f1f3f5, #6b7078)', boxShadow: '0 0 0 1px #3a3f46' }}
    />
  )
}

function Lcd({ label, value, color }) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center rounded-[4px] px-1 py-[3px]"
      style={{ background: '#7b818a', border: '2px solid #3a3f46', boxShadow: 'inset 1px 1px 0 #c9ced4' }}
    >
      <span className="font-pixel text-[8px] leading-none text-[#1d2128]">{label}</span>
      <span
        className="mt-[3px] w-full rounded-[2px] text-center font-pixel text-[14px] leading-[18px] tabular-nums"
        style={{ background: '#0f2417', color, boxShadow: 'inset 0 0 0 2px #050d08', textShadow: `0 0 4px ${color}` }}
      >
        {String(value).padStart(3, '0')}
      </span>
    </div>
  )
}

export default function Bombs({ onExit }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [score, setScore] = useState(0)
  const [result, setResult] = useState(null)
  const [run, setRun] = useState(0)
  const { addCoins, reportBest, best } = useCoins()
  const ext = useRef({})
  ext.current = { addCoins, reportBest, best: best.bombs || 0 }

  useEffect(() => {
    const canvas = canvasRef.current
    const view = setupCanvas(canvas, wrapRef.current)
    const ctx = view.ctx
    const spr = getBombSprites()
    const s = {
      bombs: [], particles: [], floaters: [], drags: new Map(),
      score: 0, spawnT: 0.3, time: 0, boom: null, ended: false, shake: 0, nextId: 1,
      gate: { top: 0, bot: 0 },
    }

    // ---------- Geometría ----------
    let L = null
    const layout = () => {
      const key = view.w + 'x' + view.h
      if (L && L.key === key) return L
      const zwU = zoneUnits(view.w)
      const Wp = Math.ceil(view.w / U)
      const Hp = Math.ceil(view.h / U)
      const arena = buildArena(Wp, Hp, zwU)
      L = {
        key, zwU, zw: zwU * U, Wp, Hp, arena,
        ox: (view.w - Wp * U) / 2, oy: (view.h - Hp * U) / 2,
      }
      return L
    }
    const arenaBounds = () => {
      const { zw } = layout()
      return { x0: zw + R + 2, x1: view.w - zw - R - 2, y0: GATE_H * U + R - 6, y1: view.h - GATE_H * U - R + 6 }
    }
    const zoneBounds = (color) => {
      const { zw } = layout()
      const f = FR * U
      const y0 = f + R + 16
      const y1 = view.h - f - R
      return color === 'pink'
        ? { x0: f + R, x1: zw - f - R, y0, y1 }
        : { x0: view.w - zw + f + R, x1: view.w - f - R, y0, y1 }
    }

    const spawn = () => {
      const a = arenaBounds()
      const top = Math.random() < 0.5
      s.gate[top ? 'top' : 'bot'] = 1
      const gw = (GATE_W * U) / 2 - R
      s.bombs.push({
        id: s.nextId++,
        x: clamp(view.w / 2 + rand(-gw, gw), a.x0, a.x1),
        y: top ? a.y0 : a.y1,
        vx: 0, vy: top ? 45 : -45, dirT: 0.9,
        color: Math.random() < 0.5 ? 'black' : 'pink',
        fuse: FUSE,
        state: 'walk',
        born: s.time,
        anim: rand(0, 6),
      })
    }

    const explode = (b, reason) => {
      if (s.boom) return
      s.boom = { x: b.x, y: b.y, t: 0, reason }
      s.shake = 0.5
      b.dead = true
      for (const d of s.drags.values()) d.b.state = 'walk'
      s.drags.clear()
      burst(s.particles, b.x, b.y, ['#ffd60a', '#ff9f1c', '#ff4d6d', '#ffffff'], 40, 420)
    }

    const finish = () => {
      const { addCoins: add, reportBest: rep, best: prev } = ext.current
      add(s.score)
      rep('bombs', s.score)
      setResult({ score: s.score, reason: s.boom.reason, best: Math.max(prev, s.score), isRecord: s.score > prev })
    }

    const sortBomb = (b) => {
      b.state = 'sorted'
      b.vx = 0; b.vy = 0; b.dirT = 0
      s.score += 1
      setScore(s.score)
      s.floaters.push({ x: b.x, y: b.y - R, t: 0, text: '+1', color: b.color === 'pink' ? PINK : '#ffffff' })
      burst(s.particles, b.x, b.y, b.color === 'pink' ? [PINK, '#fff'] : ['#ffffff', '#9a8c98'], 10, 160)
      // Evita que los corralitos se llenen demasiado
      const sorted = s.bombs.filter((o) => o.state === 'sorted' && o.color === b.color)
      if (sorted.length > MAX_SORTED_PER_ZONE) sorted[0].dead = true
    }

    // ---------- Arrastre multitáctil ----------
    const onDown = (e) => {
      if (s.boom) return
      const p = localPoint(canvas, e)
      let pick = null
      let bestD = R * 1.9
      for (const b of s.bombs) {
        if (b.state !== 'walk') continue
        const d = Math.hypot(b.x - p.x, b.y - p.y)
        if (d < bestD) { bestD = d; pick = b }
      }
      if (!pick) return
      try { canvas.setPointerCapture(e.pointerId) } catch { /* puntero sintético */ }
      pick.state = 'drag'
      s.drags.set(e.pointerId, { b: pick, ox: pick.x - p.x, oy: pick.y - p.y, tx: pick.x, ty: pick.y })
    }
    const onMove = (e) => {
      const d = s.drags.get(e.pointerId)
      if (!d) return
      const p = localPoint(canvas, e)
      d.tx = clamp(p.x + d.ox, R, view.w - R)
      d.ty = clamp(p.y + d.oy, R, view.h - R)
    }
    const onUp = (e) => {
      onMove(e) // usa también la posición final del dedo
      const d = s.drags.get(e.pointerId)
      if (!d) return
      s.drags.delete(e.pointerId)
      const b = d.b
      if (s.boom || b.dead) return
      b.x = d.tx
      b.y = d.ty
      const { zw } = layout()
      const zone = b.x < zw ? 'pink' : b.x > view.w - zw ? 'black' : null
      if (!zone) {
        b.state = 'walk'
        const a = arenaBounds()
        b.x = clamp(b.x, a.x0, a.x1)
        b.y = clamp(b.y, a.y0, a.y1)
        return
      }
      if (zone !== b.color) {
        explode(b, '¡Bomba en la zona equivocada!')
        return
      }
      const zb = zoneBounds(zone)
      b.x = clamp(b.x, zb.x0, zb.x1)
      b.y = clamp(b.y, zb.y0, zb.y1)
      sortBomb(b)
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)

    // ---------- Lógica ----------
    const update = (dt) => {
      s.time += dt
      s.shake = Math.max(0, s.shake - dt)
      s.gate.top = Math.max(0, s.gate.top - dt * 1.6)
      s.gate.bot = Math.max(0, s.gate.bot - dt * 1.6)
      updateParticles(s.particles, dt, 300)
      if (s.boom) {
        s.boom.t += dt
        if (s.boom.t > 1.2 && !s.ended) { s.ended = true; finish() }
        return
      }

      s.spawnT -= dt
      if (s.spawnT <= 0) {
        spawn()
        s.spawnT = Math.max(0.5, 2.2 - s.score * 0.065) * rand(0.8, 1.2)
      }

      const k = clamp(view.w / 400, 0.7, 1.4)
      const speed = Math.min(100, 30 + s.score * 1.6) * k
      const follow = 1 - Math.exp(-dt * 20)
      for (const b of s.bombs) {
        b.anim += dt
        if (b.state === 'walk' || b.state === 'drag') {
          b.fuse -= dt
          if (b.fuse <= 0) { explode(b, '¡Se acabó la mecha!'); return }
        }
        if (b.state === 'drag') {
          for (const d of s.drags.values()) {
            if (d.b === b) { b.x += (d.tx - b.x) * follow; b.y += (d.ty - b.y) * follow }
          }
          continue
        }
        b.dirT -= dt
        if (b.dirT <= 0) {
          const ang = Math.random() * Math.PI * 2
          const sp = b.state === 'sorted' ? speed * 0.3 : speed * rand(0.6, 1.2)
          b.vx = Math.cos(ang) * sp
          b.vy = Math.sin(ang) * sp
          b.dirT = rand(0.7, 2)
        }
        b.x += b.vx * dt
        b.y += b.vy * dt
        const bd = b.state === 'sorted' ? zoneBounds(b.color) : arenaBounds()
        if (b.x < bd.x0) { b.x = bd.x0; b.vx = Math.abs(b.vx) }
        if (b.x > bd.x1) { b.x = bd.x1; b.vx = -Math.abs(b.vx) }
        if (b.y < bd.y0) { b.y = bd.y0; b.vy = Math.abs(b.vy) }
        if (b.y > bd.y1) { b.y = bd.y1; b.vy = -Math.abs(b.vy) }
      }
      s.bombs = s.bombs.filter((b) => !b.dead)
    }

    // ---------- Dibujo ----------
    const text = (str, x, y, col, size = 9) => {
      ctx.font = `${size}px "Silkscreen", monospace`
      ctx.textAlign = 'center'
      ctx.fillStyle = '#0b0b10'
      ctx.fillText(str, x + 1, y + 1)
      ctx.fillStyle = col
      ctx.fillText(str, x, y)
    }

    const drawBomb = (b) => {
      const sorted = b.state === 'sorted'
      const dragging = b.state === 'drag'
      const pop = Math.min(1, (s.time - b.born) * 5)
      const sc = pop * (dragging ? 1.15 : 1)
      const f = clamp(b.fuse / FUSE, 0, 1)
      const lowFuse = !sorted && b.fuse < 3
      const flashOn = lowFuse && Math.floor(b.fuse * (b.fuse < 1.5 ? 10 : 5)) % 2 === 0
      const moving = dragging || Math.hypot(b.vx, b.vy) > 1
      const step = moving ? Math.floor(b.anim * (dragging ? 14 : 9)) % 2 : 0
      const lift = dragging ? 12 : 0

      // Sombra suave bajo la bomba
      ctx.fillStyle = dragging ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.ellipse(b.x, b.y + 16 + (dragging ? 2 : 0), 16 * (dragging ? 0.85 : 1), 5, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.save()
      ctx.translate(b.x, b.y - lift)
      ctx.scale(sc, sc)
      const r = (ux, uy, w, h, col) => {
        ctx.fillStyle = col
        ctx.fillRect((ux - 8) * U, (uy - 10) * U, w * U, h * U)
      }
      const bob = !dragging && step ? -1 : 0 // rebote al caminar
      // Patitas
      for (const [fx, odd] of [[4, 0], [9, 1]]) {
        const up = step === odd ? -1 : 0
        r(fx, 15 + up, 4, 3, '#1a1030')
        r(fx + 1, 15 + up, 3, 2, '#ffb703')
        r(fx + 1, 15 + up, 1, 1, '#ffe27a')
      }
      // Cuerpo
      ctx.drawImage(flashOn ? spr.flash : spr[b.color], -8 * U, (-10 + bob) * U, 16 * U, 18 * U)
      // Mecha blanca (se acorta con el tiempo)
      const n = sorted ? 2 : 2 + Math.round(f * 5)
      let tip = 7
      for (let i = 0; i < n; i++) {
        const xo = i % 4 >= 2 ? 1 : 0
        const y = bob - 1 - i
        r(7 + xo, y, 3, 1, '#1a1030')
        r(8 + xo, y, 1, 1, '#ffffff')
        tip = 8 + xo
      }
      // Chispa animada: parpadea más rápido cuanto menos tiempo queda
      if (!sorted) {
        const period = 0.06 + 0.3 * f
        const phase = Math.floor(s.time / period)
        if (phase % 3 !== 0) {
          const cy = bob - 1 - n
          if (phase % 2) {
            r(tip, cy - 1, 1, 3, '#ffd60a'); r(tip - 1, cy, 3, 1, '#ffd60a'); r(tip, cy, 1, 1, '#ffffff')
          } else {
            r(tip - 1, cy - 1, 1, 1, '#ff9f1c'); r(tip + 1, cy - 1, 1, 1, '#ff9f1c')
            r(tip - 1, cy + 1, 1, 1, '#ff4d6d'); r(tip + 1, cy + 1, 1, 1, '#ff4d6d'); r(tip, cy, 1, 1, '#ffffff')
          }
        }
      }
      ctx.restore()

      if (lowFuse) text(String(Math.ceil(b.fuse)), b.x, b.y - lift - R - 26, '#ff4d6d', 12)
    }

    const draw = () => {
      const W = view.w
      const H = view.h
      const lay = layout()
      ctx.imageSmoothingEnabled = false
      ctx.save()
      if (s.shake > 0) ctx.translate(rand(-8, 8) * s.shake * 2, rand(-8, 8) * s.shake * 2)

      ctx.drawImage(lay.arena.canvas, lay.ox, lay.oy, lay.Wp * U, lay.Hp * U)

      // Luz de compuertas al soltar una bomba nueva
      const gx = lay.ox + lay.arena.gx0 * U
      for (const [key, y] of [['top', lay.oy], ['bot', lay.oy + (lay.Hp - GATE_H + 2) * U]]) {
        const a = s.gate[key]
        if (a <= 0) continue
        ctx.fillStyle = `rgba(255,224,102,${0.85 * a})`
        ctx.fillRect(gx, y, GATE_W * U, (GATE_H - 2) * U)
      }

      text('ROSAS', lay.zw / 2, FR * U + 13, '#ffe0ef')
      text('NEGRAS', W - lay.zw / 2, FR * U + 13, '#e4e6ee')

      // Primero las clasificadas, luego las que caminan, al final las arrastradas
      const order = { sorted: 0, walk: 1, drag: 2 }
      const list = s.bombs.filter((b) => !b.dead).sort((a, b) => order[a.state] - order[b.state] || a.y - b.y)
      for (const b of list) drawBomb(b)

      if (s.boom) {
        const t = s.boom.t
        for (let i = 0; i < 3; i++) {
          const rr = t * 500 - i * 40
          if (rr <= 0) continue
          ctx.globalAlpha = Math.max(0, 1 - t / 1.2)
          ctx.fillStyle = ['#ffffff', '#ffd60a', '#ff4d6d'][i]
          ctx.beginPath(); ctx.arc(s.boom.x, s.boom.y, rr, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 1
      }
      drawParticles(ctx, s.particles)
      drawFloaters(ctx, s.floaters, 1 / 60)

      if (s.time < 4 && !s.boom) {
        ctx.globalAlpha = Math.min(1, (4 - s.time) * 1.5)
        ctx.fillStyle = '#14161b'
        ctx.fillRect(lay.zw + 8, H / 2 - 24, W - lay.zw * 2 - 16, 44)
        ctx.strokeStyle = '#f5c518'
        ctx.lineWidth = 2
        ctx.strokeRect(lay.zw + 9, H / 2 - 23, W - lay.zw * 2 - 18, 42)
        text('ARRASTRA CADA', W / 2, H / 2 - 5, '#ffffff')
        text('BOMBA A SU COLOR', W / 2, H / 2 + 11, '#ffffff')
        ctx.globalAlpha = 1
      }
      ctx.restore()
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
    setScore(0)
    setRun((r) => r + 1)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="relative flex shrink-0 items-stretch gap-2 px-3 py-2"
        style={{
          background: 'linear-gradient(#b7bdc5, #8d939b)',
          borderBottom: '4px solid #3a3f46',
          boxShadow: 'inset 0 2px 0 #dde1e6',
        }}
      >
        <Rivet className="left-[3px] top-[3px]" />
        <Rivet className="right-[3px] top-[3px]" />
        <Rivet className="bottom-[3px] left-[3px]" />
        <Rivet className="bottom-[3px] right-[3px]" />
        <button
          onClick={onExit}
          className="pixel-btn shrink-0 rounded-[4px] px-2 font-pixel text-[10px] text-[#1d2128]"
          style={{ background: 'linear-gradient(#f5c518, #d9a400)', border: '2px solid #3a3f46', boxShadow: 'inset 1px 1px 0 #fff0a3' }}
        >
          ◀ MENÚ
        </button>
        <Lcd label="PUNTOS" value={score} color="#7dff9a" />
        <Lcd label="RÉCORD" value={Math.max(best.bombs || 0, score)} color="#ffd166" />
      </header>
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#92989f]">
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />
        {result && (
          <GameOver
            reason={result.reason}
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
