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
    if (!r.ok) return null;
    const d = await r.json();
    tokenCache = d?.access_token ?? null;
    return tokenCache;
  } catch {
    return null;
  }
}

function autorizado(req: NextRequest) {
  return req.cookies.get("cco_sessao")?.value === "ok";
}

async function encaminhar(req: NextRequest, caminho: string[], corpo?: string) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "Sessao do CCO ausente" }, { status: 401 });
  }

  const email = process.env.PANEL_API_EMAIL;
  if (!email || !process.env.PANEL_API_PASSWORD) {
    return NextResponse.json(
      { erro: "PANEL_API_EMAIL / PANEL_API_PASSWORD nao configurados no servidor" },
      { status: 503 },
    );
  }

  const busca = req.nextUrl.search || "";
  const url = `${API_BASE}/api/v1/${caminho.join("/")}${busca}`;

  const chamar = async (token: string) =>
    fetch(url, {
      method: corpo === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(corpo !== undefined ? { body: corpo } : {}),
      cache: "no-store",
    });

  let token = await obterToken();
  if (!token) return NextResponse.json({ erro: "Falha ao autenticar no backend" }, { status: 502 });

  let r = await chamar(token);

  // Token expirado: renova uma vez e repete.
  if (r.status === 401) {
    token = await obterToken(true);
    if (token) r = await chamar(token);
  }

  const texto = await r.text();
  return new NextResponse(texto, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ caminho: string[] }> }) {
  const { caminho } = await ctx.params;
  return encaminhar(req, caminho);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ caminho: string[] }> }) {
  const { caminho } = await ctx.params;
  const corpo = await req.text();
  return encaminhar(req, caminho, corpo || "{}");
}
