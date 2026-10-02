import { expect, test } from "@playwright/test"
import { DEMO, login, logout, MAYA, setScenario } from "./helpers"

// PNG 1x1 válido.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")
const NEW_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"

test.describe("perfil", () => {
  test("edita dados, valida e atualiza o nome no cabeçalho", async ({ page }) => {
    await login(page)
    await page.goto("/perfil")
    const main = page.getByRole("main")
    await main.getByLabel("Nome de exibição").fill("Nova S. Sato")
    await main.getByLabel("E-mail").fill("invalido")
    await main.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(main.getByText("Informe um e-mail válido.")).toBeVisible()

    await main.getByLabel("E-mail").fill("nova.novo@kurio.dev")
    await main.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(main.getByRole("status").filter({ hasText: "Dados salvos." })).toBeVisible()
    await expect(page.getByRole("link", { name: "Perfil de Nova S. Sato" })).toBeVisible()

    await page.reload()
    await expect(main.getByLabel("Nome de exibição")).toHaveValue("Nova S. Sato")
    await expect(main.getByLabel("E-mail")).toHaveValue("nova.novo@kurio.dev")
  })

  test("e-mail e usuário já usados por outra conta são recusados", async ({ page }) => {
    await login(page)
    await page.goto("/perfil")
    const main = page.getByRole("main")
    await main.getByLabel("E-mail").fill(MAYA.email)
    await main.getByLabel("Nome de usuário").fill("mayalin")
    await main.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(main.getByText("Este e-mail já está em uso.")).toBeVisible()
    await expect(main.getByText("Este nome de usuário já está em uso.")).toBeVisible()
  })

  test("envia avatar válido, rejeita arquivo que não é imagem e remove", async ({ page }) => {
    await login(page)
    await page.goto("/perfil")
    const main = page.getByRole("main")
    await main.getByLabel("Foto de perfil").setInputFiles({ name: "texto.txt", mimeType: "text/plain", buffer: Buffer.from("oi") })
    await expect(main.getByRole("alert")).toContainText("O arquivo precisa ser uma imagem.")

    await main.getByLabel("Foto de perfil").setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: PNG })
    await expect(main.getByRole("img", { name: `Foto de ${DEMO.name}` })).toBeVisible()
    await expect(page.getByRole("link", { name: `Perfil de ${DEMO.name}` }).locator("img")).toBeAttached() // aparece no cabeçalho
    await page.reload()
    await expect(main.getByRole("img", { name: `Foto de ${DEMO.name}` })).toBeVisible()

    await main.getByRole("button", { name: "Remover", exact: true }).click()
    await expect(main.getByRole("img", { name: `Foto de ${DEMO.name}` })).toHaveCount(0)
  })

  test("altera a senha (validando) e entra com a nova", async ({ page }) => {
    await login(page)
    await page.goto("/perfil")
    const main = page.getByRole("main")
    const save = main.getByRole("button", { name: "Salvar", exact: true })

    await main.getByLabel("Senha atual").fill("errada")
    await main.getByLabel("Nova senha", { exact: true }).fill("NovaSenha@1")
    await main.getByLabel("Confirmar nova senha").fill("NovaSenha@1")
    await save.click()
    await expect(main.getByText("Senha atual incorreta.")).toBeVisible()

    await main.getByLabel("Senha atual").fill(DEMO.password)
    await main.getByLabel("Nova senha", { exact: true }).fill("curta")
    await main.getByLabel("Confirmar nova senha").fill("curta")
    await save.click()
    await expect(main.getByText("A nova senha precisa ter ao menos 8 caracteres.")).toBeVisible()

    await main.getByLabel("Nova senha", { exact: true }).fill("NovaSenha@1")
    await main.getByLabel("Confirmar nova senha").fill("diferente")
    await save.click()
    await expect(main.getByText("As senhas não conferem.")).toBeVisible()

    await main.getByLabel("Confirmar nova senha").fill("NovaSenha@1")
    await save.click()
    await expect(main.getByRole("status").filter({ hasText: "Senha alterada." })).toBeVisible()

    await logout(page)
    await login(page, { ...DEMO, password: "NovaSenha@1" })
  })

  test("o menu lateral leva a Carteiras, Atividade e Lista de interesse; itens sem tela ficam desabilitados", async ({ page }) => {
    await login(page)
    await page.goto("/perfil")
    const menu = page.getByRole("navigation", { name: "Meu perfil" }).first()
    await expect(menu.getByRole("link", { name: "Dados do perfil" })).toHaveAttribute("aria-current", "page")
    await menu.getByRole("link", { name: "Atividade" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Atividade" })).toBeVisible()
    await expect(page.getByText("Você ainda não fez nenhuma compra.")).toBeVisible()
    await expect(menu.locator("[aria-disabled]").filter({ hasText: "Ofertas" })).toBeVisible()
  })
})

test.describe("carteiras (principal e secundária)", () => {
  test("troca a carteira principal e os dados persistem", async ({ page }) => {
    await login(page)
    await page.goto("/carteiras")
    const main = page.getByRole("main")
    const principal = main.getByRole("region", { name: "Carteira principal" })
    const secondary = main.getByRole("region", { name: "Carteira secundária" })
    await expect(principal.getByLabel("Endereço da carteira")).toHaveValue(/^0xA91F/)
    await expect(secondary.getByLabel("Endereço da carteira")).toHaveValue(/^0x3C9a/)

    const saved = page.waitForResponse((response) => response.request().method() === "PATCH" && response.ok())
    await secondary.getByRole("button", { name: "Tornar principal" }).click()
    await expect(principal.getByLabel("Endereço da carteira")).toHaveValue(/^0x3C9a/) // otimista
    await saved
    await page.reload()
    await expect(principal.getByLabel("Endereço da carteira")).toHaveValue(/^0x3C9a/)
    await expect(secondary.getByLabel("Endereço da carteira")).toHaveValue(/^0xA91F/)
  })

  test("edita a carteira principal e valida os campos", async ({ page }) => {
    await login(page)
    await page.goto("/carteiras")
    const principal = page.getByRole("main").getByRole("region", { name: "Carteira principal" })

    await principal.getByLabel("Código de indicação").fill("")
    await principal.getByLabel("Endereço da carteira").fill("0x123")
    await principal.getByRole("button", { name: "Salvar carteira" }).click()
    await expect(principal.getByText("Informe o código de indicação.")).toBeVisible()
    await expect(principal.getByText(/Endereço inválido/)).toBeVisible()
    await expect(principal.getByLabel("Código de indicação")).toHaveAttribute("aria-invalid", "true")

    await principal.getByLabel("Código de indicação").fill("KURIO-NOVO")
    await principal.getByLabel("Endereço da carteira").fill(NEW_ADDRESS)
    await principal.getByLabel("Apelido da carteira").fill("Cofre")
    await principal.getByRole("button", { name: "Salvar carteira" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Carteira principal salva." })).toBeVisible()
    await page.reload()
    await expect(principal.getByLabel("Apelido da carteira")).toHaveValue("Cofre")
    await expect(principal.getByLabel("Endereço da carteira")).toHaveValue(NEW_ADDRESS)
  })

  test("falha ao trocar a principal desfaz a mudança otimista", async ({ page }) => {
    await login(page)
    await page.goto("/carteiras")
    const main = page.getByRole("main")
    const secondary = main.getByRole("region", { name: "Carteira secundária" })
    await expect(secondary.getByRole("button", { name: "Tornar principal" })).toBeVisible()
    await setScenario(page, "mutation-error")
    await secondary.getByRole("button", { name: "Tornar principal" }).click()
    await expect(main.getByRole("alert")).toContainText("A alteração foi desfeita")
    await expect(main.getByRole("region", { name: "Carteira principal" }).getByLabel("Endereço da carteira")).toHaveValue(/^0xA91F/)
  })

  test("sem carteira secundária: adiciona uma nova (com 'Igual à carteira principal')", async ({ page }) => {
    await login(page, MAYA)
    await page.goto("/carteiras")
    const main = page.getByRole("main")
    const secondary = main.getByRole("region", { name: "Carteira secundária" })
    await expect(secondary.getByText("Você ainda não adicionou uma carteira secundária.")).toBeVisible()
    await secondary.getByRole("button", { name: "Adicionar" }).click()

    await secondary.getByLabel("Igual à carteira principal").check()
    await expect(secondary.getByLabel("Nome de exibição")).toHaveValue("Maya Lin") // repete os dados do dono
    await secondary.getByRole("button", { name: "Salvar carteira" }).click()
    await expect(secondary.getByText("Informe o apelido da carteira.")).toBeVisible()

    await secondary.getByLabel("Apelido da carteira").fill("Reserva")
    await secondary.getByLabel("Rede").selectOption("Polygon")
    await secondary.getByLabel("Endereço da carteira").fill(NEW_ADDRESS)
    await secondary.getByLabel("Tipo de carteira").selectOption("WalletConnect")
    await secondary.getByLabel("Nome ENS").fill("maya.reserva")
    await secondary.getByRole("button", { name: "Salvar carteira" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Carteira secundária salva." })).toBeVisible()
    await page.reload()
    await expect(secondary.getByLabel("Apelido da carteira")).toHaveValue("Reserva")
  })

  test("carteira de um usuário não aparece para outro", async ({ page }) => {
    await login(page)
    await page.goto("/carteiras")
    const main = page.getByRole("main")
    await expect(main.getByLabel("Apelido da carteira").nth(1)).toHaveValue("Reserva")
    await logout(page)
    await login(page, MAYA)
    await page.goto("/carteiras")
    await expect(main.getByRole("region", { name: "Carteira principal" }).getByLabel("Endereço da carteira")).toHaveValue(/^0xbDA5/)
    await expect(main.getByText("Você ainda não adicionou uma carteira secundária.")).toBeVisible()
  })
})
