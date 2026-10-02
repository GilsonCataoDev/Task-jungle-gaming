import type { Category, Edition, Network, Nft, NftImage, Review, Wallet } from "@/types/domain"

/** Dados 100% determinísticos: sem Math.random/Date.now aqui. Mesmo reset => mesmo estado. */

export type StoredUser = {
  id: string
  name: string
  username: string
  email: string
  /** `pbkdf2$<sal>$<hash>` (ver mocks/password.ts). Nunca a senha em claro. */
  passwordHash: string
  avatarUrl: string | null
  ens: string
  walletNickname: string
}

export const FIXTURE_USERS: StoredUser[] = [
  { id: "u_demo", name: "Nova Sato", username: "novasato", email: "demo@kurio.dev", passwordHash: "pbkdf2$0413c4c8e043610154cc7f4f1e8efdd6$ea66bc78f098fd122f40141229080be12bfb61eab8c0865b9354bc5689927085", avatarUrl: null, ens: "nova", walletNickname: "Principal" },
  { id: "u_maya", name: "Maya Lin", username: "mayalin", email: "maya@kurio.dev", passwordHash: "pbkdf2$e10c3adcf1baeac20401d762ecfab064$cfa85a3ed94dc5587263ff5955a2bd53cb23ef522cf6e7f3546af5dc27f72e3a", avatarUrl: null, ens: "maya", walletNickname: "Principal" },
]

export const FIXTURE_WALLETS: Record<string, Wallet[]> = {
  u_demo: [
    {
      id: "w_demo_1", isPrimary: true, nickname: "Principal", network: "Ethereum", type: "MetaMask",
      address: "0xA91F4d1c8B3e5a7F9021c6D4b8E0a3F5c7D9E82C", secondaryRef: "", displayName: "Nova Sato",
      profileName: "Nova Sato Studio", referralCode: "KURIO-NOVA", email: "demo@kurio.dev", ens: "nova",
    },
    {
      id: "w_demo_2", isPrimary: false, nickname: "Reserva", network: "Polygon", type: "WalletConnect",
      address: "0x3C9a7E15b2D84f60A1c9E7d3B5f2a8C4e6D1F0b7", secondaryRef: "", displayName: "Nova Sato",
      profileName: "Nova Sato Studio", referralCode: "KURIO-NOVA", email: "demo@kurio.dev", ens: "nova.kurio",
    },
  ],
  u_maya: [
    {
      id: "w_maya_1", isPrimary: true, nickname: "Principal", network: "Ethereum", type: "Coinbase Wallet",
      address: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E", secondaryRef: "", displayName: "Maya Lin",
      profileName: "Maya Lin", referralCode: "KURIO-MAYA", email: "maya@kurio.dev", ens: "maya",
    },
  ],
}

// ---- Catálogo: 36 NFTs (4 páginas de 9) ----
type Seed = {
  name: string
  number: string
  price: string
  category: Category
  network: Network
  image: NftImage
  collection: string
  rarity?: "Raro"
  available?: number
}

/** Os 8 primeiros são os NFTs que aparecem nas telas do Figma. */
const DESIGN_SEEDS: Seed[] = [
  { name: "Emerald Ape", number: "042", price: "1.19", category: "Arte digital", network: "Ethereum", image: "emerald-ape", collection: "Kurio Apes", available: 7 },
  { name: "Sage Nomad", number: "009", price: "1.69", category: "Arte digital", network: "Polygon", image: "violet-nomad", collection: "Kurio Nomads", available: 4 },
  { name: "Neon Vessel", number: "552", price: "2.49", category: "Colecionáveis", network: "Ethereum", image: "emerald-ape", collection: "Kurio Vessels", rarity: "Raro", available: 2 },
  { name: "Cosmic Bloom", number: "118", price: "1.29", category: "Generativa", network: "Solana", image: "violet-nomad", collection: "Kurio Blooms", available: 9 },
  { name: "Violet Nomad", number: "314", price: "1.39", category: "Arte digital", network: "Ethereum", image: "violet-nomad", collection: "Kurio Nomads", available: 6 },
  { name: "Ivory Baron", number: "088", price: "1.79", category: "Fotografia", network: "Polygon", image: "ivory-baron", collection: "Kurio Barons", available: 5 },
  { name: "Golden Beat", number: "207", price: "0.99", category: "Música", network: "Ethereum", image: "golden-beat", collection: "Kurio Beats", available: 8 },
  { name: "Golden Signal", number: "160", price: "0.39", category: "Música", network: "Solana", image: "golden-beat", collection: "Kurio Beats", available: 3 },
]

const PREFIXES = ["Amber", "Coral", "Lunar", "Onyx", "Jade", "Crimson", "Cobalt", "Solar", "Velvet", "Mystic", "Frost", "Ember"]
const SUFFIXES: { word: string; image: NftImage; collection: string }[] = [
  { word: "Ape", image: "emerald-ape", collection: "Kurio Apes" },
  { word: "Nomad", image: "violet-nomad", collection: "Kurio Nomads" },
  { word: "Baron", image: "ivory-baron", collection: "Kurio Barons" },
  { word: "Beat", image: "golden-beat", collection: "Kurio Beats" },
  { word: "Signal", image: "golden-beat", collection: "Kurio Signals" },
  { word: "Bloom", image: "violet-nomad", collection: "Kurio Blooms" },
  { word: "Vessel", image: "emerald-ape", collection: "Kurio Vessels" },
  { word: "Echo", image: "ivory-baron", collection: "Kurio Echoes" },
  { word: "Relic", image: "golden-beat", collection: "Kurio Relics" },
]
/** "Arte digital" é a coleção maior, como na barra lateral do Figma. */
const CATEGORY_CYCLE: Category[] = ["Arte digital", "Arte digital", "Arte digital", "Fotografia", "Música", "Arte 3D", "Colecionáveis", "Generativa", "Jogos", "Assinaturas", "Utilidade"]
const NETWORK_CYCLE: Network[] = ["Ethereum", "Ethereum", "Polygon", "Solana"]

const GENERATED_SEEDS: Seed[] = Array.from({ length: 28 }, (_, i) => {
  const suffix = SUFFIXES[(i * 5 + 3) % SUFFIXES.length]
  // i=3 e i=17 definem os extremos do controle de preço (0,02 e 12,30 ETH, como no Figma).
  const price = i === 3 ? "0.02" : i === 17 ? "12.30" : (((i * 53) % 190) + 10) / 100
  return {
    name: `${PREFIXES[i % PREFIXES.length]} ${suffix.word}`,
    number: String(((i * 137 + 41) % 900) + 1).padStart(3, "0"),
    price: typeof price === "string" ? price : price.toFixed(2),
    category: CATEGORY_CYCLE[i % CATEGORY_CYCLE.length],
    network: NETWORK_CYCLE[i % NETWORK_CYCLE.length],
    image: suffix.image,
    collection: suffix.collection,
    rarity: i % 7 === 4 ? "Raro" : undefined,
    // i=5 fica esgotado de propósito, para testar o estado "indisponível".
    available: i === 5 ? 0 : 1 + ((i * 3) % 9),
  }
})

const CREATORS = ["Nova Sato", "Iris Vale", "Kai Moreno", "Luma Reis"]
const ATTRIBUTES: Record<NftImage, string[]> = {
  "emerald-ape": ["Óculos", "Esmeralda"],
  "violet-nomad": ["Chapéu", "Moletom roxo"],
  "ivory-baron": ["Gola alta", "Blazer bege"],
  "golden-beat": ["Fones", "Jaqueta clara"],
}
const DAY_MS = 86_400_000
const REFERENCE_DATE = Date.UTC(2026, 8, 30)

const slug = (text: string) => text.toLowerCase().replaceAll(" ", "-")

function buildNft(seed: Seed, index: number): Nft {
  return {
    id: `${slug(seed.name)}-${seed.number}`,
    name: `${seed.name} #${seed.number}`,
    tokenId: `#0${seed.number}`,
    category: seed.category,
    collection: seed.collection,
    creator: CREATORS[index % CREATORS.length],
    network: seed.network,
    image: seed.image,
    priceEth: seed.price,
    available: seed.available ?? 5,
    edition: "1/50" satisfies Edition,
    attributes: [...ATTRIBUTES[seed.image], ...(seed.rarity ? [seed.rarity] : [])],
    description: `Um colecionável digital finalizado à mão da coleção ${seed.collection}, verificado na ${seed.network}, com arte desbloqueável e acesso para colecionadores.`,
    rarity: seed.rarity ?? null,
    rating: 4.8,
    reviewCount: 19,
    likes: ((index * 29) % 97) + 3,
    // O índice 0 é o mais recente.
    listedAt: new Date(REFERENCE_DATE - index * DAY_MS).toISOString(),
    version: 1,
  }
}

export const FIXTURE_NFTS: Nft[] = [...DESIGN_SEEDS, ...GENERATED_SEEDS].map(buildNft)

const REVIEW_TEXTS = [
  "Acabamento impecável e a procedência está toda registrada na rede. Recomendo para quem está começando a coleção.",
  "A edição chegou na carteira em segundos e o criador manteve contato. Vale cada centavo de ETH.",
  "Arte muito bem resolvida, com atributos raros e metadados completos. Já é um dos destaques da minha coleção.",
]
export function reviewsFor(nft: Nft): Review[] {
  const authors = ["Iris Vale", "Kai Moreno", "Luma Reis"]
  return REVIEW_TEXTS.map((text, i) => ({
    author: authors[i],
    rating: i === 1 ? 4 : 5,
    text: `${text} (${nft.name})`,
    date: new Date(REFERENCE_DATE - (i + 2) * 3 * DAY_MS).toISOString(),
  }))
}

type Coupon = { expiresAt?: string } & ({ kind: "percent"; basisPoints: number } | { kind: "flat"; eth: string })
export const COUPONS: Record<string, Coupon> = {
  KURIO10: { kind: "percent", basisPoints: 1000 },
  WELCOME: { kind: "flat", eth: "0.05" },
  /** Existe, mas venceu: serve ao cenário "cupom expirado". */
  NATAL20: { kind: "percent", basisPoints: 2000, expiresAt: "2024-12-26T00:00:00.000Z" },
}

/** "Taxa estimada" do Figma. */
export const NETWORK_FEE_ETH = "0.016"
