import type { SVGProps } from "react"

/** Ícones de marca (o lucide-react não traz logos de terceiros). Decorativos: `aria-hidden`. */
type IconProps = SVGProps<SVGSVGElement>
const base = { "aria-hidden": true, focusable: false, viewBox: "0 0 24 24", fill: "currentColor" } as const

export const FacebookIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.6V3.4c-.3 0-1.300-.1-2.400-.1-2.400 0-4 1.400-4 4.100v2.400H7.600V13h2.700v8h3.200Z" />
  </svg>
)
export const InstagramIcon = (props: IconProps) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
    <rect x="3.500" y="3.500" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.200" cy="6.800" r="1" fill="currentColor" stroke="none" />
  </svg>
)
export const TwitterIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21.500 6.500c-.7.300-1.400.5-2.100.6.800-.5 1.300-1.200 1.600-2.100-.7.400-1.500.7-2.300.9a3.700 3.700 0 0 0-6.300 3.400A10.500 10.500 0 0 1 4.800 5.500a3.700 3.700 0 0 0 1.100 4.900c-.6 0-1.200-.2-1.700-.5 0 1.800 1.300 3.300 3 3.700-.6.200-1.100.2-1.700.1.500 1.500 1.900 2.600 3.500 2.600A7.400 7.400 0 0 1 3.500 18a10.500 10.500 0 0 0 5.700 1.700c6.800 0 10.600-5.700 10.400-10.800.7-.5 1.400-1.200 1.900-1.900Z" />
  </svg>
)
export const LinkedinIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4.500 9h3v10.500h-3V9Zm1.500-4.800a1.800 1.800 0 1 1 0 3.600 1.800 1.800 0 0 1 0-3.600ZM9.700 9h2.900v1.400c.4-.8 1.400-1.700 3-1.700 3.100 0 3.700 2 3.700 4.700v6.100h-3v-5.400c0-1.300 0-2.900-1.800-2.900s-2 1.400-2 2.800v5.500h-3V9Z" />
  </svg>
)
export const YoutubeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21.600 8.200a2.500 2.500 0 0 0-1.800-1.800C18.200 6 12 6 12 6s-6.200 0-7.800.4A2.500 2.500 0 0 0 2.400 8.200C2 9.800 2 12 2 12s0 2.200.4 3.800a2.500 2.500 0 0 0 1.800 1.800C5.800 18 12 18 12 18s6.200 0 7.800-.4a2.500 2.500 0 0 0 1.800-1.800c.4-1.600.4-3.800.4-3.800s0-2.200-.4-3.800ZM10 15V9l5.200 3L10 15Z" />
  </svg>
)

/** Logo "G" colorido do Google. */
export const GoogleIcon = (props: IconProps) => (
  <svg {...base} fill="none" {...props}>
    <path fill="#EA4335" d="M12 10.200v3.900h5.500c-.2 1.300-1.600 3.800-5.500 3.800a6 6 0 0 1 0-12c1.900 0 3.100.8 3.800 1.500l2.600-2.500A9.500 9.500 0 0 0 12 2.500a9.500 9.500 0 0 0 0 19c5.500 0 9.100-3.800 9.100-9.300 0-.6-.1-1.100-.2-1.600H12Z" />
    <path fill="#4285F4" d="M21.100 12.200c0-.6-.1-1.100-.2-1.600H12v3.900h5.500a4.700 4.700 0 0 1-2 3.100l3.100 2.400c1.800-1.700 2.500-4.100 2.500-7.800Z" />
    <path fill="#FBBC05" d="M6.400 14.300a5.800 5.800 0 0 1 0-4.600L3.200 7.200a9.500 9.500 0 0 0 0 9.600l3.200-2.500Z" />
    <path fill="#34A853" d="M12 21.500c2.600 0 4.800-.9 6.400-2.400l-3.100-2.400c-.9.600-2 .9-3.300.9-2.500 0-4.700-1.700-5.500-4l-3.200 2.500A9.500 9.500 0 0 0 12 21.500Z" />
  </svg>
)

/** "f" azul do Facebook. */
export const FacebookColorIcon = (props: IconProps) => (
  <svg {...base} fill="#3b5998" {...props}>
    <path d="M13.500 21v-8h2.700l.4-3.200h-3.100V7.800c0-.9.3-1.500 1.600-1.500h1.600V3.400c-.3 0-1.300-.1-2.400-.1-2.400 0-4 1.400-4 4.100v2.400H7.600V13h2.700v8h3.200Z" />
  </svg>
)

/** Envelope "Thank you" da confirmação de compra (traço laranja). */
export const ThankYouIcon = (props: IconProps) => (
  <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false} {...props}>
    <path d="M12 34 40 54l28-20v34a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V34Z" />
    <path d="M12 34 40 14l28 20" />
    <rect x="22" y="22" width="36" height="22" rx="2" fill="var(--card)" />
    <path d="M28 29h24M28 36h24" strokeWidth={4} />
  </svg>
)

/** Ícone de leitura de QR do botão central da barra inferior. */
export const ScanIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false} {...props}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M7 12h10" />
  </svg>
)
