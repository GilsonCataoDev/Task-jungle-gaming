import { NETWORKS, WALLET_TYPES } from "@/types/domain"

/**
 * Validação do lado do cliente (resposta imediata). O servidor valida de novo e é a palavra final:
 * os erros dele chegam em `fields` e são mostrados nos mesmos campos.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
const ENS_REGEX = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i

export type FieldErrors = Record<string, string>

const blank = (value: unknown) => typeof value !== "string" || value.trim() === ""

/** Campos do "Perfil do colecionador" (checkout) e das carteiras. */
export function validateCollectorFields(
  values: Record<string, string>,
  keys: { network: string; address: string; walletType: string },
  required: Record<string, string>,
): FieldErrors {
  const errors: FieldErrors = {}
  for (const [key, label] of Object.entries(required)) {
    if (blank(values[key])) errors[key] = `Informe ${label}.`
  }
  if (!errors[keys.network] && !(NETWORKS as readonly string[]).includes(values[keys.network])) errors[keys.network] = "Selecione uma rede."
  if (!errors[keys.walletType] && !(WALLET_TYPES as readonly string[]).includes(values[keys.walletType])) errors[keys.walletType] = "Selecione um tipo de carteira."
  if (!errors[keys.address] && !ADDRESS_REGEX.test(values[keys.address].trim())) errors[keys.address] = "Endereço inválido (0x + 40 caracteres hexadecimais)."
  if (!errors.email && !EMAIL_REGEX.test(values.email.trim())) errors.email = "Informe um e-mail válido."
  if (!errors.ens && !ENS_REGEX.test(values.ens.trim())) errors.ens = "Nome ENS inválido."
  return errors
}
