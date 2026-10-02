import { http } from "msw"
import { beginPublic, fail } from "../http"
import { EMAIL_REGEX } from "../validation"
import { HttpResponse } from "msw"

/** Inscrição na newsletter do rodapé ("Antecipe-se ao próximo lançamento"). Não guarda nada. */
export const newsletterHandlers = [
  http.post("/api/newsletter", async ({ request }) => {
    const early = await beginPublic({ mutation: true })
    if (early) return early
    const body = (await request.json()) as { email?: string }
    if (!body.email || !EMAIL_REGEX.test(body.email)) return fail(422, "validation_error", "Informe um e-mail válido.", { email: "Informe um e-mail válido." })
    return new HttpResponse(null, { status: 204 })
  }),
]
