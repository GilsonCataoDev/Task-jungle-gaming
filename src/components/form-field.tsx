import { ChevronDown, Eye, EyeOff } from "lucide-react"
import { useState, type ComponentProps, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Campos de formulário do Kurio. Todos ligam label (`htmlFor`), dica e erro (`aria-describedby`) e
 * marcam `aria-invalid`. O asterisco de obrigatório é decorativo (`aria-hidden`): o estado fica em
 * `aria-required`, então o nome acessível da label continua limpo ("Nome de exibição").
 */
type Common = { id: string; label: string; error?: string; hint?: string; required?: boolean; wrapperClassName?: string; /** Esconde a label só visualmente (continua para leitores de tela). */ hideLabel?: boolean }

function Field({ id, label, error, hint, required, wrapperClassName, hideLabel, children }: Common & { children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm text-foreground"}>
        {label}
        {required && <span aria-hidden className="ml-0.5 text-primary">*</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

const describedBy = (id: string, error?: string, hint?: string) => [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined

export function TextField({ id, label, error, hint, required, wrapperClassName, hideLabel, className, ...input }: Common & Omit<ComponentProps<"input">, "id">) {
  return (
    <Field {...{ id, label, error, hint, required, wrapperClassName, hideLabel }}>
      <input id={id} name={id} aria-invalid={!!error} aria-required={required} aria-describedby={describedBy(id, error, hint)} className={cn("field-control", className)} {...input} />
    </Field>
  )
}

/** Senha com botão de mostrar/ocultar (ícone de olho do Figma). */
export function PasswordField({ id, label, error, hint, required, wrapperClassName, hideLabel, className, ...input }: Common & Omit<ComponentProps<"input">, "id" | "type">) {
  const [visible, setVisible] = useState(false)
  return (
    <Field {...{ id, label, error, hint, required, wrapperClassName, hideLabel }}>
      <div className="relative">
        <input id={id} name={id} type={visible ? "text" : "password"} aria-invalid={!!error} aria-required={required} aria-describedby={describedBy(id, error, hint)} className={cn("field-control pr-11", className)} {...input} />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-tan hover:text-primary">
          {visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
        </button>
      </div>
    </Field>
  )
}

export function SelectField({ id, label, error, hint, required, wrapperClassName, hideLabel, className, options, placeholder, ...select }: Common & Omit<ComponentProps<"select">, "id"> & { options: readonly string[]; placeholder?: string }) {
  return (
    <Field {...{ id, label, error, hint, required, wrapperClassName, hideLabel }}>
      <div className="relative">
        <select id={id} name={id} aria-invalid={!!error} aria-required={required} aria-describedby={describedBy(id, error, hint)} className={cn("field-control appearance-none pr-10", className)} {...select}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-tan" />
      </div>
    </Field>
  )
}

export function TextAreaField({ id, label, error, hint, required, wrapperClassName, hideLabel, className, ...textarea }: Common & Omit<ComponentProps<"textarea">, "id">) {
  return (
    <Field {...{ id, label, error, hint, required, wrapperClassName, hideLabel }}>
      <textarea id={id} name={id} aria-invalid={!!error} aria-required={required} aria-describedby={describedBy(id, error, hint)} className={cn("field-control h-32 resize-y py-2", className)} {...textarea} />
    </Field>
  )
}

/** Campo ENS: sufixo ".eth" ao lado do nome (como no Figma). */
export function EnsField({ id, label, error, required, wrapperClassName, ...input }: Common & Omit<ComponentProps<"input">, "id">) {
  return (
    <Field {...{ id, label, error, required, wrapperClassName }}>
      <div className="flex gap-2">
        <span className="field-control flex w-20 shrink-0 items-center justify-between text-tan" aria-hidden>
          .eth
          <ChevronDown className="size-4" />
        </span>
        <input id={id} name={id} aria-invalid={!!error} aria-required={required} aria-describedby={describedBy(id, error)} className="field-control" {...input} />
      </div>
    </Field>
  )
}
