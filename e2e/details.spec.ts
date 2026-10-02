import { expect, test } from "@playwright/test"
import { NFT, setScenario, shown, waitForMocks } from "./helpers"

test.describe("acesso direto e detalhe", () => {
  test("detalhe aberto por URL direta, recarregável e com as seções do Figma", async ({ page }) => {
    await page.goto(`/nfts/${NFT.emerald.id}`)
    await expect(page.getByRole("heading", { level: 1, name: NFT.emerald.name })).toBeVisible()
    await expect(shown(page.getByText("1.19 ETH", { exact: true })).first()).toBeVisible()
    await expect(page.getByText("19 avaliações de colecionadores")).toBeVisible()
    await expect(page.getByText("ID do token: #0042")).toBeVisible()
    await expect(page.getByText("Atributos: Óculos, Esmeralda")).toBeVisible()
    await page.reload()
    await expect(page.getByRole("heading", { level: 1, name: NFT.emerald.name })).toBeVisible()
  })

  test("galeria troca o enquadramento e a imagem pode ser ampliada", async ({ page }) => {
    await page.goto(`/nfts/${NFT.emerald.id}`)
    await expect(page.getByRole("radio", { name: "Visão geral" })).toBeChecked()
    await page.getByRole("radio", { name: "Detalhe do rosto" }).click()
    await expect(page.getByRole("img", { name: /detalhe do rosto/i })).toBeVisible()

    await page.getByRole("button", { name: "Ampliar imagem" }).click()
    const zoom = page.getByRole("dialog", { name: "Imagem ampliada" })
    await expect(zoom).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(zoom).toBeHidden()
  })

  test("edição, quantidade e abas funcionam", async ({ page }) => {
    await page.goto(`/nfts/${NFT.emerald.id}`)
    await page.getByText("1/10", { exact: true }).click() // o rádio é visualmente oculto: clica na etiqueta
    await expect(page.getByRole("radio", { name: "1/10" })).toBeChecked()

    const quantity = page.getByRole("group", { name: "Quantidade de edições" }).first()
    await quantity.getByRole("button", { name: "Aumentar quantidade" }).click()
    await expect(quantity.getByRole("status", { name: "Quantidade", exact: true })).toHaveText("2")

    await expect(page.getByRole("tab", { name: "Detalhes do NFT" })).toHaveAttribute("aria-selected", "true")
    await page.getByRole("tab", { name: /Avaliações de colecionadores/ }).click()
    await expect(page.getByRole("tabpanel").getByText("Iris Vale")).toBeVisible()
  })

  test("recurso inexistente mostra estado de erro com saída", async ({ page }) => {
    await page.goto("/nfts/nao-existe")
    await expect(page.getByRole("alert")).toContainText("NFT não encontrado.")
    await page.getByRole("link", { name: "Voltar ao mercado" }).click()
    await expect(page).toHaveURL(/\/mercado$/)
  })

  test("rota inexistente mostra 404", async ({ page }) => {
    await page.goto("/pagina/que/nao/existe")
    await expect(page.getByRole("heading", { name: "Esta página não existe." })).toBeVisible()
  })

  test("rota privada sem sessão leva ao login (em modal) e preserva o destino", async ({ page }) => {
    await page.goto("/carteiras")
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcarteiras/)
    await expect(page.getByRole("dialog", { name: "Entrar" })).toBeVisible()
  })

  test("Criadores e Aprenda avisam que chegam em breve", async ({ page }) => {
    await page.goto("/criadores")
    await expect(page.getByRole("heading", { level: 1, name: "Criadores" })).toBeVisible()
    await expect(page.getByText("chega em breve")).toBeVisible()
    await page.goto("/aprenda")
    await expect(page.getByRole("heading", { level: 1, name: "Aprenda" })).toBeVisible()
  })

  test("NFT esgotado não pode ser comprado", async ({ page }) => {
    await page.goto(`/nfts/${NFT.soldOut.id}`)
    await expect(shown(page.getByRole("button", { name: "Esgotado" })).first()).toBeDisabled()
  })

  test("falha do servidor na primeira carga permite tentar de novo", async ({ page }) => {
    await page.goto(`/nfts/${NFT.emerald.id}?scenario=server-error`)
    await expect(page.getByRole("alert")).toContainText("Serviço indisponível")
    await waitForMocks(page)
    await setScenario(page, "normal")
    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(page.getByRole("heading", { level: 1, name: NFT.emerald.name })).toBeVisible()
  })
})
