import { Link } from "@tanstack/react-router"
import { Search, ShoppingCart } from "lucide-react"
import { FavoriteButton } from "@/components/favorite-button"
import { NftImage } from "@/components/nft-image"
import { useRequireLogin, useSession } from "@/features/auth/hooks"
import { useAddToCart } from "@/features/cart/hooks"
import { formatEth } from "@/lib/format"
import type { Nft } from "@/types/domain"

const overlayButton = "grid size-8 place-items-center rounded-sm bg-card text-primary hover:bg-primary hover:text-primary-foreground"

/** Cartão do catálogo. Desktop: ações aparecem ao passar o mouse/focar. Mobile: coração no canto. */
export function NftCard({ nft, priority }: { nft: Nft; priority?: boolean }) {
  const { user } = useSession()
  const requireLogin = useRequireLogin()
  const add = useAddToCart()
  const soldOut = nft.available <= 0

  return (
    <article className="group rounded-md bg-card md:bg-transparent" aria-label={nft.name}>
      <div className="relative md:bg-card md:px-4 md:py-2">
        <div className="relative overflow-hidden rounded-xl">
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} aria-label={`Ver ${nft.name}`} className="block">
            <NftImage image={nft.image} name={nft.name} priority={priority} className="aspect-square md:aspect-[4/5]" />
          </Link>
          {nft.rarity && <span className="absolute left-0 top-3 bg-primary px-3 py-1 text-xs font-bold uppercase text-primary-foreground">{nft.rarity}</span>}
          <FavoriteButton nft={nft} className="absolute right-2 top-2 md:hidden" />
          <div className="absolute inset-x-0 bottom-3 hidden justify-center gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 md:flex">
            <button
              type="button"
              aria-label={`Adicionar ${nft.name} ao carrinho`}
              disabled={soldOut || add.isPending}
              onClick={() => (user ? add.mutate({ nft }) : requireLogin())}
              className={`${overlayButton} disabled:opacity-50`}
            >
              <ShoppingCart className="size-4" aria-hidden />
            </button>
            <FavoriteButton nft={nft} className="rounded-sm" />
            <Link to="/nfts/$nftId" params={{ nftId: nft.id }} aria-label={`Ampliar ${nft.name}`} className={overlayButton}>
              <Search className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
      <div className="px-3 pb-3 pt-2 md:px-0 md:pb-0">
        <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block text-sm text-foreground hover:text-primary md:text-base">{nft.name}</Link>
        <p className="mt-0.5 font-bold text-primary">{soldOut ? "Esgotado" : formatEth(nft.priceEth)}</p>
      </div>
    </article>
  )
}
