import { useEffect, useMemo, useRef } from "react"

/**
 * Agrupa chamadas seguidas: `fn` só roda depois de `delay` ms sem nova chamada (a última vence).
 * Serve para "filtrar enquanto digita" sem disparar uma busca por tecla. `cancel()` descarta a pendente
 * (usado quando o usuário confirma com Enter, que já busca na hora). O timer é limpo ao desmontar.
 */
export function useDebouncedCallback<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  const latest = useRef(fn)
  useEffect(() => {
    latest.current = fn
  })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  return useMemo(() => {
    const call = (...args: Args) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => latest.current(...args), delay)
    }
    call.cancel = () => clearTimeout(timer.current)
    return call
  }, [delay])
}

/** Atraso padrão da busca ao digitar: curto o bastante para parecer imediato, longo o bastante para juntar teclas. */
export const SEARCH_DEBOUNCE_MS = 300
