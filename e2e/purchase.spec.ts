import { expect, test } from "@playwright/test"
import { buyButton, confirmPurchase, DEMO, FEE, isNarrow, login, NFT, shown, waitForApp } from "./helpers"

test("compra completa: mercado → login → carrinho → checkout → recibo confirmado", async ({ page }) => {
  // A interface de busca em si é testada em catalog.spec; aqui a busca entra pela URL para valer nos dois layouts.
  await page.goto("/mercado?search=Emerald")
  await waitForApp(page)
  await page.getByRole("link", { name: `Ver ${NFT.emerald.name}` }).first().click()
  await expect(page.getByRole("heading", { level: 1, name: NFT.emerald.name })).toBeVisible()

  // Sem login, comprar leva ao modal de login e volta para o NFT.
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await login(page, DEMO, `/nfts/${NFT.emerald.id}`)

  await buyButton(page).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  // 1.19 + taxa de rede 0.016, em decimal exato (o resumo detalhado com a taxa só existe no layout desktop).
  await expect(shown(page.getByText("1.206 ETH", { exact: true })).first()).toBeVisible()
  if (!isNarrow(page)) {
    await expect(page.getByRole("heading", { name: "Resumo da carteira" })).toBeVisible()
    await expect(page.getByText(`${FEE} ETH`, { exact: true })).toBeVisible()
  }

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
