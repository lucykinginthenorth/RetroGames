import { CoinIcon } from './CoinPill.jsx'

export default function GameOver({ reason, score, best, isRecord, coinsEarned, onRetry, onExit }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b0720cc] p-6 backdrop-blur-[2px]">
      <div className="animate-pop-in w-full max-w-xs rounded-2xl border-4 border-[#1b0b3a] bg-[#2b1d5c] p-5 text-center shadow-[0_8px_0_#1b0b3a]">
        <p className="font-pixel text-lg text-[#ff5ca8] text-outline">GAME OVER</p>
        {reason && <p className="mt-3 text-sm text-white/80">{reason}</p>}
        <div className="mt-4 rounded-xl bg-[#1b0b3a] p-3">
          <p className="font-pixel text-[10px] text-white/60">PUNTOS</p>
          <p className="mt-1 font-pixel text-3xl text-white">{score}</p>
          {isRecord ? (
            <p className="animate-blink mt-2 font-pixel text-[10px] text-yellow-300">¡NUEVO RÉCORD!</p>
          ) : (
            <p className="mt-2 font-pixel text-[10px] text-white/50">RÉCORD {best}</p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 font-pixel text-xs text-yellow-300">
          <CoinIcon /> +{coinsEarned}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onExit}
            className="pixel-btn flex-1 rounded-xl border-2 border-[#1b0b3a] bg-white py-3 font-pixel text-[10px] text-[#1b0b3a]"
          >
            MENÚ
          </button>
          <button
            onClick={onRetry}
            className="pixel-btn flex-1 rounded-xl border-2 border-[#1b0b3a] bg-[#80ed99] py-3 font-pixel text-[10px] text-[#1b0b3a]"
          >
            REINTENTAR
          </button>
        </div>
      </div>
    </div>
  )
}
