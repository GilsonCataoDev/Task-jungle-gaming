import { formatDiscount, formatEth } from "@/lib/format"
import type { EthString } from "@/types/domain"

type Props = { subtotalEth: EthString; discountEth: EthString; networkFeeEth: EthString; totalEth: EthString; busy?: boolean; /** Recibo: só taxa, desconto (se houver) e total. */ receipt?: boolean }

/** Subtotal, desconto do lançamento, taxa de rede (estimada) e total: o mesmo bloco do carrinho, checkout e recibo. */
export function Totals({ subtotalEth, discountEth, networkFeeEth, totalEth, busy, receipt }: Props) {
  return (
    <dl className="space-y-2 text-base" aria-busy={busy}>
      {!receipt && <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{formatEth(subtotalEth, 2)}</dd></div>}
      {(!receipt || discountEth !== "0") && <div className="flex justify-between gap-4"><dt>Desconto do lançamento</dt><dd>{formatDiscount(discountEth)}</dd></div>}
      <div>
        <div className="flex justify-between gap-4"><dt>Taxa de rede</dt><dd>{formatEth(networkFeeEth, 3)}</dd></div>
        {!receipt && <p className="text-right text-xs text-primary">Taxa estimada</p>}
      </div>
      <div className="flex justify-between gap-4 pt-3 font-bold"><dt>Total</dt><dd className="text-primary">{formatEth(totalEth, 3)}</dd></div>
    </dl>
  )
}
