import { NETWORKS, WALLET_TYPES, type Collector, type WalletInput } from "@/types/domain"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
const ENS_REGEX = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i

type Fields = Record<string, string>

const blank = (value: unknown) => typeof value !== "string" || value.trim() === ""

/** Regras de cada campo; `label` entra na mensagem "Informe ...". */
function checkCommon(input: Record<string, unknown>, keys: { network: string; address: string; walletType: string }, required: Record<string, string>): Fields {
  const errors: Fields = {}
  for (const [key, label] of Object.entries(required)) {
    if (blank(input[key])) errors[key] = `Informe ${label}.`
  }
  if (!errors[keys.network] && !(NETWORKS as readonly string[]).includes(String(input[keys.network]))) errors[keys.network] = "Selecione uma rede."
  if (!errors[keys.walletType] && !(WALLET_TYPES as readonly string[]).includes(String(input[keys.walletType]))) errors[keys.walletType] = "Selecione um tipo de carteira."
  if (!errors[keys.address] && !ADDRESS_REGEX.test(String(input[keys.address]).trim())) errors[keys.address] = "Endereço inválido (0x + 40 caracteres hexadecimais)."
  if (!errors.email && !EMAIL_REGEX.test(String(input.email).trim())) errors.email = "Informe um e-mail válido."
  if (!errors.ens && !ENS_REGEX.test(String(input.ens).trim())) errors.ens = "Nome ENS inválido."
  return errors
}

/** Formulário "Perfil do colecionador" do checkout. */
export function validateCollector(input: Partial<Collector>): Fields {
  return checkCommon(input as Record<string, unknown>, { network: "network", address: "address", walletType: "walletType" }, {
    displayName: "o nome de exibição",
    username: "o nome de usuário",
    network: "a rede",
    profileName: "o nome do perfil",
    address: "o endereço da carteira",
    walletType: "o tipo de carteira",
    referralCode: "o código de indicação",
    email: "o e-mail",
    ens: "o nome ENS",
  })
}

/** Formulário de carteira (principal ou secundária). */
export function validateWallet(input: Partial<WalletInput>): Fields {
  return checkCommon(input as Record<string, unknown>, { network: "network", address: "address", walletType: "type" }, {
    displayName: "o nome de exibição",
    nickname: "o apelido da carteira",
    network: "a rede",
    profileName: "o nome do perfil",
    address: "o endereço da carteira",
    type: "o tipo de carteira",
    referralCode: "o código de indicação",
    email: "o e-mail",
    ens: "o nome ENS",
  })
}

export { EMAIL_REGEX }
