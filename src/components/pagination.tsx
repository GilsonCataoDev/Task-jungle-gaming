import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = { page: number; totalPages: number; onChange: (page: number) => void; className?: string }

/** Paginação numerada (1 2 3 4 >), como no Figma. */
export function Pagination({ page, totalPages, onChange, className }: Props) {
  if (totalPages <= 1) return null
  const box = "grid size-9 place-items-center rounded-sm border border-input text-base text-foreground hover:border-primary disabled:opacity-40"
  return (
    <nav aria-label="Paginação" className={cn("flex items-center justify-end gap-2", className)}>
      {page > 1 && (
        <button type="button" aria-label="Página anterior" onClick={() => onChange(page - 1)} className={box}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      )}
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`Página ${number}`}
          aria-current={number === page ? "page" : undefined}
          onClick={() => onChange(number)}
          className={cn(box, number === page && "border-primary bg-primary font-bold text-primary-foreground")}
        >
          {number}
        </button>
      ))}
      <button type="button" aria-label="Próxima página" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={box}>
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  )
}
