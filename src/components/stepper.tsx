import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
  size?: "sm" | "md"
  className?: string
}

/** Seletor de quantidade com botões redondos laranja (− n +). */
export function Stepper({ value, onChange, min = 0, max = Infinity, label, size = "md", className }: Props) {
  const button = cn("grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/85 disabled:opacity-40", size === "md" ? "size-8" : "size-6")
  const icon = size === "md" ? "size-4" : "size-3"
  return (
    <div role="group" aria-label={label} className={cn("flex items-center gap-3", className)}>
      <button type="button" aria-label="Diminuir quantidade" disabled={value <= min} onClick={() => onChange(value - 1)} className={button}>
        <Minus className={icon} aria-hidden />
      </button>
      <output aria-live="polite" aria-label="Quantidade" className="min-w-4 text-center text-base">{value}</output>
      <button type="button" aria-label="Aumentar quantidade" disabled={value >= max} onClick={() => onChange(value + 1)} className={button}>
        <Plus className={icon} aria-hidden />
      </button>
    </div>
  )
}
