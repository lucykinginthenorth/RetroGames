import { useCoins } from '../store.jsx'

export function CoinIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#b8860b" />
      <circle cx="12" cy="11" r="10" fill="#ffd60a" />
      <circle cx="12" cy="11" r="7" fill="none" stroke="#e8a500" strokeWidth="2" />
      <rect x="10.5" y="6.5" width="3" height="9" rx="1" fill="#e8a500" />
      <circle cx="8.5" cy="7.5" r="1.5" fill="#fff8" />
    </svg>
  )
}

export default function CoinPill() {
  const { coins } = useCoins()
  return (
    <div className="pixel-shadow flex items-center gap-2 rounded-full border-2 border-[#1b0b3a] bg-[#2b1d5c] py-1 pr-3 pl-1">
      <CoinIcon className="h-6 w-6" />
      <span key={coins} className="animate-bump font-pixel text-xs text-yellow-300 tabular-nums">
        {coins}
      </span>
    </div>
  )
}
