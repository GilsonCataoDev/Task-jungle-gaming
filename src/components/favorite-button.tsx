import { Heart } from "lucide-react"
import { useFavorite } from "@/features/favorites/use-favorite"
import { cn } from "@/lib/utils"
import type { Nft } from "@/types/domain"

const FAILURE = "Não foi possível atualizar seus favoritos. A alteração foi desfeita."

/** Coração sobre a imagem do cartão. */
export function FavoriteButton({ nft, className }: { nft: Pick<Nft, "id" | "name">; className?: string }) {
  const favorite = useFavorite(nft)
  return (
    <>
      <button
        type="button"
        aria-label={favorite.label}
        aria-pressed={favorite.isFavorite}
        onClick={favorite.toggle}
        className={cn("grid size-8 place-items-center rounded-full bg-card/90 text-primary hover:bg-card", className)}
      >
        <Heart className={cn("size-4", favorite.isFavorite && "fill-primary")} aria-hidden />
      </button>
      {favorite.failed && <span role="alert" className="sr-only">{FAILURE}</span>}
    </>
  )
}

/** Botão "Favoritar" (contorno laranja) da página de detalhe. */
export function FavoriteTextButton({ nft, className }: { nft: Pick<Nft, "id" | "name">; className?: string }) {
  const favorite = useFavorite(nft)
  return (
    <>
      <button
        type="button"
        aria-label={favorite.label}
        aria-pressed={favorite.isFavorite}
        onClick={favorite.toggle}
        className={cn("flex h-10 items-center gap-2 rounded-sm border border-primary px-4 text-base text-primary hover:bg-primary/10", className)}
      >
        <Heart className={cn("size-5", favorite.isFavorite && "fill-primary")} aria-hidden />
        <span aria-hidden>Favoritar</span>
      </button>
      {favorite.failed && <p role="alert" className="mt-2 text-sm text-destructive">{FAILURE}</p>}
    </>
  )
}
