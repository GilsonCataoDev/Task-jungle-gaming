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

  test("edição indisponível não pode ser escolhida nem comprada", async ({ page }) => {
    await page.goto(`/nfts/${NFT.emerald.id}`) // a edição 1/1 deste NFT já foi vendida
    await expect(page.getByRole("radio", { name: "1/1 (indisponível)" })).toBeDisabled()
    await expect(page.getByRole("radio", { name: "1/10" })).toBeEnabled()
    // O servidor também recusa: a regra não depende de a tela esconder a opção.
    const status = await page.evaluate(async (id) => {
      const response = await fetch("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nftId: id, edition: "1/1" }) })
      return { status: response.status, code: (await response.json()).code }
    }, NFT.emerald.id)
    expect(status).toEqual({ status: 409, code: "edition_unavailable" })
  })

  test("limite de quantidade: segue o estoque e o teto de cada edição", async ({ page }) => {
    await page.goto("/nfts/sage-nomad-009") // 4 em estoque; a 1/1 é única e a 1/10 está vendida
    const quantity = page.getByRole("group", { name: "Quantidade de edições" }).first()
    const more = quantity.getByRole("button", { name: "Aumentar quantidade" })
    const value = quantity.getByRole("status", { name: "Quantidade", exact: true })

    for (let i = 0; i < 6; i++) if (await more.isEnabled()) await more.click()
    await expect(value).toHaveText("4") // edição 1/50: limitada ao estoque
    await expect(more).toBeDisabled()

    await page.getByText("1/1", { exact: true }).click() // edição única: no máximo 1, e a quantidade já escolhida é reduzida
    await expect(value).toHaveText("1")
    await expect(more).toBeDisabled()
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

  test("Criadores mostra quem fez o projeto e Aprenda avisa que chega em breve", async ({ page }) => {
    await page.goto("/criadores")
    await expect(page.getByRole("heading", { level: 1, name: "Criadores" })).toBeVisible()
    await expect(page.getByText("Gilson Catão", { exact: true })).toBeVisible()
    const github = page.getByRole("link", { name: /github\.com\/GilsonCataoDev/ })
    await expect(github).toHaveAttribute("href", "https://github.com/GilsonCataoDev")
    await expect(github).toHaveAttribute("target", "_blank")
    await expect(github).toHaveAttribute("rel", /noopener/)
    await page.goto("/aprenda")
    await expect(page.getByRole("heading", { level: 1, name: "Aprenda" })).toBeVisible()
    await expect(page.getByText("chega em breve")).toBeVisible()
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
