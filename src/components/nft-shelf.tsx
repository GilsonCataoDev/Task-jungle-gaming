import { Link } from "@tanstack/react-router"
import { NftImage } from "@/components/nft-image"
import { formatEth } from "@/lib/format"
import type { Nft } from "@/types/domain"

/** Faixa de até 5 NFTs ("Colecionadores também viram", "Mais desta coleção"). Só desktop, como no Figma. */
export function NftShelf({ id, title, items }: { id: string; title: string; items: Nft[] }) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby={id} className="mt-16 max-md:hidden">
      <h2 id={id} className="border-b border-line pb-3 text-lg font-bold text-primary">{title}</h2>
      <ul className="mt-6 grid grid-cols-5 gap-6">
        {items.slice(0, 5).map((nft) => (
          <li key={nft.id} className="bg-card">
            <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block px-2 pt-2" aria-label={`Ver ${nft.name}`}><NftImage image={nft.image} name={nft.name} className="aspect-[4/5] rounded-xl" /></Link>
            <p className="px-0 pt-2 text-sm">{nft.name}</p>
            <p className="font-bold text-primary">{formatEth(nft.priceEth, 2)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
