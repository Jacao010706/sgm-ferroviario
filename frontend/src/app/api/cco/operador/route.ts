import { NextRequest, NextResponse } from "next/server";

// Sessao de OPERADOR do painel CCO.
//
// Ver o painel e operar um gerador sao coisas diferentes. A tela fica ligada o
// dia inteiro num monitor, sem ninguem na frente -- para isso basta a sessao de
// visualizacao. Mas dar partida ou parar um gerador precisa de nome: se um
// equipamento de emergencia partir as tres da manha, alguem responde por
// aquilo.
//
// Entao aqui a pessoa entra com o usuario dela do SGM. O token que volta e
// guardado num cookie httpOnly e e ele que o proxy usa nos comandos, de modo
// que a auditoria do backend grava o operador de verdade, e nao a conta de
// servico do painel. O backend ja confere o cargo (generators.py).

const API_BASE = (process.env.PANEL_API_URL
  || "https://laudable-peace-production-09cd.up.railway.app").replace(/\/+$/, "");

// Vale por um turno curto de inatividade: o operador se identifica, faz o que
// precisa, e o acesso a comandos fecha sozinho. Quem so olha nao e afetado.
const MINUTOS = 30;

export async function POST(req: NextRequest) {
  if (!req.cookies.get("cco_sessao")?.value) {
    return NextResponse.json({ erro: "Sessao do CCO ausente" }, { status: 401 });
  }

  const { email, senha } = await req.json().catch(() => ({}));
  if (!email || !senha) {
    return NextResponse.json({ erro: "Informe usuario e senha" }, { status: 400 });
  }

  let r: Response;
  try {
    r = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha }),
      cache: "no-store",
    });
  } catch (e) {
    console.error("[cco] operador: backend inacessivel", e);
    return NextResponse.json({ erro: "Nao foi possivel falar com o servidor" }, { status: 502 });
  }

  if (!r.ok) {
    return NextResponse.json({ erro: "Usuario ou senha invalidos" }, { status: 401 });
  }

  const d = await r.json().catch(() => ({} as any));
  if (!d?.access_token) {
    return NextResponse.json({ erro: "Resposta inesperada do servidor" }, { status: 502 });
  }

  const res = NextResponse.json({ nome: d.name ?? email, papel: d.role ?? "" });
  res.cookies.set("cco_op", d.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * MINUTOS,
  });
  res.cookies.set("cco_op_nome", d.name ?? email, {
    httpOnly: false,                     // so para a tela mostrar quem esta operando
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * MINUTOS,
  });
  return res;
}

// Encerrar a operacao sem derrubar a visualizacao.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("cco_op", "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("cco_op_nome", "", { path: "/", maxAge: 0 });
  return res;
}
