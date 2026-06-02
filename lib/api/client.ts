import useSWR, { type SWRConfiguration, mutate as globalMutate } from "swr"
import useSWRMutation from "swr/mutation"
import type { SWRMutationConfiguration } from "swr/mutation"

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

async function mutator<T = unknown>(
  url: string,
  { arg }: { arg: { method?: string; body?: unknown } }
): Promise<T> {
  const res = await fetch(url, {
    method: arg.method || "POST",
    headers: { "Content-Type": "application/json" },
    body: arg.body ? JSON.stringify(arg.body) : undefined,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export function useApiGet<T = unknown>(
  url: string | null,
  config?: SWRConfiguration
) {
  return useSWR<T>(url, fetcher, config)
}

export function useApiMutate<T = unknown>(
  url: string,
  config?: SWRMutationConfiguration<T, Error, string, { method?: string; body?: unknown }>
) {
  return useSWRMutation<T, Error, string, { method?: string; body?: unknown }>(url, mutator, config)
}

export function invalidate(...keys: string[]) {
  return keys.map((k) => globalMutate(k))
}
