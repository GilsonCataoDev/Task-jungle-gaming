import { useSyncExternalStore } from "react"

/** `true` quando a media query casa. No servidor/primeira pintura assume `fallback`. */
export function useMediaQuery(query: string, fallback = true) {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", notify)
      return () => list.removeEventListener("change", notify)
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  )
}
