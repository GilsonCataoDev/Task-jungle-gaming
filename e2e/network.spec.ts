import { expect, test } from "@playwright/test"
import { addToCartFromDetail, NFT, setScenario, waitForApp, waitForMocks } from "./helpers"

/** Condições de rede e cupom: falha de conexão, latência variável com respostas fora de ordem, cupom expirado. */
test.describe("rede e cupons", () => {
  test("falha de conexão: catálogo mostra erro de rede e recupera ao tentar de novo", async ({ page }) => {
    await page.goto("/mercado?scenario=offline")
    const alert = page.getByRole("alert")
    await expect(alert).toContainText("Sem conexão com o servidor")
    await waitForMocks(page)
    await setScenario(page, "normal")
    await alert.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(page.locator("article").first()).toBeVisible()
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  test("latência variável: respostas chegam fora de ordem no servidor simulado", async ({ page }) => {
    await page.goto("/mercado?scenario=variable-latency")
    await waitForMocks(page)
    // Cinco buscas disparadas em sequência. Com a latência decrescente do cenário, a última termina antes da primeira.
    const finished = await page.evaluate(async () => {
      const order: number[] = []
      await Promise.all(
        [0, 1, 2, 3, 4].map((index) =>
          fetch(`/api/nfts?search=${["Emerald", "Violet", "Golden", "Ivory", "Crimson"][index]}`).then(() => {
            order.push(index)
          }),
        ),
      )
      return order
    })
    expect(finished).not.toEqual([0, 1, 2, 3, 4])
    expect(finished[0]).toBeGreaterThan(finished[finished.length - 1])
  })

  test("latência variável: a tela mostra só o resultado do último filtro, nunca o de uma resposta velha", async ({ page }) => {
    await page.goto("/mercado?scenario=variable-latency")
    await waitForApp(page)
    const filters = page.getByRole("complementary", { name: "Filtros" })
    const music = filters.getByRole("button", { name: /^Música \(\d+\)/ })
    await expect(music).toBeVisible()
    const musicCount = Number(/\((\d+)\)/.exec((await music.textContent()) ?? "")?.[1])
    expect(musicCount).toBeGreaterThan(0)
    expect(musicCount).toBeLessThan(36)

    // Dois filtros em sequência: o segundo é mais rápido e a resposta do primeiro (36 -> Arte digital) chega depois.
    await filters.getByRole("button", { name: /^Arte digital/ }).click()
    await filters.getByRole("button", { name: /^Música/ }).click()
    await expect(page).toHaveURL(/category=M%C3%BAsica|category=Música/)
    await expect(page.getByText(`${musicCount} resultados`)).toBeAttached()
    await page.waitForTimeout(2_500) // tempo de sobra para a resposta velha chegar, se ainda estivesse viva
    await expect(page.getByText(`${musicCount} resultados`)).toBeAttached()
    await expect(page.getByText("12 resultados")).toHaveCount(0)
  })

  test("cupom expirado é recusado com mensagem própria e bloqueia a finalização", async ({ page }) => {
    await addToCartFromDetail(page, NFT.emerald.id) // como visitante
    await page.getByRole("textbox", { name: "Código promocional" }).fill("NATAL20")
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(page.getByRole("alert").filter({ hasText: "Cupom expirado" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Conectar e finalizar" })).toHaveAttribute("aria-disabled", "true")

    await page.getByRole("textbox", { name: "Código promocional" }).fill("KURIO10")
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(page.getByText("Cupom KURIO10 aplicado.")).toBeVisible()
  })
})
