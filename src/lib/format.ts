export { formatEth } from "./money"

export function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
}

/** "0xA91F4d1c…E82C" -> "0xA91F…E82C" (hash de transação ou endereço). */
export const shortHash = shortAddress

/** Linha "Desconto do lançamento": "(-) 00.00" sem desconto, senão o valor. */
export function formatDiscount(eth: string) {
  return `(-) ${eth === "0" ? "00.00" : eth}`
}

/** Data curta do recibo: "29 Jul, 2026". */
export function formatReceiptDate(iso: string) {
  const date = new Date(iso)
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "")
  return `${date.getDate()} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.getFullYear()}`
}
