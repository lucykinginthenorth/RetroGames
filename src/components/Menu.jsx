import { useRef, useState } from 'react'
import { GAMES } from '../games.js'
import { useCoins } from '../store.jsx'
import CoinPill from './CoinPill.jsx'

const SLOT = 112 // ancho de icono (96) + separación (16)
const BLUE = '#1f6fe5'
const INK = '#4a4a4a'

/* ---------- Portadas pixel / geométricas ---------- */
const px = { shapeRendering: 'crispEdges' }

function CoverTramp() {
  return (
    <svg viewBox="0 0 32 32" className="h-full w-full" style={px}>
      <rect width="32" height="32" fill="#6ec6ff" />
      {/* nubes */}
      <g fill="#fff">
        <rect x="3" y="5" width="8" height="3" /><rect x="5" y="3" width="4" height="2" /><rect x="2" y="7" width="10" height="2" />
        <rect x="21" y="9" width="8" height="3" /><rect x="23" y="7" width="4" height="2" /><rect x="20" y="11" width="10" height="2" />
      </g>
      {/* personaje con paracaídas */}
      <rect x="13" y="3" width="8" height="2" fill="#ff4d6d" /><rect x="12" y="5" width="10" height="2" fill="#ff4d6d" />
      <rect x="15" y="3" width="2" height="4" fill="#fff" />
      <rect x="13" y="7" width="1" height="4" fill="#fff" /><rect x="20" y="7" width="1" height="4" fill="#fff" />
      <rect x="14" y="11" width="6" height="5" fill="#ffd60a" /><rect x="13" y="12" width="8" height="3" fill="#ffd60a" />
      <rect x="15" y="12" width="1" height="2" fill="#1b0b3a" /><rect x="18" y="12" width="1" height="2" fill="#1b0b3a" />
      {/* trampolín con resortes */}
      <rect x="5" y="21" width="22" height="3" fill="#ff5ca8" />
      <rect x="5" y="21" width="22" height="1" fill="#ffd0e6" />
      <g fill="none" stroke="#3a3a3a" strokeWidth="1">
        <path d="M8 24 l2 2 l-2 2 l2 2" /><path d="M24 24 l-2 2 l2 2 l-2 2" />
      </g>
      <rect x="4" y="30" width="24" height="2" fill="#3a3a3a" />
    </svg>
  )
}

function Bomb({ x, y, body, hi }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="2" y="3" width="10" height="10" fill={body} />
      <rect x="1" y="5" width="12" height="6" fill={body} />
      <rect x="3" y="4" width="2" height="2" fill={hi} />
      <rect x="5" y="1" width="4" height="2" fill="#8d8d8d" />
      <rect x="7" y="-1" width="1" height="2" fill="#a0522d" />
      <rect x="8" y="-2" width="2" height="1" fill="#a0522d" />
      <rect x="9" y="-4" width="3" height="3" fill="#ffd60a" />
      <rect x="10" y="-3" width="1" height="1" fill="#ff4d6d" />
      <rect x="4" y="8" width="1" height="2" fill="#fff" /><rect x="9" y="8" width="1" height="2" fill="#fff" />
    </g>
  )
}

function CoverBombs() {
  return (
    <svg viewBox="0 0 32 32" className="h-full w-full" style={px}>
      <rect width="32" height="32" fill="#8fe3c7" />
      <rect x="0" y="0" width="7" height="32" fill="#22223b" />
      <rect x="25" y="0" width="7" height="32" fill="#ff5ca8" />
      <Bomb x={9} y={7} body="#22223b" hi="#6b6b8a" />
      <Bomb x={11} y={18} body="#ff5ca8" hi="#ffd0e6" />
      <g fill="#ffd60a"><rect x="19" y="24" width="2" height="2" /><rect x="3" y="26" width="2" height="2" opacity=".0" /></g>
    </svg>
  )
}

function CoverPoker() {
  return (
    <svg viewBox="0 0 32 32" className="h-full w-full" style={px}>
      <rect width="32" height="32" fill="#2e9d62" />
      {/* carta estrella */}
      <g transform="rotate(-14 11 17)">
        <rect x="3" y="7" width="15" height="21" fill="#fff" stroke="#3a3a3a" strokeWidth="1" />
        <polygon points="10.5,10 12.2,14.4 17,14.6 13.2,17.5 14.6,22 10.5,19.4 6.4,22 7.8,17.5 4,14.6 8.8,14.4" fill="#4361ee" />
      </g>
      {/* carta corona */}
      <g transform="rotate(12 21 16)">
        <rect x="14" y="5" width="15" height="21" fill="#fff" stroke="#3a3a3a" strokeWidth="1" />
        <polygon points="16.5,19 15.5,11 19,14 21.5,9.5 24,14 27.5,11 26.5,19" fill="#ffc93c" stroke="#b8860b" strokeWidth=".8" />
        <rect x="16.5" y="19" width="10" height="2" fill="#a66cff" />
      </g>
    </svg>
  )
}

const COVERS = { tramp: CoverTramp, bombs: CoverBombs, poker: CoverPoker }

/* ---------- Menú ---------- */
export default function Menu({ onPlay }) {
  const [sel, setSel] = useState(0)
  const { best } = useCoins()
  const drag = useRef(null)
  const moved = useRef(false)
  const game = GAMES[sel]
  const go = (i) => setSel(Math.max(0, Math.min(GAMES.length - 1, i)))

  const onDown = (e) => { drag.current = e.clientX; moved.current = false }
  const onUp = (e) => {
    if (drag.current == null) return
    const dx = e.clientX - drag.current
    drag.current = null
    if (Math.abs(dx) > 40) { moved.current = true; go(sel + (dx < 0 ? 1 : -1)) }
  }
  const tap = (i) => {
    if (moved.current) return
    if (i === sel) onPlay(GAMES[i].id)
    else go(i)
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col text-[#4a4a4a]"
      style={{
        backgroundColor: '#f1f1f1',
        backgroundImage: 'repeating-linear-gradient(to bottom, #e6e6e6 0 1px, transparent 1px 4px)',
      }}
    >
      {/* Monedas globales */}
      <div className="flex shrink-0 justify-end px-4 pt-3">
        <CoinPill />
      </div>

      {/* Globo de título */}
      <div className="flex min-h-0 flex-[1.3] flex-col px-4 pt-3">
        <div
          key={game.id}
          className="animate-pop-in flex flex-1 flex-col items-center justify-center rounded-xl border-[3px] border-[#9a9a9a] bg-white px-5 py-4 text-center"
        >
          <h2 className="text-[26px] leading-tight font-semibold text-[#3d3d3d]">{game.name}</h2>
          <p className="mt-2 font-pixel text-[11px] tracking-wider text-[#8a8a8a]">
            {game.id === 'poker' ? 'MEJOR GANANCIA' : 'RÉCORD'}: <span className="text-[#1f6fe5]">{best[game.id] || 0}</span>
          </p>
          <p className="mt-3 max-w-[18rem] text-[15px] leading-snug text-[#5a5a5a]">{game.desc}</p>
        </div>
        {/* Flecha del globo */}
        <div className="-mt-[3px] flex justify-center">
          <svg width="30" height="16" viewBox="0 0 30 16" aria-hidden="true">
            <polygon points="0,0 30,0 15,15" fill="#fff" />
            <polyline points="0,0 15,15 30,0" fill="none" stroke="#9a9a9a" strokeWidth="3" strokeLinejoin="miter" />
            <rect x="1.5" y="-1" width="27" height="4" fill="#fff" />
          </svg>
        </div>
      </div>

      {/* Carrusel */}
      <div
        className="relative h-[178px] shrink-0 touch-pan-y overflow-hidden"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => (drag.current = null)}
      >
        <div
          className="absolute top-3 left-1/2 flex gap-4 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${-(sel + 0.5) * SLOT + 8}px)` }}
        >
          {GAMES.map((g, i) => {
            const Cover = COVERS[g.id]
            const active = i === sel
            return (
              <div key={g.id} className="relative flex w-24 flex-col items-center">
                <button
                  onClick={() => tap(i)}
                  aria-label={active ? `Jugar ${g.name}` : g.name}
                  className={`relative block h-24 w-24 rounded-xl border-2 p-2 transition-transform duration-300 ${
                    active
                      ? 'scale-[1.12] border-[#1f6fe5] bg-[#1f6fe5] pb-2 shadow-[0_5px_0_#0e3f8f]'
                      : 'border-[#b4b4b4] bg-white opacity-95 shadow-[0_5px_0_#b4b4b4]'
                  }`}
                >
                  <span
                    className={`block h-full w-full overflow-hidden rounded-md border-2 ${
                      active ? 'border-white' : 'border-[#d2d2d2]'
                    }`}
                  >
                    <Cover />
                  </span>
                </button>
                {active && (
                  <button
                    onClick={() => onPlay(g.id)}
                    className="animate-pop-in absolute top-[104px] z-10 w-[104px] rounded-b-lg border-2 border-t-0 border-[#0e3f8f] bg-[#1f6fe5] py-1 font-pixel text-[13px] font-bold tracking-widest text-white shadow-[0_4px_0_#0e3f8f] active:translate-y-0.5"
                  >
                    JUGAR
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1" />

      {/* Barra inferior de navegación */}
      <div className="flex shrink-0 items-center gap-2 border-t-2 border-[#a8a8a8] bg-[#d6d6d6] px-2 py-3">
        <button
          onClick={() => go(sel - 1)}
          disabled={sel === 0}
          aria-label="Anterior"
          className="grid h-11 w-9 place-items-center rounded-md bg-[#eaeaea] shadow-[0_3px_0_#a8a8a8] disabled:opacity-40"
        >
          <svg width="16" height="20" viewBox="0 0 16 20"><polygon points="14,2 3,10 14,18" fill={BLUE} /></svg>
        </button>

        <div className="relative flex h-9 flex-1 items-center rounded-md border-2 border-[#a8a8a8] bg-[#f4f4f4] px-1.5">
          <div className="grid w-full grid-cols-3 gap-1.5">
            {GAMES.map((g, i) => (
              <button
                key={g.id}
                onClick={() => go(i)}
                aria-label={g.name}
                className="h-4 rounded-sm bg-[#bdbdbd]"
              />
            ))}
          </div>
          {/* Indicador deslizante */}
          <div
            className="pointer-events-none absolute top-[3px] bottom-[3px] rounded-sm border-[3px] transition-[left] duration-300 ease-out"
            style={{
              borderColor: BLUE,
              background: '#ffffffaa',
              width: 'calc((100% - 12px - 12px) / 3 + 6px)',
              left: `calc(6px - 3px + ${sel} * ((100% - 12px - 12px) / 3 + 6px))`,
            }}
          />
        </div>

        <button
          onClick={() => go(sel + 1)}
          disabled={sel === GAMES.length - 1}
          aria-label="Siguiente"
          className="grid h-11 w-9 place-items-center rounded-md bg-[#eaeaea] shadow-[0_3px_0_#a8a8a8] disabled:opacity-40"
        >
          <svg width="16" height="20" viewBox="0 0 16 20"><polygon points="2,2 13,10 2,18" fill={BLUE} /></svg>
        </button>
      </div>
    </div>
  )
}
