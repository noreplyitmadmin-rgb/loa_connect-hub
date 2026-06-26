import useSWR, { type SWRConfiguration, mutate as globalMutate } from "swr"
import useSWRMutation from "swr/mutation"
import type { SWRMutationConfiguration } from "swr/mutation"

export function dispatch403(path: string, message: string, method?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("app:toast", { detail: { message, path, method } })
    )
  }
}

const origFetch = typeof window !== "undefined" ? window.fetch.bind(window) : undefined

const recentToasts = new Set<string>()

async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = init?.method || (typeof input === "object" && "method" in input && (input as Request).method) || "GET"
  const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url
  const res = await origFetch!(input, init)
  if (res.status === 403) {
    const key = `${method}:${url}`
    if (!recentToasts.has(key)) {
      recentToasts.add(key)
      setTimeout(() => recentToasts.delete(key), 3000)
      const cloned = res.clone()
      cloned.json().then((body) => dispatch403(url, body.message || body.error || "Forbidden", method)).catch(() => {})
    }
  }
  return res
}

if (typeof window !== "undefined") window.fetch = patchedFetch as typeof fetch

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
