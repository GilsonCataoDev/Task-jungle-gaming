import { useSyncExternalStore } from "react"

/**
 * Cupom aplicado no carrinho, compartilhado com o checkout. Fica em `sessionStorage`: sobrevive a
 * navegação e recarga, e some ao fechar a aba. O servidor valida de novo na cotação e no pedido.
 */
const KEY = "kurio:coupon"
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setCoupon(value: string | null) {
  try {
    if (value) sessionStorage.setItem(KEY, value)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* armazenamento indisponível: o cupom vale só até recarregar */
  }
  listeners.forEach((listener) => listener())
}

export function useCoupon(): [string | null, (value: string | null) => void] {
  const coupon = useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    read,
    () => null,
  )
  return [coupon, setCoupon]
}
