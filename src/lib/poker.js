// Símbolos de menor (0) a mayor (5)
export const SYMBOLS = [{ name: 'Nube' }, { name: 'Bellota' }, { name: 'Flor' }, { name: 'Gato' }, { name: 'Corona' }, { name: 'Estrella' }]

// Manos de menor a mayor, con multiplicador de pago al ganar
export const HANDS = [
  { name: 'Nada', mult: 2 },
  { name: 'Par', mult: 2 },
  { name: 'Doble Par', mult: 3 },
  { name: 'Tercia', mult: 4 },
  { name: 'Full House', mult: 6 },
  { name: 'Póker', mult: 8 },
  { name: 'Quintilla', mult: 16 },
]

const COPIES = 6 // 6 cartas de cada símbolo → 36 cartas

export function newDeck() {
  const deck = []
  let id = 0
  for (let s = 0; s < SYMBOLS.length; s++) for (let i = 0; i < COPIES; i++) deck.push({ id: id++, sym: s })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

/** Evalúa una mano de 5 cartas. Devuelve rango y una clave comparable. */
export function evaluate(hand) {
  const counts = new Array(SYMBOLS.length).fill(0)
  for (const c of hand) counts[c.sym]++
  const groups = counts
    .map((n, sym) => ({ n, sym }))
    .filter((g) => g.n > 0)
    .sort((a, b) => b.n - a.n || b.sym - a.sym)
  const shape = groups.map((g) => g.n).join('')
  const rank =
    shape === '5' ? 6
    : shape === '41' ? 5
    : shape === '32' ? 4
    : shape === '311' ? 3
    : shape === '221' ? 2
    : shape === '2111' ? 1
    : 0
  return { rank, name: HANDS[rank].name, key: [rank, ...groups.map((g) => g.sym)], counts }
}

/** >0 si gana a, <0 si gana b, 0 empate. */
export function compare(a, b) {
  const n = Math.max(a.key.length, b.key.length)
  for (let i = 0; i < n; i++) {
    const d = (a.key[i] ?? -1) - (b.key[i] ?? -1)
    if (d) return d
  }
  return 0
}

/** Estrategia de la CPU: conserva grupos; si no tiene nada, se queda con su carta más alta. */
export function cpuKeepIds(hand) {
  const { counts, rank } = evaluate(hand)
  const keep = new Set(hand.filter((c) => counts[c.sym] >= 2).map((c) => c.id))
  if (rank === 0) {
    const top = [...hand].sort((a, b) => b.sym - a.sym)[0]
    keep.add(top.id)
    // A veces se arriesga y conserva también la segunda más alta
    if (Math.random() < 0.3) keep.add([...hand].sort((a, b) => b.sym - a.sym)[1].id)
  }
  return keep
}
