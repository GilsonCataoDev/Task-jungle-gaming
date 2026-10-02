import { expect, test } from "@playwright/test"
import { addToCartFromDetail, apiOrders, confirmPurchase, goToCheckout, login, logout, MAYA, NFT, shown, waitForApp } from "./helpers"

const { emerald } = NFT

test.describe("tempo real (Socket.IO)", () => {
  test("preço muda no servidor durante o checkout: total atualiza sem recarregar e a compra usa o valor novo", async ({ page }) => {
    await goToCheckout(page)
    await expect(shown(page.getByText("1.206 ETH", { exact: true })).first()).toBeVisible()

    // O "servidor" altera o preço e emite nft.updated pelo socket (a UI não é tocada).
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "1.50" }), emerald.id)
    await expect(shown(page.getByText("1.516 ETH", { exact: true })).first()).toBeVisible()

    await confirmPurchase(page)
    const receipt = page.getByRole("dialog", { name: "Recibo do pedido" })
    await expect(receipt.getByText("1.516 ETH").first()).toBeVisible({ timeout: 10_000 })
  })

  test("item esgota durante o checkout: aviso aparece e a compra é bloqueada", async ({ page }) => {
    await goToCheckout(page)
    await page.evaluate((id) => window.__mocks.updateNft(id, { available: 0 }), emerald.id)
    await expect(page.getByRole("alert").filter({ hasText: "indisponível" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeDisabled()
  })

  test("preço ao vivo na página de detalhe e no carrinho", async ({ page }) => {
    await login(page)
    await addToCartFromDetail(page, emerald.id)
    await expect(shown(page.getByText("1.19 ETH", { exact: true })).first()).toBeVisible()
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "1.80" }), emerald.id)
    await expect(shown(page.getByText("1.80 ETH", { exact: true })).first()).toBeVisible()

    await page.goto(`/nfts/${NFT.golden.id}`)
    await waitForApp(page)
    await expect(shown(page.getByText("0.99 ETH", { exact: true })).first()).toBeVisible()
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "0.90" }), NFT.golden.id)
    await expect(shown(page.getByText("0.90 ETH", { exact: true })).first()).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: "Preço atualizado ao vivo" })).toBeVisible()
  })

  test("catálogo reflete mudança de preço e de estoque em tempo real", async ({ page }) => {
    await page.goto("/mercado?search=Golden%20Beat")
    await waitForApp(page)
    const card = page.getByRole("article", { name: NFT.golden.name })
    await expect(card).toContainText("0.99 ETH")
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "0.77", available: 0 }), NFT.golden.id)
    await expect(card).toContainText("Esgotado")
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "0.77", available: 3 }), NFT.golden.id)
    await expect(card).toContainText("0.77 ETH")
  })
  test("eventos de pedido só chegam ao dono; sair ou trocar de usuário encerra a conexão anterior", async ({ page }) => {
    await goToCheckout(page) // Nova Sato
    await confirmPurchase(page)
    const [{ id: orderId }] = await apiOrders(page)
    const deliveries = (event: string) => page.evaluate(([name, id]) => window.__mocks.deliveries().filter((item) => item.event === name && item.id === id), [event, orderId])

    // O pedido avança (processando -> confirmado) e cada evento vai só para a conexão da Nova.
    await expect.poll(async () => (await deliveries("order.updated")).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(2)
    expect((await deliveries("order.updated")).every((item) => item.to === "u_demo")).toBe(true)

    await page.getByRole("dialog", { name: "Recibo do pedido" }).getByRole("button", { name: "Fechar" }).click() // o modal deixa o resto da página inerte
    // Sair: a conexão da Nova cai e nasce outra, de visitante, que não recebe eventos de pedido.
    await logout(page)
    await expect.poll(() => page.evaluate(() => window.__mocks.connectedSockets())).toBe(1)
    const afterLogout = (await deliveries("order.updated")).length
    await page.evaluate((id) => window.__mocks.emit("order.updated", { id, version: 99, status: "refused", transactionId: null }), orderId)
    await page.waitForTimeout(400)
    expect((await deliveries("order.updated")).length).toBe(afterLogout)

    // Outro usuário: o pedido da Nova continua sem chegar à conexão da Maya.
    await login(page, MAYA)
    await expect.poll(() => page.evaluate(() => window.__mocks.connectedSockets())).toBe(1)
    await page.evaluate((id) => window.__mocks.emit("order.updated", { id, version: 100, status: "refused", transactionId: null }), orderId)
    await page.waitForTimeout(400)
    expect((await deliveries("order.updated")).some((item) => item.to === "u_maya")).toBe(false)
  })
})
