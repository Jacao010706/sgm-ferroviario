/**
 * Cliente Supabase para o navegador (painel CCO).
 *
 * Devolve null quando o Supabase nao esta configurado. O Realtime e uma
 * melhoria, nao uma dependencia: sem ele o painel segue no polling de
 * 60s, exatamente como funcionava antes.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[CCO] Supabase nao configurado - seguindo no polling de 60s");
    client = null;
    return null;
  }

  try {
    client = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  } catch (e) {
    console.warn("[CCO] falha ao iniciar o Supabase - seguindo no polling:", e);
    client = null;
  }

  return client;
}
