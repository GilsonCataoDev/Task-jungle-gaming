import { toSocketIo } from "@mswjs/socket.io-binding"
import { ws } from "msw"
import { SOCKET_URL } from "@/realtime/config"
import type { ServerEvents } from "@/types/domain"

/**
 * Servidor Socket.IO simulado na camada de rede: o MSW intercepta o WebSocket e o
 * `@mswjs/socket.io-binding` faz o handshake (Engine.IO open + Socket.IO connect) e a codificação dos eventos.
 * O cliente é o `socket.io-client` de verdade. Os eventos nascem aqui (servidor), nunca na UI.
 *
 * Limitações: só transporte "websocket" (sem polling/upgrade), um único namespace "/", sem rooms, sem acks e sem
 * broadcast nativo (o `publish` percorre as conexões abertas). O binding anuncia pingInterval 25 s / pingTimeout 5 s,
 * mas não envia pings: o ping do Engine.IO é enviado aqui para o cliente não considerar a conexão morta.
 */
const PING_INTERVAL_MS = 25_000

// O MSW remove o prefixo "/socket.io/" da URL antes de comparar: o handler usa só a origem.
const socketLink = ws.link(SOCKET_URL)

type MockConnection = { emit(event: string, ...data: unknown[]): void; close(code?: number, reason?: string): void }
const connections = new Set<MockConnection>()

export const realtimeHandlers = [
  socketLink.addEventListener("connection", (connection) => {
    const { client } = connection
    const io = toSocketIo(connection)
    const entry: MockConnection = { emit: (event, ...data) => io.client.emit(event, ...data), close: (code, reason) => client.close(code, reason) }
    connections.add(entry)

    const pingTimer = setInterval(() => client.send("2"), PING_INTERVAL_MS)
    client.addEventListener("close", () => {
      clearInterval(pingTimer)
      connections.delete(entry)
    })
  }),
]

export function publish<E extends keyof ServerEvents>(event: E, payload: Parameters<ServerEvents[E]>[0]) {
  connections.forEach((connection) => connection.emit(event, payload))
}

/** Para testes de desconexão/reconexão. */
export function disconnectAll() {
  connections.forEach((connection) => connection.close(1001, "mock disconnect"))
}

export function connectedCount() {
  return connections.size
}
