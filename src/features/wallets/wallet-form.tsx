import { useState, type ChangeEvent, type FormEvent } from "react"
import { EnsField, SelectField, TextField } from "@/components/form-field"
import { validateCollectorFields, type FieldErrors } from "@/lib/validation"
import { NETWORKS, WALLET_TYPES, type WalletInput } from "@/types/domain"

export const EMPTY_WALLET: WalletInput = {
  displayName: "",
  nickname: "",
  network: "Ethereum",
  profileName: "",
  address: "",
  secondaryRef: "",
  type: "MetaMask",
  referralCode: "",
  email: "",
  ens: "",
}

type Props = {
  /** Prefixo dos ids (a tela tem dois formulários: principal e secundária). */
  idPrefix: string
  initial: WalletInput
  submitLabel: string
  pending: boolean
  /** Erros que vieram do servidor, por campo. */
  serverErrors?: FieldErrors
  onSubmit: (values: WalletInput) => void
}

/** Formulário de carteira (10 campos do Figma). Valida no cliente e mostra também os erros do servidor. */
export function WalletForm({ idPrefix, initial, submitLabel, pending, serverErrors, onSubmit }: Props) {
  const [values, setValues] = useState<WalletInput>(initial)
  const [clientErrors, setClientErrors] = useState<FieldErrors>({})
  const errors: FieldErrors = { ...serverErrors, ...clientErrors }
  const id = (name: string) => `${idPrefix}-${name}`
  // Os erros chegam com o nome do campo, sem prefixo.
  const bind = (name: keyof WalletInput) => ({
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues({ ...values, [name]: event.target.value })
      if (clientErrors[name]) setClientErrors({ ...clientErrors, [name]: "" })
    },
    error: errors[name] || undefined,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateCollectorFields(values as unknown as Record<string, string>, { network: "network", address: "address", walletType: "type" }, {
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
    setClientErrors(found)
    if (Object.keys(found).length === 0) onSubmit({ ...values, secondaryRef: values.secondaryRef.trim() })
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4">
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        <TextField {...bind("displayName")} id={id("displayName")} label="Nome de exibição" required />
        <TextField {...bind("nickname")} id={id("nickname")} label="Apelido da carteira" required />
        <SelectField {...bind("network")} id={id("network")} label="Rede" required options={NETWORKS} placeholder="Selecione uma rede" />
        <TextField {...bind("profileName")} id={id("profileName")} label="Nome do perfil" required />
        <TextField {...bind("address")} id={id("address")} label="Endereço da carteira" required placeholder="Endereço 0x da carteira" autoComplete="off" />
        <TextField {...bind("secondaryRef")} id={id("secondaryRef")} label="ENS ou carteira secundária (opcional)" hideLabel placeholder="ENS ou carteira secundária (opcional)" wrapperClassName="md:mt-[1.625rem]" />
        <SelectField {...bind("type")} id={id("type")} label="Tipo de carteira" required options={WALLET_TYPES} placeholder="Selecione uma carteira" />
        <TextField {...bind("referralCode")} id={id("referralCode")} label="Código de indicação" required />
        <TextField {...bind("email")} id={id("email")} label="E-mail" required type="email" autoComplete="email" />
        <EnsField {...bind("ens")} id={id("ens")} label="Nome ENS" required />
      </div>
      <button type="submit" disabled={pending} className="mt-5 h-10 rounded-sm bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60">
        {pending ? "Salvando..." : submitLabel}
      </button>
    </form>
  )
}
