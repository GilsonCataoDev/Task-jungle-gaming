/** Valores em ETH sempre como string decimal (ex.: "0.42"). Nunca use number para dinheiro. */
export type EthString = string

/** "Coleções" da barra lateral (categorias do catálogo). */
export const CATEGORIES = ["Arte digital", "Fotografia", "Música", "Arte 3D", "Colecionáveis", "Generativa", "Jogos", "Assinaturas", "Utilidade"] as const
export type Category = (typeof CATEGORIES)[number]

export const NETWORKS = ["Ethereum", "Polygon", "Solana"] as const
export type Network = (typeof NETWORKS)[number]

export const WALLET_TYPES = ["MetaMask", "WalletConnect", "Coinbase Wallet"] as const
export type WalletType = (typeof WALLET_TYPES)[number]

export const EDITIONS = ["1/1", "1/10", "1/50", "ABERTA"] as const
export type Edition = (typeof EDITIONS)[number]

/** Teto de unidades por compra em cada edição: a "1/1" é única, a "1/10" tem tiragem de 10 e assim por diante. */
export const EDITION_CAP: Record<Edition, number> = { "1/1": 1, "1/10": 10, "1/50": 50, ABERTA: Number.POSITIVE_INFINITY }

/** Quantas unidades de `edition` dá para comprar: estoque do NFT, teto da edição e edição indisponível (0). */
export function maxQuantity(nft: { available: number; unavailableEditions: readonly Edition[] }, edition: Edition) {
  if (nft.unavailableEditions.includes(edition)) return 0
  return Math.max(0, Math.min(nft.available, EDITION_CAP[edition]))
}

/** Arte do NFT (arquivos em src/assets/nfts). */
export type NftImage = "emerald-ape" | "violet-nomad" | "ivory-baron" | "golden-beat"

export type Review = { author: string; rating: number; text: string; date: string }

export type Nft = {
  id: string
  name: string
  /** Ex.: "#0042". */
  tokenId: string
  category: Category
  /** Ex.: "Kurio Apes". */
  collection: string
  creator: string
  network: Network
  image: NftImage
  priceEth: EthString
  available: number
  /** Edição padrão do NFT. */
  edition: Edition
  /** Edições que não podem ser compradas (ex.: a "1/1" já foi vendida). Nunca inclui a edição padrão. */
  unavailableEditions: Edition[]
  attributes: string[]
  description: string
  rarity: "Raro" | null
  rating: number
  reviewCount: number
  likes: number
  listedAt: string
  /** Incrementa a cada mudança no servidor. Usado para descartar eventos antigos. */
  version: number
  /** Só vem preenchido para o criador do NFT (quando logado). */
  canEdit?: boolean
}

/** Detalhe: o NFT mais algumas avaliações de colecionadores. */
export type NftDetail = Nft & { reviews: Review[] }

export type NftSort = "recent" | "price-asc" | "price-desc" | "name"
/** Abas acima do catálogo. */
export type NftTab = "all" | "new" | "trending"

export type NftListParams = {
  search?: string
  category?: Category
  network?: Network
  minPrice?: EthString
  maxPrice?: EthString
  tab: NftTab
  sort: NftSort
  page: number
  pageSize: number
}

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number }

/** Contagens para a barra lateral e limites do controle de preço (sobre o catálogo inteiro). */
export type Facets = {
  categories: Record<Category, number>
  networks: Record<Network, number>
  priceRange: { min: EthString; max: EthString }
  featured: Nft
}

export type User = {
  id: string
  /** "Nome de exibição". */
  name: string
  /** "Nome de usuário". */
  username: string
  email: string
  avatarUrl: string | null
  /** Nome ENS sem o sufixo ".eth". */
  ens: string
  walletNickname: string
}
export type Session = { user: User; expiresAt: string }
export type AuthResponse = { token: string } & Session

/** Dados do colecionador (formulário do checkout e das carteiras). */
export type Collector = {
  displayName: string
  username: string
  network: Network
  profileName: string
  address: string
  /** "ENS ou carteira secundária (opcional)". */
  secondaryRef: string
  walletType: WalletType
  referralCode: string
  email: string
  /** Nome ENS sem o sufixo ".eth". */
  ens: string
  note: string
}

export type Wallet = {
  id: string
  isPrimary: boolean
  /** "Apelido da carteira". */
  nickname: string
  network: Network
  address: string
  type: WalletType
  secondaryRef: string
  displayName: string
  profileName: string
  referralCode: string
  email: string
  ens: string
}
export type WalletInput = Omit<Wallet, "id" | "isPrimary">

export type CartItem = { nft: Nft; quantity: number; edition: Edition }
export type Cart = { items: CartItem[]; updatedAt: string }

export type QuoteIssue =
  | { code: "unavailable"; nftId: string; available: number }
  | { code: "invalid_coupon"; message: string }

export type Quote = {
  items: CartItem[]
  subtotalEth: EthString
  discountEth: EthString
  networkFeeEth: EthString
  totalEth: EthString
  coupon: string | null
  issues: QuoteIssue[]
}

export type OrderStatus = "pending" | "processing" | "confirmed" | "failed"

export type Order = {
  id: string
  status: OrderStatus
  /** Incrementa a cada transição. Eventos com versão <= atual são ignorados. */
  version: number
  transactionId: string | null
  walletId: string
  /** Carteira usada para assinar (MetaMask, WalletConnect...). */
  provider: WalletType
  collector: Collector
  items: CartItem[]
  subtotalEth: EthString
  discountEth: EthString
  networkFeeEth: EthString
  totalEth: EthString
  createdAt: string
}

export type CreateOrderInput = {
  walletId: string
  provider: WalletType
  collector: Collector
  coupon: string | null
  /** Total que o usuário viu; o servidor rejeita se o preço mudou. */
  expectedTotalEth: EthString
}

export type ApiErrorBody = {
  code: string
  message: string
  fields?: Record<string, string>
}

// ---- Socket.IO ----
export type NftUpdatedEvent = { id: string; version: number; priceEth: EthString; available: number }
export type OrderUpdatedEvent = { id: string; version: number; status: OrderStatus; transactionId: string | null }
export type ServerEvents = {
  "nft.updated": (event: NftUpdatedEvent) => void
  "order.updated": (event: OrderUpdatedEvent) => void
}
