import { useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Socket } from "socket.io-client"
import type { ServerEvents } from "@/types/domain"
import { mockGate } from "@/lib/mock-gate"
import { SOCKET_PATH, SOCKET_URL } from "./config"
import { applyNftEvent, applyOrderEvent, resync, type NftEffect, type OrderEffect } from "./reconcile"

export type ConnectionStatus = "connecting" | "online" | "offline"
export type RealtimeEffect = NftEffect | OrderEffect

type RealtimeValue = { status: ConnectionStatus; lastEffect: RealtimeEffect | null }
const RealtimeContext = createContext<RealtimeValue>({ status: "connecting", lastEffect: null })

export const useRealtime = () => useContext(RealtimeContext)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [lastEffect, setLastEffect] = useState<RealtimeEffect | null>(null)

  useEffect(() => {
    let socket: Socket<ServerEvents> | undefined
    let cancelled = false
    let hasConnectedBefore = false

    // Import dinâmico, depois do portão dos mocks, de propósito: o socket.io-client captura
    // `globalThis.WebSocket` quando o módulo é avaliado. Carregá-lo só depois de o MSW iniciar
    // garante que a conexão seja interceptada.
    void mockGate.then(() => import("socket.io-client")).then(({ io }) => {
      if (cancelled) return
      const connection: Socket<ServerEvents> = io(SOCKET_URL, { path: SOCKET_PATH, transports: ["websocket"], reconnectionDelay: 500, reconnectionDelayMax: 3_000 })
      socket = connection

      connection.on("connect", () => {
        setStatus("online")
        // Reconexão: eventos podem ter sido perdidos enquanto estávamos offline => REST decide.
        if (hasConnectedBefore) resync(queryClient)
        hasConnectedBefore = true
      })
      connection.on("disconnect", () => setStatus("offline"))
      connection.on("connect_error", () => setStatus("offline"))

      connection.on("nft.updated", (event) => {
        const effect = applyNftEvent(queryClient, event)
        if (effect) setLastEffect(effect)
      })
      connection.on("order.updated", (event) => {
        const effect = applyOrderEvent(queryClient, event)
        if (effect) setLastEffect(effect)
      })
    })

    return () => {
      cancelled = true
      socket?.removeAllListeners()
      socket?.disconnect()
    }
  }, [queryClient])

  const value = useMemo(() => ({ status, lastEffect }), [status, lastEffect])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
