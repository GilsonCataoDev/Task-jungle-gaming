import type { EthString } from "@/types/domain"

/** ETH tem 18 casas decimais. Toda conta é feita em wei (bigint) para não perder precisão. */
const DECIMALS = 18
const SCALE = 10n ** BigInt(DECIMALS)
const ETH_REGEX = /^\d+(\.\d{1,18})?$/

export type Wei = bigint

export function isEthString(value: string): boolean {
  return ETH_REGEX.test(value)
}

export function toWei(eth: EthString): Wei {
  if (!isEthString(eth)) throw new Error(`Valor ETH inválido: "${eth}"`)
  const [whole, fraction = ""] = eth.split(".")
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(DECIMALS, "0"))
}

/** Forma canônica: sem zeros à direita ("0.420" -> "0.42", "1.0" -> "1"). */
export function fromWei(wei: Wei): EthString {
  const whole = wei / SCALE
  const fraction = (wei % SCALE).toString().padStart(DECIMALS, "0").replace(/0+$/, "")
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function sumEth(values: EthString[]): EthString {
  return fromWei(values.reduce((acc, value) => acc + toWei(value), 0n))
}

export function addEth(a: EthString, b: EthString): EthString {
  return fromWei(toWei(a) + toWei(b))
}

export function subEth(a: EthString, b: EthString): EthString {
  const result = toWei(a) - toWei(b)
  return fromWei(result < 0n ? 0n : result)
}

export function mulEth(price: EthString, quantity: number): EthString {
  return fromWei(toWei(price) * BigInt(quantity))
}

/** Percentual em pontos-base (1000 = 10%). Arredonda para baixo. */
export function percentOfEth(value: EthString, basisPoints: number): EthString {
  return fromWei((toWei(value) * BigInt(basisPoints)) / 10_000n)
}

export function compareEth(a: EthString, b: EthString): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff < 0n ? -1 : 1
}

/** Exibição: mínimo de `minDecimals` casas, sem perder precisão. */
export function formatEth(value: EthString, minDecimals = 2): string {
  const [whole, fraction = ""] = fromWei(toWei(value)).split(".")
  return `${whole}.${fraction.padEnd(minDecimals, "0")} ETH`
}
