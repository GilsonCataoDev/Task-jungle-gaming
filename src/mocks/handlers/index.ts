import { realtimeHandlers } from "../realtime"
import { accountHandlers } from "./account"
import { authHandlers } from "./auth"
import { newsletterHandlers } from "./newsletter"
import { nftHandlers } from "./nfts"
import { orderHandlers } from "./orders"
import { shoppingHandlers } from "./shopping"

export const handlers = [...authHandlers, ...nftHandlers, ...shoppingHandlers, ...orderHandlers, ...accountHandlers, ...newsletterHandlers, ...realtimeHandlers]
