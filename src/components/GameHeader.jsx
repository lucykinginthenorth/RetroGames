import CoinPill from './CoinPill.jsx'

export default function GameHeader({ title, onExit, color = '#4cc9f0' }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b-4 border-[#1b0b3a] bg-[#1d1245] px-3 py-2">
      <button
        onClick={onExit}
        className="pixel-btn rounded-lg border-2 border-[#1b0b3a] bg-white px-2 py-1.5 font-pixel text-[10px] text-[#1b0b3a]"
      >
        ◀ MENÚ
      </button>
      <h1 className="truncate font-pixel text-[10px] tracking-wide" style={{ color }}>
        {title}
      </h1>
      <CoinPill />
    </header>
  )
}
