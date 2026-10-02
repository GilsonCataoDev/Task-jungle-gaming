import { useQueries } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { NftCard } from "@/components/nft-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useFavorites } from "@/features/favorites/hooks"
import { nftDetailQuery } from "@/features/nfts/queries"
import { ProfileLayout } from "@/features/profile/profile-layout"

export const Route = createFileRoute("/_auth/lista-de-interesse")({ component: WishlistPage })

function WishlistPage() {
  const favorites = useFavorites()
  const ids = [...(favorites.data ?? [])]
  const details = useQueries({ queries: ids.map((id) => nftDetailQuery(id)) })
  const nfts = details.flatMap((query) => (query.data ? [query.data] : []))

  return (
    <ProfileLayout active="/lista-de-interesse" title="Lista de interesse">
      {favorites.isPending && <Skeleton className="mt-6 h-64 bg-card" aria-label="Carregando lista de interesse" />}
      {favorites.data && ids.length === 0 && (
        <div className="mt-6 bg-card p-8 text-center">
          <p>Você ainda não favoritou nenhum NFT.</p>
          <Link to="/mercado" className="mt-4 inline-flex h-10 items-center rounded-sm bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/85">Explorar NFTs</Link>
        </div>
      )}
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-8">
        {nfts.map((nft) => <NftCard key={nft.id} nft={nft} />)}
      </div>
    </ProfileLayout>
  )
}
