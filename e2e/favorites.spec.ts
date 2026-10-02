import { expect, test } from "@playwright/test"
import { login, NFT, setScenario } from "./helpers"

const { golden } = NFT

test.describe("favoritos", () => {
  test("visitante é levado ao login ao favoritar", async ({ page }) => {
    await page.goto(`/nfts/${golden.id}`)
    await page.getByRole("button", { name: `Favoritar ${golden.name}` }).click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test("favorita de forma otimista, persiste e aparece na lista de interesse", async ({ page }) => {
    await login(page)
    await page.goto(`/nfts/${golden.id}`)
    const button = page.getByRole("button", { name: new RegExp(golden.name) })
    await expect(button).toHaveAttribute("aria-pressed", "false")
    const saved = page.waitForResponse((response) => response.url().includes(`/api/favorites/${golden.id}`) && response.request().method() === "PUT")
    await button.click()
    await expect(button).toHaveAttribute("aria-pressed", "true") // otimista: já na tela
    await saved // ...e só recarregamos depois do servidor gravar
    await page.reload()
    await expect(page.getByRole("button", { name: `Remover ${golden.name} dos favoritos` })).toHaveAttribute("aria-pressed", "true")

    await page.goto("/lista-de-interesse")
    await expect(page.getByRole("article", { name: golden.name })).toBeVisible()
    await expect(page.getByRole("article", { name: NFT.emerald.name })).toBeVisible() // o favorito que já existia
  })

  test("falha na API desfaz a alteração otimista e a recuperação funciona", async ({ page }) => {
    await login(page)
    await page.goto(`/nfts/${golden.id}`)
    const added = page.waitForResponse((response) => response.request().method() === "PUT" && response.ok())
    await page.getByRole("button", { name: `Favoritar ${golden.name}` }).click()
    await expect(page.getByRole("button", { name: `Remover ${golden.name} dos favoritos` })).toHaveAttribute("aria-pressed", "true")
    await added

    // O servidor passa a falhar: remover parece funcionar na tela, mas volta atrás (rollback).
    await setScenario(page, "mutation-error")
    await page.getByRole("button", { name: `Remover ${golden.name} dos favoritos` }).click()
    await expect(page.getByRole("alert")).toContainText("A alteração foi desfeita")
    await expect(page.getByRole("button", { name: `Remover ${golden.name} dos favoritos` })).toHaveAttribute("aria-pressed", "true")

    // Servidor recuperado: a mesma ação agora persiste.
    await setScenario(page, "normal")
    const removed = page.waitForResponse((response) => response.request().method() === "DELETE" && response.ok())
    await page.getByRole("button", { name: `Remover ${golden.name} dos favoritos` }).click()
    await expect(page.getByRole("button", { name: `Favoritar ${golden.name}` })).toHaveAttribute("aria-pressed", "false")
    await removed
    await page.reload()
    await expect(page.getByRole("button", { name: `Favoritar ${golden.name}` })).toHaveAttribute("aria-pressed", "false")
  })

  test("o coração do cartão também favorita (passando o mouse)", async ({ page }) => {
    await login(page)
    await page.goto("/mercado?search=Golden%20Beat")
    const card = page.getByRole("article", { name: golden.name })
    await card.hover()
    await card.getByRole("button", { name: `Favoritar ${golden.name}` }).first().click({ trial: false })
    await expect(card.getByRole("button", { name: `Remover ${golden.name} dos favoritos` }).first()).toHaveAttribute("aria-pressed", "true")
  })
})
