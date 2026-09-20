import { NextRequest, NextResponse } from "next/server";

// Proxy do painel CCO para o backend FastAPI.
//
// O painel costumava fazer login no navegador com credenciais de admin
// escritas no codigo. Qualquer um que abrisse a tela e olhasse o codigo-fonte
// ficava com acesso de administrador ao backend inteiro -- e essa tela vive
// num monitor de sala de controle. Agora as credenciais ficam so aqui, no
// servidor, e o navegador conversa apenas com esta rota.
//
// Dois tokens passam por aqui, com papeis distintos:
//
//   LEITURA  -- a conta de servico (PANEL_API_EMAIL). A tela precisa ficar no
//               ar o turno inteiro, entao o monitoramento nao pode depender de
//               ninguem estar identificado.
//
//   COMANDO  -- o token do operador, posto pelo /api/cco/operador. Enquanto
//               todo comando saia pela conta de servico, a auditoria gravava o
//               que foi feito e em qual gerador, mas no "quem" respondia sempre
//               a mesma conta, qualquer que fosse a pessoa no console.

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

// Reaproveita o caminho que chegou, em vez de remontar a partir dos segmentos.
//
// Atencao a barra final: o backend sobe com redirect_slashes=False, entao
// /assets e /assets/ sao coisas diferentes e a primeira da 404 seco, sem
// redirecionamento. O Next.js, por sua vez, remove a barra final antes de
// chamar este handler. Ou seja: a barra que o painel pediu ja se perdeu aqui e
// nao ha como recupera-la do pathname -- ver a repeticao com barra em chamar().
function caminhoOriginal(req: NextRequest): string {
  const p = req.nextUrl.pathname.replace(/^\/api\/cco/, "");
  return p.startsWith("/") ? p : "/" + p;
}

// Acionamento de gerador: /generators/{id}/command
const ehComando = (caminho: string) =>
  /^\/generators\/[^/]+\/command\/?$/.test(caminho);

const semOperador = (mensagem: string) =>
  NextResponse.json({ erro: mensagem, codigo: "SEM_OPERADOR" }, { status: 401 });

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

  const caminho = caminhoOriginal(req);
  const url = `${API_BASE}/api/v1${caminho}${req.nextUrl.search || ""}`;

  const bater = (destino: string, token: string) =>
    fetch(destino, {
      method: corpo === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(corpo !== undefined ? { body: corpo } : {}),
      redirect: "follow",
      cache: "no-store",
    });

  // O backend sobe com redirect_slashes=False: as rotas de colecao existem so
  // com barra final (/assets/, /alerts/) e as de item so sem ela
  // (/iot/readings/{id}). Como o Next.js apaga a barra final antes de chegar
  // aqui, toda chamada de colecao caia em 404 e o painel ficava vazio.
  //
  // Em vez de manter uma lista de quais rotas levam barra -- que envelhece mal
  // e quebra calada --, repete uma unica vez com a barra quando der 404. So
  // custa uma ida a mais no caso que ja estava falhando de qualquer jeito.
  const chamar = async (destino: string, token: string): Promise<Response> => {
    const r = await bater(destino, token);
    if (r.status !== 404) return r;

    const u = new URL(destino);
    if (u.pathname.endsWith("/")) return r;

    u.pathname += "/";
    const comBarra = await bater(u.toString(), token);
    return comBarra.status === 404 ? r : comBarra;
  };

  const devolver = async (r: Response) => {
    const texto = await r.text();
    if (!r.ok) console.error("[cco]", r.status, url, texto.slice(0, 300));
    return new NextResponse(texto, {
      status: r.status,
      headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" },
    });
  };

  // ── Acionamento: assina com o token do operador ──────────────────────────
  //
  // Nao ha recurso a conta de servico quando o operador nao esta identificado.
  // Cair de volta nela faria o comando passar assinado por "o painel", que e
  // exatamente o que esta mudanca existe para acabar: um acionamento sem dono.
  // Melhor pedir a identificacao do que gravar um registro que nao responde
  // quem acionou.
  if (corpo !== undefined && ehComando(caminho)) {
    const tokenOperador = req.cookies.get("cco_operador")?.value;
    if (!tokenOperador) {
      return semOperador("Identifique-se para acionar o gerador.");
    }

    const r = await chamar(url, tokenOperador);
    if (r.status === 401) {
      // Sem a senha nao ha como renovar por conta propria: pede de novo.
      const res = semOperador("Sua identificacao expirou. Entre novamente para acionar.");
      res.cookies.set("cco_operador", "", { path: "/", maxAge: 0 });
      return res;
    }
    return devolver(r);
  }

  // ── Leitura e demais rotas: conta de servico ─────────────────────────────
  let token = await obterToken();
  if (!token) {
    return NextResponse.json(
      { erro: "Falha ao autenticar no backend -- confira PANEL_API_EMAIL e PANEL_API_PASSWORD" },
      { status: 502 },
    );
  }

  let r = await chamar(url, token);
  if (r.status === 401) {                 // token expirado: renova e repete
    token = await obterToken(true);
    if (token) r = await chamar(url, token);
  }

  return devolver(r);
}

export async function GET(req: NextRequest)  { return encaminhar(req); }
export async function POST(req: NextRequest) { return encaminhar(req, (await req.text()) || "{}"); }
