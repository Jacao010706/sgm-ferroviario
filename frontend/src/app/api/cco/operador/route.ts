import { NextRequest, NextResponse } from "next/server";

// Identificacao do operador do CCO.
//
// O painel e aberto para VER: a senha do CCO libera a tela e ela fica no ar o
// turno inteiro. Uma sala de controle nao pode perder a visao dos 25 geradores
// porque uma sessao expirou -- por isso o monitoramento nunca depende daqui.
//
// Para ACIONAR e outra coisa. Ate agora todo comando saia no nome da conta de
// servico do proxy (PANEL_API_EMAIL), entao a auditoria registrava com fidelidade
// o que foi feito, quando e em qual gerador, mas no "quem" respondia sempre a
// mesma conta. Quem desligou um gerador as tres da manha era indistinguivel de
// qualquer outra pessoa com acesso a tela. Agora o operador se identifica com a
// conta dele e e o token dele que assina o comando.

const API_BASE = (process.env.PANEL_API_URL
  || "https://laudable-peace-production-09cd.up.railway.app").replace(/\/+$/, "");

const COOKIE_OPERADOR = "cco_operador";

// Oito horas cobrem um turno. O token do backend pode expirar antes; nesse caso
// o proxy devolve SEM_OPERADOR e o painel pede a identificacao de novo, sem em
// momento algum derrubar a tela de monitoramento.
const DURACAO = 60 * 60 * 8;

function semSessaoCCO(req: NextRequest): boolean {
  return req.cookies.get("cco_sessao")?.value !== "ok";
}

// GET /api/cco/operador -- quem esta identificado agora.
//
// Consulta o proprio backend em vez de confiar num cookie de rotulo: se o
// cabecalho mostrasse um nome guardado no navegador, bastaria adulterar esse
// cookie para a tela exibir uma pessoa e a auditoria gravar outra. Numa
// ocorrencia, ver na tela quem esta no comando precisa valer.
export async function GET(req: NextRequest) {
  if (semSessaoCCO(req)) {
    return NextResponse.json({ erro: "Sessao do CCO ausente" }, { status: 401 });
  }

  const token = req.cookies.get(COOKIE_OPERADOR)?.value;
  if (!token) return NextResponse.json({ operador: null });

  try {
    const r = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) {
      // Token vencido ou revogado: limpa, para o painel nao seguir exibindo
      // alguem que ja nao pode comandar.
      const res = NextResponse.json({ operador: null });
      res.cookies.set(COOKIE_OPERADOR, "", { path: "/", maxAge: 0 });
      return res;
    }
    const u = await r.json();
    return NextResponse.json({
      operador: { nome: u?.name ?? "", email: u?.email ?? "", papel: u?.role ?? "" },
    });
  } catch {
    return NextResponse.json({ operador: null });
  }
}

// POST /api/cco/operador  { email, senha } -- assumir o comando.
export async function POST(req: NextRequest) {
  if (semSessaoCCO(req)) {
    return NextResponse.json({ erro: "Sessao do CCO ausente" }, { status: 401 });
  }

  const { email, senha } = await req.json().catch(() => ({} as any));
  if (!email || !senha) {
    return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });
  }

  let r: Response;
  try {
    r = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { erro: "Nao foi possivel falar com o servidor." }, { status: 502 },
    );
  }

  if (r.status === 401) {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }
  if (!r.ok) {
    return NextResponse.json({ erro: `Falha ao identificar (${r.status}).` }, { status: 502 });
  }

  const d = await r.json().catch(() => ({} as any));
  if (!d?.access_token) {
    return NextResponse.json({ erro: "Login sem token na resposta." }, { status: 502 });
  }

  // Quem decide se o cargo pode acionar e o backend, em CARGOS_AUTORIZADOS.
  // Repetir essa lista aqui criaria uma segunda fonte de verdade, que envelhece
  // em silencio: um cargo novo autorizado la continuaria barrado aqui, sem que
  // ninguem soubesse por que. O cargo e so exibido; a permissao e verificada no
  // comando, e a mensagem que volta e a do proprio backend.
  const res = NextResponse.json({
    ok: true,
    operador: { nome: d.name ?? email, email, papel: d.role ?? "" },
  });
  res.cookies.set(COOKIE_OPERADOR, d.access_token, {
    httpOnly: true,                                  // o script da pagina nao le
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO,
  });
  return res;
}

// DELETE /api/cco/operador -- encerrar a identificacao (troca de turno).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_OPERADOR, "", { path: "/", maxAge: 0 });
  return res;
}
