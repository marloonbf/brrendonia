import { supabase } from "./supabase";

type Json = Record<string, any> | any[] | null;

function getApiBase(): string {
  const raw = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  if (!raw) return "";
  // Evita Mixed Content: se vier http://, ignora e usa same-origin (/api)
  if (raw.startsWith("http://")) return "";
  // Aceita apenas https:// ou caminho relativo
  return raw;
}

function joinUrl(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

/**
 * apiFetch:
 * - sempre chama a API same-origin por padrão: /api/...
 * - adiciona Authorization: Bearer <supabase_access_token> quando existir
 * - se requireAuth=true e não tiver sessão, lança erro
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<T> {
  const prefix = ((import.meta as any).env?.VITE_API_PREFIX as string | undefined) || "/api";
  const apiBase = getApiBase();

  // token do Supabase
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (requireAuth && !token) {
    throw new Error("SEM_SESSAO");
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = joinUrl(apiBase, joinUrl(prefix, path));

  const res = await fetch(url, { ...options, headers });

  const text = await res.text();
  let json: Json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text ? { raw: text } : null;
  }

  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && "error" in json && (json as any).error) ||
      `HTTP_${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}
