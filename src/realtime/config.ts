/**
 * Endereço do servidor Socket.IO. Em modo mock é um host fictício: o MSW intercepta a conexão
 * na camada de rede, então nada sai do navegador (e o WebSocket do HMR do Vite fica intacto).
 * Com backend real, defina VITE_SOCKET_URL.
 */
export const SOCKET_URL: string = import.meta.env.VITE_SOCKET_URL ?? "wss://realtime.kurio.mock"
export const SOCKET_PATH = "/socket.io/"
