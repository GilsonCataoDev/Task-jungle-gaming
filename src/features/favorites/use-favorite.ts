import { useRequireLogin, useSession } from "@/features/auth/hooks"
import type { Nft } from "@/types/domain"
import { useFavorites, useToggleFavorite } from "./hooks"

/** Estado e ação de favorito de um NFT (otimista, com rollback; visitante vai ao login). */
export function useFavorite(nft: Pick<Nft, "id" | "name">) {
  const { user } = useSession()
  const requireLogin = useRequireLogin()
  const { data: favorites } = useFavorites()
  const toggle = useToggleFavorite()
  const isFavorite = favorites?.has(nft.id) ?? false
  return {
    isFavorite,
    failed: toggle.isError,
    label: isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`,
    toggle: () => (user ? toggle.mutate({ nftId: nft.id, favorite: !isFavorite }) : requireLogin()),
  }
}
