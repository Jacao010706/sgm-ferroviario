import { NextRequest, NextResponse } from "next/server";

// Proxy do painel CCO para o backend FastAPI.
//
// O painel costumava fazer login no navegador com credenciais de admin
// escritas no codigo. Qualquer um que abrisse a tela e olhasse o codigo-fonte
// ficava com acesso de administrador ao backend inteiro -- e essa tela vive
// num monitor de sala de controle. Agora as credenciais ficam so aqui, no
// servidor, e o navegador conversa apenas com esta rota.
//
// Leitura e comando andam por caminhos diferentes:
//
//   GET  -- usa a conta de servico do painel. Serve a quem so olha, inclusive
//           o monitor que fica ligado sozinho.
//   POST -- usa o token pessoal do operador (cookie cco_op, posto por
//           /api/cco/operador). E o que faz a auditoria do backend gravar quem
//           de fato mandou parar o gerador, em vez da conta de servico. Sem
//           esse cookie o comando nao sai.

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

async function encaminhar(req: NextRequest, corpo?: string) {
  if (!req.cookies.get("cco_sessao")?.value) {
    return NextResponse.json({ erro: "Sessao do CCO ausente" }, { status: 401 });
  }

  const ehComando = corpo !== undefined;

  // Comando exige operador identificado. Visualizacao, nao.
  const tokenOperador = req.cookies.get("cco_op")?.value;
  if (ehComando && !tokenOperador) {
    return NextResponse.json(
      { erro: "Identifique-se para operar", precisa_operador: true },
      { status: 401 },
    );
  }

  if (!ehComando && (!process.env.PANEL_API_EMAIL || !process.env.PANEL_API_PASSWORD)) {
    return NextResponse.json(
      { erro: "PANEL_API_EMAIL / PANEL_API_PASSWORD nao configurados no servidor" },
      { status: 503 },
    );
  }

  const url = `${API_BASE}/api/v1${caminhoOriginal(req)}${req.nextUrl.search || ""}`;

  const bater = (destino: string, token: string) =>
    fetch(destino, {
      method: ehComando ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(ehComando ? { "Content-Type": "application/json" } : {}),
      },
      ...(ehComando ? { body: corpo } : {}),
      redirect: "follow",
      cache: "no-store",
    });

  // Repete uma unica vez com a barra final quando der 404 -- ver o comentario
  // de caminhoOriginal(). Melhor que manter uma lista de quais rotas levam
  // barra, que envelhece mal e quebra calada.
  const chamar = async (destino: string, token: string): Promise<Response> => {
    const r = await bater(destino, token);
    if (r.status !== 404) return r;

    const u = new URL(destino);
    if (u.pathname.endsWith("/")) return r;

    u.pathname += "/";
    const comBarra = await bater(u.toString(), token);
    return comBarra.status === 404 ? r : comBarra;
  };

  let r: Response;

  if (ehComando) {
    r = await chamar(url, tokenOperador as string);
    if (r.status === 401) {
      // O token do operador venceu. Quem so olha continua vendo; quem ia
      // comandar se identifica de novo.
      const res = NextResponse.json(
        { erro: "Sessao de operacao expirada. Identifique-se novamente.", precisa_operador: true },
        { status: 401 },
      );
      res.cookies.set("cco_op", "", { httpOnly: true, path: "/", maxAge: 0 });
      res.cookies.set("cco_op_nome", "", { path: "/", maxAge: 0 });
      return res;
    }
  } else {
    let token = await obterToken();
    if (!token) {
      return NextResponse.json(
        { erro: "Falha ao autenticar no backend -- confira PANEL_API_EMAIL e PANEL_API_PASSWORD" },
        { status: 502 },
      );
    }
    r = await chamar(url, token);
    if (r.status === 401) {                 // token expirado: renova e repete
      token = await obterToken(true);
      if (token) r = await chamar(url, token);
    }
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
