import { nftImageUrl } from "@/lib/nft-images"
import { cn } from "@/lib/utils"
import type { NftImage as NftImageKey } from "@/types/domain"

type Props = { image: NftImageKey; name: string; className?: string; priority?: boolean }

/** Arte do NFT. `name` entra no texto alternativo (a imagem é conteúdo, não decoração). */
export function NftImage({ image, name, className, priority }: Props) {
  return (
    <img
      src={nftImageUrl(image)}
      alt={`Arte do NFT ${name}`}
      width={234}
      height={234}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("aspect-square w-full object-cover", className)}
    />
  )
}
