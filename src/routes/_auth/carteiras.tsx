import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/features/auth/hooks"
import { ProfileLayout } from "@/features/profile/profile-layout"
import { useCreateWallet, useUpdateWallet, useWallets } from "@/features/wallets/hooks"
import { EMPTY_WALLET, WalletForm } from "@/features/wallets/wallet-form"
import { getApiError } from "@/lib/api"
import type { Wallet, WalletInput } from "@/types/domain"

export const Route = createFileRoute("/_auth/carteiras")({ component: WalletsPage })

/** Os dados editáveis da carteira (sem `id` nem `isPrimary`). */
function toInput(wallet: Wallet): WalletInput {
  const { id, isPrimary, ...input } = wallet
  void id
  void isPrimary
  return input
}

function WalletsPage() {
  const { user } = useSession()
  const wallets = useWallets()
  const create = useCreateWallet()
  const update = useUpdateWallet()
  const [adding, setAdding] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  const primary = wallets.data?.find((wallet) => wallet.isPrimary)
  const secondary = wallets.data?.find((wallet) => !wallet.isPrimary)
  const defaults: WalletInput = { ...EMPTY_WALLET, displayName: user?.name ?? "", email: user?.email ?? "", ens: user?.ens ?? "" }
  /** "Igual à carteira principal": repete os dados do dono (nome, perfil, indicação, e-mail). */
  const secondaryDefaults: WalletInput = sameAsPrimary && primary
    ? { ...EMPTY_WALLET, displayName: primary.displayName, profileName: primary.profileName, referralCode: primary.referralCode, email: primary.email }
    : EMPTY_WALLET

  const errorOf = (error: unknown) => (error ? getApiError(error) : null)
  const createError = errorOf(create.error)
  const updateError = errorOf(update.error)

  function savePrimary(values: WalletInput) {
    setSaved(null)
    if (primary) update.mutate({ id: primary.id, ...values }, { onSuccess: () => setSaved("Carteira principal salva.") })
    else create.mutate(values, { onSuccess: () => setSaved("Carteira principal salva.") })
  }
  function saveSecondary(values: WalletInput) {
    setSaved(null)
    if (secondary) update.mutate({ id: secondary.id, ...values }, { onSuccess: () => setSaved("Carteira secundária salva.") })
    else create.mutate(values, { onSuccess: () => { setAdding(false); setSaved("Carteira secundária salva.") } })
  }

  return (
    <ProfileLayout active="/carteiras" title="Carteiras">
      {wallets.isPending && <Skeleton className="mt-6 h-96 bg-card" aria-label="Carregando carteiras" />}
      {wallets.isError && !wallets.data && (
        <div role="alert" className="mt-6 bg-card p-6"><p>{getApiError(wallets.error).message}</p><button type="button" onClick={() => void wallets.refetch()} className="mt-2 font-bold text-primary underline">Tentar novamente</button></div>
      )}

      {wallets.data && (
        <div className="mt-6 space-y-12">
          <section aria-labelledby="carteira-principal">
            <h2 id="carteira-principal" className="text-lg font-bold">Carteira principal</h2>
            <p className="mt-1 text-sm text-tan">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
            <WalletForm
              key={primary ? JSON.stringify(primary) : "nova-principal"}
              idPrefix="principal"
              initial={primary ? toInput(primary) : defaults}
              submitLabel="Salvar carteira"
              pending={primary ? update.isPending : create.isPending}
              serverErrors={(primary ? updateError : createError)?.fields}
              onSubmit={savePrimary}
            />
          </section>

          <section aria-labelledby="carteira-secundaria">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 id="carteira-secundaria" className="text-lg font-bold">Carteira secundária</h2>
              <div className="flex items-center gap-5 text-sm">
                {!secondary && adding && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={sameAsPrimary} onChange={(event) => setSameAsPrimary(event.target.checked)} className="size-4 appearance-none rounded-full border border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_var(--background)]" />
                    Igual à carteira principal
                  </label>
                )}
                {!secondary && !adding && <button type="button" onClick={() => setAdding(true)} disabled={!primary} className="font-bold text-primary hover:underline disabled:opacity-50">Adicionar</button>}
                {secondary && (
                  <button type="button" disabled={update.isPending} onClick={() => update.mutate({ id: secondary.id, isPrimary: true })} className="font-bold text-primary hover:underline disabled:opacity-60">Tornar principal</button>
                )}
              </div>
            </div>

            {!secondary && !adding && <p className="mt-2 text-sm text-tan">Você ainda não adicionou uma carteira secundária.</p>}
            {(secondary || adding) && (
              <WalletForm
                key={secondary ? JSON.stringify(secondary) : `nova-secundaria-${sameAsPrimary}`}
                idPrefix="secundaria"
                initial={secondary ? toInput(secondary) : secondaryDefaults}
                submitLabel="Salvar carteira"
                pending={secondary ? update.isPending : create.isPending}
                serverErrors={(secondary ? updateError : createError)?.fields}
                onSubmit={saveSecondary}
              />
            )}
          </section>

          {(createError && !createError.fields) && <p role="alert" className="text-sm text-destructive">{createError.message}</p>}
          {(updateError && !updateError.fields) && <p role="alert" className="text-sm text-destructive">{updateError.message} A alteração foi desfeita.</p>}
          {updateError?.fields?.isPrimary && <p role="alert" className="text-sm text-destructive">{updateError.fields.isPrimary}</p>}
          {saved && <p role="status" className="text-sm text-primary">{saved}</p>}
        </div>
      )}
    </ProfileLayout>
  )
}
