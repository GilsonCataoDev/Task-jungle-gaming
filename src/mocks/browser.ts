import { setupWorker } from "msw/browser"
import { handlers } from "./handlers"
import { resetDb } from "./db"
import { connectedCount, disconnectAll, publish } from "./realtime"
import { applyScenarioFromUrl, getScenario, SCENARIOS, setScenario, type ScenarioName } from "./scenarios"
import { updateNft } from "./logic"
import type { NftUpdatedEvent, OrderUpdatedEvent } from "@/types/domain"

export const worker = setupWorker(...handlers)

/**
 * Painel de controle do "servidor" simulado, exposto em `window.__mocks`.
 * Tudo aqui age no servidor mock (banco, cenários, socket) e nunca na UI:
 * o cliente só descobre as mudanças por REST ou por eventos Socket.IO reais.
 */
export type MockControls = {
  scenarios: readonly ScenarioName[]
  getScenario(): ScenarioName
  setScenario(name: ScenarioName): void
  /** Restaura o banco para as fixtures e volta ao cenário "normal". */
  reset(): void
  /** Altera preço/estoque no servidor; ele emite `nft.updated` com versão nova. */
  updateNft(id: string, patch: { priceEth?: string; available?: number }): void
  /** Emite um frame bruto (permite testar eventos duplicados ou antigos). */
  emit(event: "nft.updated", payload: NftUpdatedEvent): void
  emit(event: "order.updated", payload: OrderUpdatedEvent): void
  disconnectSockets(): void
  connectedSockets(): number
}

export function installMockControls() {
  applyScenarioFromUrl()
  const controls: MockControls = {
    scenarios: SCENARIOS,
    getScenario,
    setScenario,
    reset() {
      resetDb()
      setScenario("normal")
    },
    updateNft(id, patch) {
      updateNft(id, patch)
    },
    emit(event, payload) {
      publish(event as "nft.updated", payload as NftUpdatedEvent)
    },
    disconnectSockets: disconnectAll,
    connectedSockets: connectedCount,
  }
  ;(window as unknown as { __mocks: MockControls }).__mocks = controls
}
