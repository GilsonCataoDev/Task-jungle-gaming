import { toSocketIo } from "@mswjs/socket.io-binding"
import { ws } from "msw"
import { SOCKET_URL } from "@/realtime/config"
import type { ServerEvents } from "@/types/domain"
import { db } from "./db"

/**
 * Servidor Socket.IO simulado na camada de rede: o MSW intercepta o WebSocket e o
 * `@mswjs/socket.io-binding` faz o handshake (Engine.IO open + Socket.IO connect) e a codificação dos eventos.
 * O cliente é o `socket.io-client` de verdade. Os eventos nascem aqui (servidor), nunca na UI.
 *
 * Isolamento por sessão: o cliente manda o token no pacote CONNECT do Socket.IO (`auth`); a conexão passa a pertencer a
 * esse usuário. `nft.updated` é público (todos recebem); `order.updated` só vai para as conexões do dono do pedido.
 *
 * Limitações: só transporte "websocket" (sem polling/upgrade), um único namespace "/", sem rooms, sem acks e sem
 * broadcast nativo (o `publish` percorre as conexões abertas). O binding anuncia pingInterval 25 s / pingTimeout 5 s,
 * mas não envia pings: o ping do Engine.IO é enviado aqui para o cliente não considerar a conexão morta.
 */
const PING_INTERVAL_MS = 25_000

// O MSW remove o prefixo "/socket.io/" da URL antes de comparar: o handler usa só a origem.
const socketLink = ws.link(SOCKET_URL)

type MockConnection = { userId: string | null; emit(event: string, ...data: unknown[]): void; close(code?: number, reason?: string): void }
const connections = new Set<MockConnection>()

/** Registro do que o servidor entregou e a quem (visível em `window.__mocks.deliveries()`, para testes de isolamento). */
export type Delivery = { event: string; id: string; to: string | null }
const deliveries: Delivery[] = []

export const realtimeHandlers = [
  socketLink.addEventListener("connection", (connection) => {
    const { client } = connection
    const io = toSocketIo(connection)
    const entry: MockConnection = { userId: null, emit: (event, ...data) => io.client.emit(event, ...data), close: (code, reason) => client.close(code, reason) }
    connections.add(entry)

    // Pacote CONNECT do Socket.IO: "40" + JSON do `auth` (ex.: {"token":"..."}). Token válido => conexão do usuário.
    client.addEventListener("message", (event) => {
      if (typeof event.data !== "string" || !event.data.startsWith("40")) return
      try {
        const token = (JSON.parse(event.data.slice(2) || "{}") as { token?: string }).token
        entry.userId = (token && db().sessions[token]?.userId) || null
      } catch {
        entry.userId = null
      }
    })

    const pingTimer = setInterval(() => client.send("2"), PING_INTERVAL_MS)
    client.addEventListener("close", () => {
      clearInterval(pingTimer)
      connections.delete(entry)
    })
  }),
]

export function publish<E extends keyof ServerEvents>(event: E, payload: Parameters<ServerEvents[E]>[0]) {
  const id = (payload as { id: string }).id
  // Pedido: só o dono recebe. Evento de pedido que não existe no banco não é entregue a ninguém.
  const owner = event === "order.updated" ? (db().orders.find((order) => order.id === id)?.userId ?? "") : null
  connections.forEach((connection) => {
    if (owner !== null && connection.userId !== owner) return
    connection.emit(event, payload)
    deliveries.push({ event, id, to: connection.userId })
  })
}

export const getDeliveries = (): Delivery[] => [...deliveries]

/** Para testes de desconexão/reconexão. */
export function disconnectAll() {
  connections.forEach((connection) => connection.close(1001, "mock disconnect"))
}

export function connectedCount() {
  return connections.size
}
