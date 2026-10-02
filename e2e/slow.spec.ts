import { expect, test } from "@playwright/test"
import { DEMO, NFT, setScenario, waitForApp, waitForMocks } from "./helpers"

test.describe("carregamento lento e recuperação", () => {
  test("mostra esqueleto enquanto carrega e troca pelo conteúdo", async ({ page }) => {
    await page.goto("/mercado?scenario=slow")
    const skeleton = page.getByLabel("Carregando NFTs")
    await expect(skeleton).toBeVisible()
    await expect(page.locator("article").first()).toBeVisible({ timeout: 15_000 })
    await expect(skeleton).toBeHidden()
  })

  test("detalhe lento mostra esqueleto e depois o NFT", async ({ page }) => {
    await page.goto(`/nfts/${NFT.emerald.id}?scenario=slow`)
    await expect(page.getByLabel("Carregando NFT")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: NFT.emerald.name })).toBeVisible({ timeout: 15_000 })
  })

  test("na paginação a lista anterior continua na tela enquanto a nova carrega (sem piscar)", async ({ page }) => {
    await page.goto("/mercado")
    await waitForApp(page)
    const catalog = page.getByRole("region", { name: "Mercado de NFTs" })
    await expect(catalog.locator("article")).toHaveCount(9)
    await setScenario(page, "slow")

    await page.getByRole("button", { name: "Página 2" }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(catalog.locator("article")).toHaveCount(9) // lista antiga segue visível
    await expect(catalog.getByLabel("Carregando NFTs")).toHaveCount(0) // sem voltar para esqueleto
    await expect(page.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page")
  })

  test("falha do servidor no catálogo oferece nova tentativa e recupera", async ({ page }) => {
    await page.goto("/mercado?scenario=server-error")
    const alert = page.getByRole("alert")
    await expect(alert).toContainText("Serviço indisponível")
    await waitForMocks(page)
    await setScenario(page, "normal")
    await alert.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(page.locator("article").first()).toBeVisible()
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  test("login e carrinho lentos mostram esqueleto e depois o conteúdo", async ({ page }) => {
    await page.goto("/login?redirect=%2Fcarrinho&scenario=slow")
    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await dialog.getByLabel("E-mail", { exact: true }).fill(DEMO.email)
    await dialog.getByLabel("Senha", { exact: true }).fill(DEMO.password)
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(dialog.getByRole("button", { name: "Enviando..." })).toBeDisabled() // feedback imediato no botão
    await expect(page.getByLabel("Carregando carrinho")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible({ timeout: 15_000 })
  })
})
