import { NextRequest, NextResponse } from "next/server";

// Proxy do painel CCO para o backend FastAPI.
//
// O painel costumava fazer login no navegador com credenciais de admin
// escritas no codigo. Qualquer um que abrisse a tela e olhasse o codigo-fonte
// ficava com acesso de administrador ao backend inteiro -- e essa tela vive
// num monitor de sala de controle. Agora as credenciais ficam so aqui, no
// servidor, e o navegador conversa apenas com esta rota.

const API_BASE = (process.env.PANEL_API_URL
  || "https://laudable-peace-production-09cd.up.railway.app").replace(/\/+$/, "");

let tokenCache: string | null = null;

async function obterToken(forcar = false): Promise<string | null> {
  if (tokenCache && !forcar) return tokenCache;

  const email = process.env.PANEL_API_EMAIL;
  const password = process.env.PANEL_API_PASSWORD;
  if (!email || !password) return null;

  try {
    const r = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (!r.ok) {
      console.error("[cco] login no backend falhou:", r.status, await r.text());
      return null;
    }
    const d = await r.json();
    tokenCache = d?.access_token ?? null;
    return tokenCache;
  } catch (e) {
    console.error("[cco] erro no login do backend:", e);
    return null;
  }
}

// Reaproveita o caminho exato que o navegador pediu, em vez de remontar a
// partir dos segmentos. O FastAPI distingue /assets/ de /assets e responde
// com redirecionamento no segundo caso -- remontar perdia a barra final.
function caminhoOriginal(req: NextRequest): string {
  const p = req.nextUrl.pathname.replace(/^\/api\/cco/, "");
  return p.startsWith("/") ? p : "/" + p;
}

async function encaminhar(req: NextRequest, corpo?: string) {
  if (req.cookies.get("cco_sessao")?.value !== "ok") {
    return NextResponse.json({ erro: "Sessao do CCO ausente" }, { status: 401 });
  }

  if (!process.env.PANEL_API_EMAIL || !process.env.PANEL_API_PASSWORD) {
    return NextResponse.json(
      { erro: "PANEL_API_EMAIL / PANEL_API_PASSWORD nao configurados no servidor" },
      { status: 503 },
    );
  }

  const url = `${API_BASE}/api/v1${caminhoOriginal(req)}${req.nextUrl.search || ""}`;

  const chamar = async (token: string) =>
    fetch(url, {
      method: corpo === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(corpo !== undefined ? { body: corpo } : {}),
      redirect: "follow",
      cache: "no-store",
    });

  let token = await obterToken();
  if (!token) {
    return NextResponse.json(
      { erro: "Falha ao autenticar no backend -- confira PANEL_API_EMAIL e PANEL_API_PASSWORD" },
      { status: 502 },
    );
  }

  let r = await chamar(token);
  if (r.status === 401) {                 // token expirado: renova e repete
    token = await obterToken(true);
    if (token) r = await chamar(token);
  }

  const texto = await r.text();
  if (!r.ok) console.error("[cco]", r.status, url, texto.slice(0, 300));

  return new NextResponse(texto, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest)  { return encaminhar(req); }
export async function POST(req: NextRequest) { return encaminhar(req, (await req.text()) || "{}"); }
