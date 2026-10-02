import { expect, test } from "@playwright/test"
import { confirmPurchase, DEMO, FEE, login, NFT, waitForApp } from "./helpers"

test("compra completa: mercado → login → carrinho → checkout → recibo confirmado", async ({ page }) => {
  await page.goto("/mercado")
  await waitForApp(page)
  await page.getByRole("button", { name: "Buscar NFTs" }).click()
  await page.getByRole("searchbox", { name: "Buscar NFTs" }).fill("Emerald")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/search=Emerald/)
  await page.getByRole("link", { name: `Ver ${NFT.emerald.name}` }).first().click()
  await expect(page.getByRole("heading", { level: 1, name: NFT.emerald.name })).toBeVisible()

  // Sem login, comprar leva ao modal de login e volta para o NFT.
  await page.getByRole("button", { name: "Comprar", exact: true }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await login(page, DEMO, `/nfts/${NFT.emerald.id}`)

  await page.getByRole("button", { name: "Comprar", exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByRole("heading", { name: "Resumo da carteira" })).toBeVisible()
  // 1.19 + taxa de rede 0.016, em decimal exato.
  await expect(page.getByText("1.206 ETH", { exact: true })).toBeVisible()
  await expect(page.getByText(`${FEE} ETH`, { exact: true })).toBeVisible()

  await page.getByRole("link", { name: "Conectar e finalizar" }).click()
  await expect(page).toHaveURL(/\/pagamento$/)
  await expect(page.getByLabel("Endereço da carteira")).toHaveValue(/^0xA91F/) // carteira principal já preenchida
  await confirmPurchase(page)

  // Recibo em modal.
  const receipt = page.getByRole("dialog", { name: "Recibo do pedido" })
  await expect(page).toHaveURL(/\/confirmacao\/GM-\d+/)
  await expect(receipt.getByRole("heading", { level: 1, name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 10_000 })
  await expect(receipt.getByText(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/)).toBeVisible()
  await expect(receipt.getByText("MetaMask")).toBeVisible()
  await expect(receipt.getByText("1.206 ETH").first()).toBeVisible()
  await expect(receipt.getByRole("link", { name: /Ver no Etherscan/ })).toBeVisible()

  // Fechar o modal volta para a home.
  await receipt.getByRole("button", { name: "Fechar" }).click()
  await expect(page).toHaveURL(/\/$/)
})
