/** Só caminhos internos: evita open-redirect (`//evil.com`, `https://...`). */
export const safePath = (value: unknown) => (typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : undefined)
