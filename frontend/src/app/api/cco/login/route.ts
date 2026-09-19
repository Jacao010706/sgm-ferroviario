import { NextRequest, NextResponse } from "next/server";

// POST /api/cco/login  { senha }
// A senha do CCO e conferida AQUI, no servidor. Antes a comparacao era feita
// no navegador com a senha escrita no codigo, entao qualquer um que abrisse o
// codigo-fonte da pagina a lia. Em tela de sala de controle isso e serio.
export async function POST(req: NextRequest) {
  const esperada = process.env.CCO_SENHA;

  if (!esperada) {
    // Falha fechada de proposito: sem a variavel configurada ninguem entra.
    return NextResponse.json(
      { erro: "CCO_SENHA nao configurada no servidor" },
      { status: 503 },
    );
  }

  const { senha } = await req.json().catch(() => ({ senha: "" }));
  if (senha !== esperada) {
    return NextResponse.json({ erro: "Senha invalida" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("cco_sessao", "ok", {
    httpOnly: true,                                   // o script da pagina nao le
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,                             // um turno
  });
  return res;
}
