import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { AppProviders } from "./app/providers"
import { router } from "./app/router"
import { TOKEN_KEY } from "./lib/api"
import { openMockGate } from "./lib/mock-gate"
import "./index.css"

/**
 * Os mocks ficam LIGADOS por padrão (inclusive em produção: o deploy público depende deles).
 * Para desligar: VITE_ENABLE_MOCKS=false.
 *
 * O MSW é carregado DEPOIS do carregamento da página (evento load + ociosidade), para não atrasar FCP/LCP. Enquanto ele sobe, as
 * requisições ficam retidas em `mockGate` (ver lib/api.ts e realtime-provider.tsx).
 */
async function startMocking() {
  try {
    if (import.meta.env.VITE_ENABLE_MOCKS === "false") return
    const { worker, installMockControls } = await import("./mocks/browser")
    await worker.start({ onUnhandledFrame: "bypass", quiet: import.meta.env.PROD, serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` } })
    // Só depois de o worker estar ativo: `window.__mocks` presente significa "mocks prontos".
    installMockControls()
  } finally {
    openMockGate()
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)

// O MSW só começa depois do primeiro conteúdo pintado (FCP) e com o navegador ocioso. Avaliar o
// bundle dele (~420 kB) é uma tarefa longa: se rodasse antes do primeiro quadro, atrasaria FCP/LCP.
let mockingScheduled = false
function scheduleMocking() {
  if (mockingScheduled) return
  mockingScheduled = true
  const run = () => void startMocking()
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1_500 })
  else setTimeout(run, 200)
}

// Com sessão salva, o router precisa da API (GET /auth/session) ANTES de pintar rotas como /login e as
// privadas. Esperar o FCP seria esperar por algo que depende do próprio MSW: inicia já.
const hasStoredSession = localStorage.getItem(TOKEN_KEY) !== null
const alreadyPainted = performance.getEntriesByName("first-contentful-paint").length > 0
if (hasStoredSession || alreadyPainted || typeof PerformanceObserver === "undefined") {
  scheduleMocking()
} else {
  new PerformanceObserver((list, observer) => {
    // "first-paint" é só o fundo da página; esperamos o primeiro CONTEÚDO pintado.
    if (list.getEntriesByName("first-contentful-paint").length === 0) return
    observer.disconnect()
    scheduleMocking()
  }).observe({ type: "paint", buffered: true })
  // Teto de segurança (ex.: aba em segundo plano nunca pinta): o app não pode ficar sem dados.
  setTimeout(scheduleMocking, 3_000)
}
