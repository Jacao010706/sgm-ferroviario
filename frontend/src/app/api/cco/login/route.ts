import { NextRequest, NextResponse } from "next/server";

// POST /api/cco/login  { senha }  ou  { chave }
//
// Duas formas de abrir o painel, ambas apenas de VISUALIZACAO:
//
//   senha  -- uma pessoa digitando a senha do CCO;
//   chave  -- o link do monitor (/panel?k=...), para as telas que ficam
//             ligadas o dia inteiro na sala do CCO e na dos tecnicos, onde nao
//             ha ninguem para digitar nada.
//
// Nenhuma das duas permite comandar gerador. Isso exige identificacao pessoal
// em /api/cco/operador.
//
// A senha e a chave sao conferidas AQUI, no servidor. Antes a comparacao era
// feita no navegador com a senha escrita no codigo, entao qualquer um que
// abrisse o codigo-fonte da pagina a lia. Em tela de sala de controle isso e
// serio.
export async function POST(req: NextRequest) {
  const senhaEsperada = process.env.CCO_SENHA;
  const chaveEsperada = process.env.CCO_CHAVE_LEITURA;

  const { senha, chave } = await req.json().catch(() => ({} as any));

  // --- Entrada pelo link do monitor ---
  if (chave) {
    if (!chaveEsperada) {
      return NextResponse.json(
        { erro: "CCO_CHAVE_LEITURA nao configurada no servidor" },
        { status: 503 },
      );
    }
    if (chave !== chaveEsperada) {
      return NextResponse.json({ erro: "Chave de acesso invalida" }, { status: 401 });
    }
    return comSessao("monitor");
  }

  // --- Entrada por senha ---
  if (!senhaEsperada) {
    // Falha fechada de proposito: sem a variavel configurada ninguem entra.
    return NextResponse.json(
      { erro: "CCO_SENHA nao configurada no servidor" },
      { status: 503 },
    );
  }
  if (senha !== senhaEsperada) {
    return NextResponse.json({ erro: "Senha invalida" }, { status: 401 });
  }
  return comSessao("ok");
}

function comSessao(valor: "ok" | "monitor") {
  const res = NextResponse.json({ ok: true, modo: valor });
  res.cookies.set("cco_sessao", valor, {
    httpOnly: true,                                   // o script da pagina nao le
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // O monitor fica ligado direto; a sessao de pessoa dura um turno.
    maxAge: valor === "monitor" ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
  });
  return res;
}
