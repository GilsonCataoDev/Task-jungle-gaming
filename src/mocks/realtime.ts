import { ws } from "msw"
import { SOCKET_URL } from "@/realtime/config"
import type { ServerEvents } from "@/types/domain"

/**
 * Servidor Socket.IO simulado na camada de rede (MSW intercepta o WebSocket).
 * Fala o protocolo real: Engine.IO v4 + Socket.IO v5, só transporte "websocket".
 * Limitações: sem polling/upgrade, sem rooms, sem acks, um único namespace "/".
 * Os eventos nascem aqui (servidor), nunca na UI; o cliente usa socket.io-client de verdade.
 */
const PING_INTERVAL_MS = 10_000
const PING_TIMEOUT_MS = 20_000

// O MSW remove o prefixo "/socket.io/" da URL antes de comparar: o handler usa só a origem.
const socketLink = ws.link(SOCKET_URL)

type MockClient = { send(data: string): void; close(code?: number, reason?: string): void }
const clients = new Set<MockClient>()

export const realtimeHandlers = [
  socketLink.addEventListener("connection", ({ client }) => {
    clients.add(client)
    client.send(
      "0" + JSON.stringify({ sid: crypto.randomUUID(), upgrades: [], pingInterval: PING_INTERVAL_MS, pingTimeout: PING_TIMEOUT_MS, maxPayload: 1_000_000 }),
    )
    const pingTimer = setInterval(() => client.send("2"), PING_INTERVAL_MS)

    client.addEventListener("message", (event) => {
      const packet = String(event.data)
      if (packet === "3") return // pong
      if (packet === "2") return client.send("3")
      if (packet.startsWith("40")) client.send("40" + JSON.stringify({ sid: crypto.randomUUID() }))
    })
    client.addEventListener("close", () => {
      clearInterval(pingTimer)
      clients.delete(client)
    })
  }),
]

export function publish<E extends keyof ServerEvents>(event: E, payload: Parameters<ServerEvents[E]>[0]) {
  const frame = "42" + JSON.stringify([event, payload])
  clients.forEach((client) => client.send(frame))
}

/** Para testes de desconexão/reconexão. */
export function disconnectAll() {
  clients.forEach((client) => client.close(1001, "mock disconnect"))
}

export function connectedCount() {
  return clients.size
}
