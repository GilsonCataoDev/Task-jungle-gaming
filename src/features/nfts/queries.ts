import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import axios from "axios"
import { api } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import type { Facets, Nft, NftDetail, NftListParams, Paginated } from "@/types/domain"

export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: qk.nfts.list(params),
    // `signal` cancela a requisição quando a busca muda: respostas obsoletas nunca chegam ao cache.
    queryFn: async ({ signal }) => (await api.get<Paginated<Nft>>("/nfts", { params, signal })).data,
    // Mantém a página anterior na tela enquanto a nova carrega (sem piscar para skeleton).
    placeholderData: keepPreviousData,
  })

export const nftDetailQuery = (id: string) =>
  queryOptions({
    queryKey: qk.nfts.detail(id),
    queryFn: async ({ signal }) => (await api.get<NftDetail>(`/nfts/${id}`, { signal })).data,
    // 4xx (ex.: 404) não se resolve tentando de novo.
    retry: (count, error) => !(axios.isAxiosError(error) && String(error.response?.status).startsWith("4")) && count < 1,
  })

/** Contagens da barra lateral, limites de preço e NFT em destaque. */
export const nftFacetsQuery = queryOptions({
  queryKey: qk.nfts.facets,
  queryFn: async ({ signal }) => (await api.get<Facets>("/nfts/facets", { signal })).data,
  staleTime: 60_000,
})
