import { createFileRoute } from "@tanstack/react-router"
import { UserRound } from "lucide-react"
import { useRef, useState, type FormEvent } from "react"
import { EnsField, PasswordField, TextField } from "@/components/form-field"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileLayout } from "@/features/profile/profile-layout"
import { useChangePassword, useProfile, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from "@/features/profile/hooks"
import { getApiError } from "@/lib/api"
import { EMAIL_REGEX, type FieldErrors } from "@/lib/validation"

export const Route = createFileRoute("/_auth/perfil")({ component: ProfilePage })

function ProfilePage() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const avatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const password = useChangePassword()
  const fileInput = useRef<HTMLInputElement>(null)
  const [clientErrors, setClientErrors] = useState<FieldErrors>({})
  const [saved, setSaved] = useState<string[]>([])

  const errors: FieldErrors = { ...(update.error ? getApiError(update.error).fields : {}), ...(password.error ? getApiError(password.error).fields : {}), ...clientErrors }
  const avatarError = avatar.error ? (getApiError(avatar.error).fields?.avatar ?? getApiError(avatar.error).message) : undefined
  const generalError = [update.error, password.error].map((error) => (error ? getApiError(error) : null)).find((error) => error && !error.fields)

  if (profile.isPending) return <ProfileLayout active="/perfil" title="Perfil do colecionador"><Skeleton className="mt-6 h-96 bg-card" aria-label="Carregando perfil" /></ProfileLayout>
  if (!profile.data) {
    return (
      <ProfileLayout active="/perfil" title="Perfil do colecionador">
        <div role="alert" className="mt-6 bg-card p-6"><p>{getApiError(profile.error).message}</p><button type="button" className="mt-2 font-bold text-primary underline" onClick={() => void profile.refetch()}>Tentar novamente</button></div>
      </ProfileLayout>
    )
  }
  const user = profile.data

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const get = (name: string) => String(form.get(name) ?? "")
    const input = { name: get("name").trim(), username: get("username").trim(), email: get("email").trim(), ens: get("ens").trim(), walletNickname: get("walletNickname").trim() }
    const current = get("currentPassword")
    const next = get("newPassword")
    const confirm = get("confirmPassword")
    const wantsPassword = !!(current || next || confirm)

    const found: FieldErrors = {}
    if (!input.name) found.name = "Informe o nome de exibição."
    if (input.username.length < 3) found.username = "Informe um nome de usuário com ao menos 3 caracteres."
    if (!EMAIL_REGEX.test(input.email)) found.email = "Informe um e-mail válido."
    if (!input.ens) found.ens = "Informe o nome ENS."
    if (!input.walletNickname) found.walletNickname = "Informe o apelido da carteira."
    if (wantsPassword) {
      if (!current) found.currentPassword = "Informe a senha atual."
      if (next.length < 8) found.newPassword = "A nova senha precisa ter ao menos 8 caracteres."
      if (confirm !== next) found.confirmPassword = "As senhas não conferem."
    }
    setClientErrors(found)
    setSaved([])
    if (Object.keys(found).length) return

    update.mutate(input, {
      onSuccess: () => {
        if (!wantsPassword) return setSaved(["Dados salvos."])
        password.mutate({ currentPassword: current, newPassword: next }, { onSuccess: () => { setSaved(["Dados salvos.", "Senha alterada."]); formElement.reset() } })
      },
    })
  }

  return (
    <ProfileLayout active="/perfil" title="Perfil do colecionador">
      <form onSubmit={submit} noValidate key={`${user.name}|${user.username}|${user.email}|${user.ens}|${user.walletNickname}`} className="mt-6">
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          <div className="space-y-5">
            <TextField id="name" label="Nome de exibição" required defaultValue={user.name} error={errors.name} autoComplete="name" />
            <TextField id="email" label="E-mail" required type="email" defaultValue={user.email} error={errors.email} autoComplete="email" />
            <TextField id="walletNickname" label="Apelido da carteira" required defaultValue={user.walletNickname} error={errors.walletNickname} />
          </div>
          <div className="space-y-5">
            <TextField id="username" label="Nome de usuário" required defaultValue={user.username} error={errors.username} autoComplete="username" />
            <EnsField id="ens" label="Nome ENS" required defaultValue={user.ens} error={errors.ens} />
            <div>
              <p className="text-sm">Avatar</p>
              <div className="mt-2 flex items-center gap-4">
                {user.avatarUrl ? <img src={user.avatarUrl} alt={`Foto de ${user.name}`} className="size-[50px] rounded-full object-cover" /> : <span aria-hidden className="grid size-[50px] place-items-center rounded-full bg-card text-primary"><UserRound className="size-6" /></span>}
                <button type="button" onClick={() => fileInput.current?.click()} disabled={avatar.isPending} className="h-10 rounded-sm bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60">{avatar.isPending ? "Enviando…" : "Alterar"}</button>
                {user.avatarUrl && <button type="button" onClick={() => removeAvatar.mutate()} disabled={removeAvatar.isPending} className="text-sm hover:text-primary">Remover</button>}
                <input ref={fileInput} type="file" accept="image/*" aria-label="Foto de perfil" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) avatar.mutate(file); event.target.value = "" }} />
              </div>
              {avatarError && <p role="alert" className="mt-2 text-sm text-destructive">{avatarError}</p>}
            </div>
          </div>
        </div>

        <h2 className="mt-10 text-base font-bold">Alterar senha</h2>
        <div className="mt-4 max-w-md space-y-5">
          <PasswordField id="currentPassword" label="Senha atual" autoComplete="current-password" error={errors.currentPassword} />
          <PasswordField id="newPassword" label="Nova senha" autoComplete="new-password" hint="Mínimo de 8 caracteres." error={errors.newPassword} />
          <PasswordField id="confirmPassword" label="Confirmar nova senha" autoComplete="new-password" error={errors.confirmPassword} />
        </div>

        {generalError && <p role="alert" className="mt-5 text-sm text-destructive">{generalError.message}</p>}
        {saved.map((message) => <p key={message} role="status" className="mt-5 text-sm text-primary">{message}</p>)}
        <button type="submit" disabled={update.isPending || password.isPending} className="mt-6 h-10 rounded-sm bg-primary px-8 font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60">
          {update.isPending || password.isPending ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </ProfileLayout>
  )
}
