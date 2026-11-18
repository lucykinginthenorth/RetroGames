import { useState } from 'react'
import Menu from './components/Menu.jsx'
import Trampolines from './games/Trampolines.jsx'
import Bombs from './games/Bombs.jsx'
import Poker from './games/Poker.jsx'

const SCREENS = { tramp: Trampolines, bombs: Bombs, poker: Poker }

export default function App() {
  const [screen, setScreen] = useState('menu')
  const Game = SCREENS[screen]

  return (
    <div className="flex h-dvh w-full items-center justify-center sm:p-4">
      {/* Marco de la "consola": ocupa toda la pantalla en móvil y se ve como un dispositivo en escritorio */}
      <div
        className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-[#120b2e] sm:max-h-[900px] sm:rounded-[2rem] sm:border-4 sm:border-[#2b1d5c] sm:shadow-[0_0_0_6px_#0b0720,0_30px_80px_#000a]"
        style={{
          // Áreas seguras (notch / barra de gestos) en iPhone y Android
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div key={screen} className="animate-screen-in flex min-h-0 flex-1 flex-col">
          {Game ? <Game onExit={() => setScreen('menu')} /> : <Menu onPlay={setScreen} />}
        </div>
      </div>
    </div>
  )
}
