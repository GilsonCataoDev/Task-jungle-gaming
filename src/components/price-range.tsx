import { useState } from "react"

type Props = {
  /** Limites do catálogo (ETH, como string decimal). */
  bounds: { min: string; max: string }
  /** Faixa aplicada hoje (ausente = sem filtro). */
  value: { min?: string; max?: string }
  onApply: (range: { min?: string; max?: string }) => void
}

const STEP = 0.01
const label = (n: number) => n.toFixed(2).replace(".", ",")

/** "Faixa de preço": duas alças + botão Aplicar (a busca só muda ao aplicar). */
export function PriceRange({ bounds, value, onApply }: Props) {
  const lo = Number(bounds.min)
  const hi = Number(bounds.max)
  const [min, setMin] = useState(value.min ? Number(value.min) : lo)
  const [max, setMax] = useState(value.max ? Number(value.max) : hi)
  const span = hi - lo || 1
  const left = ((min - lo) / span) * 100
  const right = 100 - ((max - lo) / span) * 100

  return (
    <div>
      <h2 className="text-base">Faixa de preço</h2>
      <div className="dual-range mt-3">
        <div aria-hidden className="absolute inset-x-1 top-1/2 h-[3px] -translate-y-1/2 rounded bg-primary/35" />
        <div aria-hidden className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded bg-primary" style={{ left: `${left}%`, right: `${right}%` }} />
        <input type="range" aria-label="Preço mínimo (ETH)" min={lo} max={hi} step={STEP} value={min} onChange={(event) => setMin(Math.min(Number(event.target.value), max))} />
        <input type="range" aria-label="Preço máximo (ETH)" min={lo} max={hi} step={STEP} value={max} onChange={(event) => setMax(Math.max(Number(event.target.value), min))} />
      </div>
      <p className="mt-2 text-sm text-tan" aria-live="polite">Preço: {label(min)} - {label(max)} ETH</p>
      <button
        type="button"
        onClick={() => onApply({ min: min > lo ? min.toFixed(2) : undefined, max: max < hi ? max.toFixed(2) : undefined })}
        className="mt-3 rounded-sm bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:bg-primary/85"
      >
        Aplicar
      </button>
    </div>
  )
}
