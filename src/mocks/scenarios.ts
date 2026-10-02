/**
 * Cenários de falha configuráveis. Troque por:
 *   - URL:      http://localhost:5173/?scenario=slow
 *   - Console:  window.__mocks.setScenario("payment-rejected")
 */
export const SCENARIOS = [
  "normal",
  "slow", // todas as respostas levam ~2.5s
  "variable-latency", // latência de 80 ms a 1,7 s, determinística: respostas chegam fora de ordem
  "offline", // falha de conexão: nenhuma requisição chega ao servidor (erro de rede, sem resposta HTTP)
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
  variableTick = 0
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

/**
 * "variable-latency": 80 ms + (0..10) x 160 ms, em sequência fixa que DECRESCE a cada requisição. Duas requisições
 * seguidas terminam, portanto, em ordem inversa: reproduz sempre o mesmo cenário de resposta velha chegando depois.
 */
let variableTick = 0

export function latencyMs(): number {
  const scenario = getScenario()
  if (scenario === "slow") return SLOW_LATENCY_MS
  if (scenario === "variable-latency") return 80 + (((-variableTick++ % 11) + 11) % 11) * 160
  return DEFAULT_LATENCY_MS
}

/** Lê ?scenario=... uma vez no boot (útil para Playwright e para o avaliador). */
export function applyScenarioFromUrl() {
  const fromUrl = new URLSearchParams(window.location.search).get("scenario")
  if (isScenario(fromUrl)) setScenario(fromUrl)
}
