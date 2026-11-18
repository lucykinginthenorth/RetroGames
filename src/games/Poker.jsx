import { useEffect, useRef, useState } from 'react'
import { useCoins } from '../store.jsx'
import { HANDS, compare, cpuKeepIds, evaluate, newDeck } from '../lib/poker.js'
import { PixelCoin, Sym } from '../lib/symbols.jsx'
import { ART } from '../lib/dealerArt.js'

const PLACEHOLDER = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, sym: 0 }))
const MAX_BET = 20
const CARD_FACE = '#dff2fe'
let uidSeq = 0
const fresh = (c) => ({ ...c, uid: ++uidSeq, fresh: true })

const OUT = {
  textShadow: '-2px 0 #000,2px 0 #000,0 -2px #000,0 2px #000,-2px -2px #000,2px 2px #000,-2px 2px #000,2px -2px #000',
}
const HAND_LABEL = {
  Nada: 'NADA', Par: '1 PAR', 'Doble Par': '2 PARES', Tercia: 'TERCIA',
  'Full House': 'FULL HOUSE', 'Póker': 'PÓKER', Quintilla: 'QUINTILLA',
}

/* ---------- Escena del crupier (capas pixel-art animadas) ---------- */
const layer = 'pointer-events-none absolute inset-0 h-full w-full'
const pix = { imageRendering: 'pixelated' }

function DealerScene({ mood, blink, throwKey }) {
  const eyes = mood === 'confident' ? ART.eyes.happy : mood === 'nervous' ? ART.eyes.wide : blink ? ART.eyes.closed : ART.eyes.open
  const mouth = mood === 'confident' ? ART.mouth.smile : mood === 'nervous' ? ART.mouth.nervous : ART.mouth.neutral
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b0628]">
      <div className="absolute bottom-0 left-1/2 aspect-[120/112] w-full -translate-x-1/2">
        <img src={ART.bg} alt="" draggable={false} className={layer} style={pix} />
        <div className={`${layer} animate-breathe`}>
          <img src={ART.body} alt="" draggable={false} className={layer} style={pix} />
        </div>
        <img src={ART.table} alt="" draggable={false} className={layer} style={pix} />

        {/* manos enguantadas: lanzan cartas al repartir */}
        <div key={`r${throwKey}`} className={`${layer} ${throwKey ? 'animate-throw-r' : ''}`}>
          <img src={ART.handR} alt="" draggable={false} className={layer} style={pix} />
        </div>
        <div key={`l${throwKey}`} className={`${layer} ${throwKey ? 'animate-throw-l' : ''}`}>
          <img src={ART.handL} alt="" draggable={false} className={layer} style={pix} />
        </div>

        {/* cabeza con expresiones */}
        <div className={`${layer} animate-bob`}>
          <img src={ART.head} alt="" draggable={false} className={layer} style={pix} />
          <img src={eyes} alt="" draggable={false} className={layer} style={pix} />
          <img src={mouth} alt="" draggable={false} className={layer} style={pix} />
          {mood === 'nervous' && <img src={ART.sweat} alt="" draggable={false} className={`${layer} animate-sweat`} style={pix} />}
        </div>

        {/* cartas voladoras */}
        {throwKey > 0 &&
          [0, 1, 2, 3].map((i) => (
            <span
              key={`${throwKey}-${i}`}
              className="animate-cardfly pointer-events-none absolute z-10 block aspect-[5/7] w-[5%] rounded-[2px] border border-black"
              style={{
                left: i % 2 ? '30%' : '64%',
                top: '80%',
                background: 'repeating-linear-gradient(45deg,#d6283f 0 2px,#a81d31 2px 4px)',
                animationDelay: `${i * 90}ms`,
                '--fx': `${(i % 2 ? 1 : -1) * (20 + i * 10)}px`,
                '--fr': `${(i % 2 ? 1 : -1) * 160}deg`,
              }}
            />
          ))}
      </div>
    </div>
  )
}

/* ---------- Tabla de multiplicadores (con los sprites nuevos) ---------- */
const MULT_ROWS = [
  { n: 16, pat: 'AAAAA' }, { n: 8, pat: 'AAAAx' }, { n: 6, pat: 'AAABB' },
  { n: 4, pat: 'AAAxx' }, { n: 3, pat: 'AABBx' }, { n: 2, pat: 'AAxxx' },
]
const MINI = { A: 5, B: 4, x: 0 }

function MultTable() {
  return (
    <div className="pointer-events-none absolute top-2 left-2 z-10 flex flex-col gap-[2px]">
      {MULT_ROWS.map((r) => (
        <div key={r.n} className="flex items-center gap-1">
          <span className="w-7 text-right font-pixel text-[15px] leading-none font-bold text-white" style={OUT}>{r.n}</span>
          <span className="flex">
            {r.pat.split('').map((ch, i) => (
              <Sym key={i} i={MINI[ch]} className="h-[17px] w-[17px]" style={ch === 'x' ? { opacity: 0.4, filter: 'grayscale(1)' } : undefined} />
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------- Carta ---------- */
function Card({ card, faceDown, selected, highlight, onClick, delay = 0, row, index }) {
  // Las cartas del jugador llegan boca abajo desde las manos del gato y se voltean
  const [ready, setReady] = useState(!(card.fresh && row === 'player'))
  useEffect(() => {
    if (ready) return undefined
    const t = setTimeout(() => setReady(true), delay + 560)
    return () => clearTimeout(t)
  }, [ready, delay])
  const down = faceDown || !ready

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={down ? 'Carta oculta' : `Carta ${card.sym + 1}`}
      className={`flip relative aspect-[5/7] w-full transition-transform duration-150 ${selected ? '-translate-y-3' : ''} ${
        card.fresh ? 'animate-slide' : ''
      }`}
      style={{
        animationDelay: `${delay}ms`,
        cursor: onClick ? 'pointer' : 'default',
        '--dx': `${(2 - index) * 62}px`,
        '--dy': `${row === 'cpu' ? -95 : -270}px`,
        '--rot': `${(index - 2) * -14}deg`,
      }}
    >
      <div className={`flip-inner ${down ? 'down' : ''}`}>
        <div
          className="flip-face grid place-items-center border-[3px] border-black"
          style={{
            borderRadius: 8,
            background: `linear-gradient(160deg, #f4fbff, ${CARD_FACE} 55%, #c6e4f7)`,
            boxShadow: highlight ? '0 0 0 3px #ffd23f, 0 0 14px #ffd23f' : '0 3px 0 #0006',
          }}
        >
          <Sym i={card.sym} className="h-[72%] w-[80%]" />
        </div>
        <div
          className="flip-back border-[3px] border-black"
          style={{
            borderRadius: 8,
            background: 'repeating-linear-gradient(45deg,#d6283f 0 5px,#a81d31 5px 10px)',
            boxShadow: 'inset 0 0 0 3px #fff',
          }}
        />
      </div>
    </button>
  )
}

/* ---------- Juego ---------- */
export default function Poker({ onExit }) {
  const { coins, addCoins, reportBest } = useCoins()
  const [phase, setPhase] = useState('bet') // bet → draw → reveal
  const [bet, setBet] = useState(5)
  const [stake, setStake] = useState(0)
  const [deck, setDeck] = useState([])
  const [player, setPlayer] = useState(PLACEHOLDER)
  const [cpu, setCpu] = useState(PLACEHOLDER)
  const [sel, setSel] = useState(() => new Set())
  const [cpuRevealed, setCpuRevealed] = useState(false)
  const [result, setResult] = useState(null)
  const [blink, setBlink] = useState(false)
  const [throwKey, setThrowKey] = useState(0)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  // El gato parpadea cada cierto tiempo
  useEffect(() => {
    let t
    let t2
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true)
        t2 = setTimeout(() => setBlink(false), 140)
        loop()
      }, 2200 + Math.random() * 2800)
    }
    loop()
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [])

  const dealt = phase !== 'bet' || !!result
  const maxBet = Math.min(MAX_BET, coins)
  const shownBet = Math.max(1, Math.min(bet, maxBet))

  const deal = () => {
    if (coins < 1) { addCoins(10); return }
    const b = shownBet
    addCoins(-b)
    setStake(b)
    const d = newDeck()
    setPlayer(d.splice(0, 5).sort((a, c) => a.sym - c.sym).map(fresh))
    setCpu(d.splice(0, 5).map(fresh))
    setDeck(d)
    setSel(new Set())
    setCpuRevealed(false)
    setResult(null)
    setPhase('draw')
    setThrowKey((k) => k + 1)
  }

  const toggle = (id) => {
    if (phase !== 'draw') return
    setSel((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const draw = () => {
    const d = [...deck]
    const np = player.map((c) => (sel.has(c.id) ? fresh(d.shift()) : { ...c, fresh: false }))
    const keep = cpuKeepIds(cpu)
    const nc = cpu.map((c) => (keep.has(c.id) ? { ...c, fresh: false } : fresh(d.shift())))
    setPlayer(np)
    setCpu(nc)
    setDeck(d)
    setSel(new Set())
    setPhase('reveal')
    setThrowKey((k) => k + 1)

    const pe = evaluate(np)
    const ce = evaluate(nc)
    const cmp = compare(pe, ce)
    const outcome = cmp > 0 ? 'win' : cmp < 0 ? 'lose' : 'tie'
    const payout = outcome === 'win' ? stake * HANDS[pe.rank].mult : outcome === 'tie' ? stake : 0

    later(() => setCpuRevealed(true), 1100)
    later(() => {
      setResult({ outcome, payout, pe, ce })
      addCoins(payout)
      if (outcome === 'win') reportBest('poker', payout - stake)
      setPhase('bet')
    }, 1900)
  }

  const inCombo = (ev) => (c) => !!ev && ev.rank > 0 && ev.counts[c.sym] >= 2
  const playerEval = dealt && player[0].id !== 'p0' ? evaluate(player) : null
  const pill = result && {
    win: ['¡GANASTE!', '#80ed99'],
    lose: ['GANA EL CRUPIER', '#ff6b81'],
    tie: ['EMPATE', '#ffd23f'],
  }[result.outcome]

  // Expresión del gato: nervioso si sacas Tercia o mejor, o si ganas; confiado si gana él
  let mood = 'idle'
  if (result) mood = result.outcome === 'win' ? 'nervous' : result.outcome === 'lose' ? 'confident' : 'idle'
  else if ((phase === 'draw' || phase === 'reveal') && playerEval && playerEval.rank >= 3) mood = 'nervous'

  const actionLabel =
    phase === 'draw' ? (sel.size ? `CAMBIAR ${sel.size}` : 'MANTENER') : phase === 'reveal' ? '...' : coins < 1 ? '+10 GRATIS' : 'REPARTIR'
  const actionColor = phase === 'draw' ? (sel.size ? '#ff9f1c' : '#4cc9f0') : '#80ed99'

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-black">
      {/* ===== Mitad superior: escena del crupier ===== */}
      <section className="relative h-[43%] shrink-0 overflow-hidden border-b-4 border-black">
        <DealerScene mood={mood} blink={blink} throwKey={throwKey} />
        <MultTable />
        <button
          onClick={onExit}
          className="pixel-btn absolute top-2 right-2 z-10 rounded-md border-2 border-black bg-white px-2 py-1.5 font-pixel text-[10px] font-bold text-black"
        >
          ◀ MENÚ
        </button>
        {pill && (
          <div
            key={result.outcome + result.payout}
            className="animate-pop-in absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg border-[3px] border-black px-3 py-1.5 text-center font-pixel text-[11px] font-bold whitespace-nowrap text-black"
            style={{ background: pill[1] }}
          >
            {pill[0]}
            {result.outcome !== 'lose' && ` +${result.payout}`}
          </div>
        )}
      </section>

      {/* ===== Mitad inferior: tapete ===== */}
      <section
        className="relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden px-3 pt-2 pb-3"
        style={{
          backgroundColor: '#1f8f4e',
          backgroundImage:
            'radial-gradient(#00000014 1px, transparent 1.5px), radial-gradient(#ffffff0d 1px, transparent 1.5px)',
          backgroundSize: '6px 6px, 6px 6px',
          backgroundPosition: '0 0, 3px 3px',
        }}
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-[44%] -translate-y-1/2 -rotate-6 text-center font-serif text-[34px] leading-none font-bold tracking-wider text-white/10 italic"
          aria-hidden="true"
        >
          Arcade Póker
        </span>

        {/* Monedas, apuesta y acción */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <PixelCoin className="h-7 w-7" />
            <span key={coins} className="animate-bump min-w-[2ch] font-pixel text-[20px] leading-none font-bold text-white tabular-nums" style={OUT}>
              {coins}
            </span>
          </div>
          <div className={`flex items-center gap-1 ${phase === 'bet' ? '' : 'opacity-60'}`}>
            <button
              disabled={phase !== 'bet'}
              onClick={() => setBet(Math.max(1, shownBet - (shownBet > 10 ? 5 : 1)))}
              aria-label="Apostar menos"
              className="pixel-btn h-9 w-8 rounded-md border-2 border-black bg-[#e9e9e9] font-pixel text-base leading-none font-bold text-black"
            >
              −
            </button>
            <div className="min-w-[3.6rem] rounded-md border-2 border-black bg-[#101820] px-1 py-0.5 text-center leading-none">
              <div className="font-pixel text-[7px] text-[#9ad7f5]">APUESTA</div>
              <div className="mt-0.5 font-pixel text-[13px] font-bold text-[#ffd23f]">{phase === 'bet' ? shownBet : stake}</div>
            </div>
            <button
              disabled={phase !== 'bet'}
              onClick={() => setBet(Math.min(maxBet, shownBet + (shownBet >= 10 ? 5 : 1)))}
              aria-label="Apostar más"
              className="pixel-btn h-9 w-8 rounded-md border-2 border-black bg-[#ffd23f] font-pixel text-base leading-none font-bold text-black"
            >
              +
            </button>
          </div>
          <button
            disabled={phase === 'reveal'}
            onClick={phase === 'draw' ? draw : deal}
            className="pixel-btn ml-auto h-10 min-w-[6.4rem] rounded-md border-[3px] border-black px-2 font-pixel text-[11px] font-bold whitespace-nowrap text-black"
            style={{ background: actionColor }}
          >
            {actionLabel}
          </button>
        </div>

        {/* Cartas del crupier */}
        <div className="relative z-10 grid grid-cols-5 gap-1.5 px-1">
          {cpu.map((c, i) => (
            <Card
              key={c.uid ?? c.id}
              card={c}
              row="cpu"
              index={i}
              faceDown={!cpuRevealed}
              delay={c.fresh ? i * 70 : 0}
              highlight={cpuRevealed && inCombo(result?.ce)(c)}
            />
          ))}
        </div>

        {/* Mano actual */}
        <div className="relative z-10 flex h-[46px] flex-col items-center justify-center text-center">
          {result && cpuRevealed ? (
            <span className="font-pixel text-[9px] font-bold text-white" style={OUT}>
              CRUPIER: {HAND_LABEL[result.ce.name]}
            </span>
          ) : phase === 'draw' ? (
            <span className="font-pixel text-[8px] font-bold text-white/80">TOCA LAS CARTAS A CAMBIAR</span>
          ) : null}
          <span className="font-pixel text-[26px] leading-none font-bold tracking-wide text-[#27e3ff]" style={OUT}>
            {playerEval ? HAND_LABEL[playerEval.name] : phase === 'bet' ? 'APUESTA' : ''}
          </span>
        </div>

        {/* Tus cartas + jerarquía de símbolos */}
        <div className="relative z-10 flex items-end gap-2">
          <div className="flex w-[32px] shrink-0 flex-col gap-[2px] rounded-md border-2 border-black bg-[#101820] p-[2px]" aria-label="Jerarquía: de mayor (arriba) a menor (abajo)">
            {[5, 4, 3, 2, 1, 0].map((i) => (
              <span key={i} className="grid h-[25px] place-items-center rounded-[3px]" style={{ background: CARD_FACE }}>
                <Sym i={i} className="h-[22px] w-[22px]" />
              </span>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-5 gap-1.5 pt-3 pr-1">
            {player.map((c, i) => (
              <Card
                key={c.uid ?? c.id}
                card={c}
                row="player"
                index={i}
                faceDown={!dealt}
                selected={sel.has(c.id)}
                onClick={phase === 'draw' ? () => toggle(c.id) : undefined}
                delay={c.fresh ? i * 80 : 0}
                highlight={!!result && inCombo(result.pe)(c)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
