/**
 * Cenários de falha configuráveis. Troque por:
 *   - URL:      http://localhost:5173/?scenario=slow
 *   - Console:  window.__mocks.setScenario("payment-rejected")
 */
export const SCENARIOS = [
  "normal",
  "slow", // todas as respostas levam ~2.5s
  "timeout", // 1x: POST /orders cria o pedido mas só responde depois do timeout do cliente
  "server-error", // 503 em tudo (exceto sessão)
  "mutation-error", // 500 em favoritos/carrinho/perfil/carteiras (testa rollback otimista)
  "session-expired", // 401 session_expired em toda rota autenticada
  "price-change", // 1x: preço do carrinho sobe antes de criar o pedido
  "payment-rejected", // POST /orders => 402
  "inventory-conflict", // 1x: outro comprador leva o estoque antes do pedido
] as const

export type ScenarioName = (typeof SCENARIOS)[number]

const SCENARIO_KEY = "kurio:scenario"
const DEFAULT_LATENCY_MS = 60
const SLOW_LATENCY_MS = 2_500

export function isScenario(value: string | null | undefined): value is ScenarioName {
  return !!value && (SCENARIOS as readonly string[]).includes(value)
}

export function getScenario(): ScenarioName {
  try {
    const stored = localStorage.getItem(SCENARIO_KEY)
    return isScenario(stored) ? stored : "normal"
  } catch {
    return "normal"
  }
}

export function setScenario(name: ScenarioName) {
  try {
    localStorage.setItem(SCENARIO_KEY, name)
  } catch {
    /* ignore */
  }
}

/** Cenários "one-shot" voltam para normal depois de disparar. */
export function consumeScenario(name: ScenarioName): boolean {
  if (getScenario() !== name) return false
  setScenario("normal")
  return true
}

export function latencyMs(): number {
  return getScenario() === "slow" ? SLOW_LATENCY_MS : DEFAULT_LATENCY_MS
}

/** Lê ?scenario=... uma vez no boot (útil para Playwright e para o avaliador). */
export function applyScenarioFromUrl() {
  const fromUrl = new URLSearchParams(window.location.search).get("scenario")
  if (isScenario(fromUrl)) setScenario(fromUrl)
}
