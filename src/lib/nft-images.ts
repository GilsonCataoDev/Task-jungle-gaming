import emeraldApe from "@/assets/nfts/emerald-ape.webp"
import goldenBeat from "@/assets/nfts/golden-beat.webp"
import ivoryBaron from "@/assets/nfts/ivory-baron.webp"
import violetNomad from "@/assets/nfts/violet-nomad.webp"
import type { NftImage } from "@/types/domain"

const SOURCES: Record<NftImage, string> = {
  "emerald-ape": emeraldApe,
  "violet-nomad": violetNomad,
  "ivory-baron": ivoryBaron,
  "golden-beat": goldenBeat,
}

export const nftImageUrl = (image: NftImage) => SOURCES[image]
