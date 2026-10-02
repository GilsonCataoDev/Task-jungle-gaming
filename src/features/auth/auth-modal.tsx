import { Link, useNavigate } from "@tanstack/react-router"
import { useState, type FormEvent } from "react"
import { FacebookColorIcon, GoogleIcon } from "@/components/icons"
import { PasswordField, TextField } from "@/components/form-field"
import { Modal } from "@/components/modal"
import { Logo } from "@/components/site-header"
import { getApiError } from "@/lib/api"
import { EMAIL_REGEX } from "@/lib/validation"
import { cn } from "@/lib/utils"
import { useLogin, useRegister } from "./hooks"

type Props = { mode: "login" | "signup"; redirect?: string; reason?: "expired" }

const UNAVAILABLE = "Este recurso não está disponível na demonstração."
const submitButton = "h-11 w-full rounded-sm bg-primary text-base font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60"

/** Modal "Entrar | Criar conta". No mobile vira tela cheia, com logo e link para alternar. */
export function AuthModal({ mode, redirect, reason }: Props) {
  const navigate = useNavigate()
  const login = useLogin()
  const register = useRegister()
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const isLogin = mode === "login"
  const mutation = isLogin ? login : register
  const apiError = mutation.error ? getApiError(mutation.error) : null
  const errors: Record<string, string> = { ...apiError?.fields, ...clientErrors }
  const generalError = apiError && !apiError.fields ? apiError.message : null
  const done = () => void navigate({ href: redirect ?? "/" })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    const form = new FormData(event.currentTarget)
    const get = (name: string) => String(form.get(name) ?? "")

    if (isLogin) {
      setClientErrors({})
      login.mutate({ email: get("email").trim(), password: get("password") }, { onSuccess: done })
      return
    }
    const found: Record<string, string> = {}
    if (get("username").trim().length < 3) found.username = "Informe um nome de usuário com ao menos 3 caracteres."
    if (!EMAIL_REGEX.test(get("email").trim())) found.email = "Informe um e-mail válido."
    if (get("password").length < 8) found.password = "A senha precisa ter ao menos 8 caracteres."
    if (get("confirm") !== get("password")) found.confirm = "As senhas não conferem."
    setClientErrors(found)
    if (Object.keys(found).length) return
    register.mutate({ username: get("username").trim(), email: get("email").trim(), password: get("password") }, { onSuccess: done })
  }

  const tab = (active: boolean) => cn("px-3 text-lg font-bold", active ? "text-primary" : "text-foreground hover:text-primary")

  return (
    <Modal label={isLogin ? "Entrar" : "Criar conta"} onClose={() => void navigate({ to: "/" })}>
      <div className="px-6 pb-8 pt-10 md:px-[4.5rem] md:pt-9">
        <div className="hidden items-center justify-center md:flex">
          <Link to="/login" search={{ redirect }} aria-current={isLogin ? "page" : undefined} className={tab(isLogin)}>Entrar</Link>
          <span aria-hidden className="h-5 w-px bg-primary/70" />
          <Link to="/cadastro" search={{ redirect }} aria-current={!isLogin ? "page" : undefined} className={tab(!isLogin)}>Criar conta</Link>
        </div>

        <div className="mt-10 text-center md:hidden">
          <Logo className="text-3xl" />
          <h1 className="mt-14 text-xl">{isLogin ? "Entrar" : "Criar perfil de colecionador"}</h1>
        </div>
        <h1 className="sr-only max-md:hidden">{isLogin ? "Entrar" : "Criar conta"}</h1>

        <p className="mt-6 text-center text-sm max-md:hidden">
          {isLogin ? "Entre para gerenciar sua carteira, coleção e perfil de criador." : "Crie seu perfil de colecionador e conecte uma carteira quando quiser."}
        </p>
        {reason === "expired" && <p role="alert" className="mt-4 rounded-sm border border-primary/50 p-3 text-center text-sm">Sua sessão expirou. Entre novamente para continuar.</p>}

        <form onSubmit={submit} noValidate className="mt-6 space-y-4 max-md:mt-10">
          {isLogin ? (
            <>
              <TextField id="email" label="E-mail" hideLabel type="email" autoComplete="email" placeholder="contato@email.com" error={errors.email} data-autofocus />
              <div>
                <PasswordField id="password" label="Senha" hideLabel autoComplete="current-password" placeholder="Senha" error={errors.password} />
                <div className="mt-2 text-right">
                  <button type="button" onClick={() => setNotice(UNAVAILABLE)} className="text-sm text-primary hover:underline">Esqueceu a senha?</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <TextField id="username" label="Nome de usuário" hideLabel autoComplete="username" placeholder="Nome de usuário" error={errors.username} data-autofocus />
              <TextField id="email" label="E-mail" hideLabel type="email" autoComplete="email" placeholder="Digite seu e-mail" error={errors.email} />
              <PasswordField id="password" label="Senha" hideLabel autoComplete="new-password" placeholder="Senha" error={errors.password} />
              <PasswordField id="confirm" label="Confirmar senha" hideLabel autoComplete="new-password" placeholder="Confirmar senha" error={errors.confirm} />
            </>
          )}
          {generalError && <p role="alert" className="text-sm text-destructive">{generalError}</p>}
          <button type="submit" disabled={mutation.isPending} className={cn(submitButton, "mt-2")}>
            {mutation.isPending ? "Enviando..." : isLogin ? "Entrar" : (<><span className="max-md:hidden">Criar conta</span><span className="md:hidden">Criar perfil</span></>)}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3 text-xs">
          <span aria-hidden className="h-px flex-1 bg-input" />
          Ou continue com
          <span aria-hidden className="h-px flex-1 bg-input" />
        </div>
        <div className="mt-5 space-y-3">
          <button type="button" onClick={() => setNotice(UNAVAILABLE)} className="flex h-10 w-full items-center justify-center gap-3 rounded-sm border border-input text-sm text-tan hover:border-primary">
            <GoogleIcon className="size-5" /> Continuar com Google
          </button>
          <button type="button" onClick={() => setNotice(UNAVAILABLE)} className="flex h-10 w-full items-center justify-center gap-3 rounded-sm border border-input text-sm text-tan hover:border-primary">
            <FacebookColorIcon className="size-5" /> Continuar com Facebook
          </button>
        </div>
        {notice && <p role="status" className="mt-4 text-center text-sm text-tan">{notice}</p>}

        <p className="mt-10 text-center text-base text-tan md:hidden">
          {isLogin ? (
            <>Novo na Kurio? <Link to="/cadastro" search={{ redirect }} className="text-primary underline">Crie uma conta</Link></>
          ) : (
            <>Já tem uma conta? <Link to="/login" search={{ redirect }} className="text-primary underline">Entre</Link></>
          )}
        </p>
      </div>
    </Modal>
  )
}
