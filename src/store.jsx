import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'arcade-trio-save-v1'
const DEFAULT = { coins: 50, best: {} }

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    const data = JSON.parse(raw)
    return { coins: Number(data.coins) || 0, best: data.best || {} }
  } catch {
    return DEFAULT
  }
}

const CoinsContext = createContext(null)

export function CoinsProvider({ children }) {
  const [data, setData] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* almacenamiento no disponible: el progreso dura sólo esta sesión */
    }
  }, [data])

  const addCoins = useCallback((n) => {
    if (!n) return
    setData((d) => ({ ...d, coins: Math.max(0, d.coins + n) }))
  }, [])

  const reportBest = useCallback((game, score) => {
    setData((d) => (score > (d.best[game] || 0) ? { ...d, best: { ...d.best, [game]: score } } : d))
  }, [])

  const value = useMemo(
    () => ({ coins: data.coins, best: data.best, addCoins, reportBest }),
    [data, addCoins, reportBest],
  )
  return <CoinsContext.Provider value={value}>{children}</CoinsContext.Provider>
}

export function useCoins() {
  return useContext(CoinsContext)
}
