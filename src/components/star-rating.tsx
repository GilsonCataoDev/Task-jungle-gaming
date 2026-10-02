import { Star } from "lucide-react"

/** Cinco estrelas laranja; a nota vai no texto alternativo (não só nas estrelas). */
export function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating)
  return (
    <span role="img" aria-label={`Nota ${rating.toFixed(1).replace(".", ",")} de 5`} className="inline-flex gap-1 text-primary">
      {Array.from({ length: 5 }, (_, index) => <Star key={index} className={index < filled ? "size-3.5 fill-primary" : "size-3.5"} aria-hidden />)}
    </span>
  )
}
