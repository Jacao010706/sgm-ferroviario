import os
import logging
import urllib.request
import urllib.error
import json
from typing import Optional

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html_body: str) -> bool:
    api_key = os.getenv("RESEND_API_KEY", "")
    print(f"[EMAIL] RESEND_API_KEY presente: {bool(api_key)}", flush=True)
    if not api_key:
        print("[EMAIL] ERRO: RESEND_API_KEY nao configurada", flush=True)
        return False

    payload = json.dumps({
        "from": "SGM Ferroviario <onboarding@resend.dev>",
        "to": [to],
        "subject": subject,
        "html": html_body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode())
            print(f"[EMAIL] Enviado com sucesso! ID: {result.get('id')}", flush=True)
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[EMAIL] Erro Resend HTTP {e.code}: {body}", flush=True)
        return False
    except Exception as e:
        print(f"[EMAIL] Erro inesperado: {type(e).__name__}: {e}", flush=True)
        return False


def email_alerta(to: str, titulo: str, descricao: str, severidade: str, ativo: Optional[str] = None) -> bool:
    cor = "#dc2626" if severidade.lower() == "critico" else "#f59e0b"
    ativo_html = f"<p><strong>Ativo:</strong> {ativo}</p>" if ativo else ""
    html = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1E3A5F;color:white;padding:16px 24px;border-radius:8px;margin-bottom:20px">
        <h1 style="margin:0;font-size:18px">SGM Ferroviario</h1>
      </div>
      <div style="border-left:4px solid {cor};padding:12px 16px;background:#fef2f2;border-radius:4px;margin-bottom:16px">
        <strong style="color:{cor}">ALERTA {severidade.upper()}</strong>
        <h2 style="margin:8px 0 0;font-size:16px">{titulo}</h2>
      </div>
      <p>{descricao}</p>{ativo_html}
      <div style="text-align:center;margin-top:20px;font-size:11px;color:#94a3b8">SGM Ferroviario</div>
    </div>"""
    return send_email(to, f"[SGM] Alerta {severidade.upper()}: {titulo}", html)


def email_os_criada(to: str, os_numero: str, titulo: str, prioridade: str, atribuido_a: Optional[str] = None) -> bool:
    atribuido_html = f"<p><strong>Atribuido a:</strong> {atribuido_a}</p>" if atribuido_a else ""
    html = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1E3A5F;color:white;padding:16px 24px;border-radius:8px;margin-bottom:20px">
        <h1 style="margin:0;font-size:18px">SGM Ferroviario</h1>
      </div>
      <p>Nova OS criada:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px">
        <p><strong>OS #{os_numero}</strong></p>
        <p><strong>Titulo:</strong> {titulo}</p>
        <p><strong>Prioridade:</strong> {prioridade}</p>
        {atribuido_html}
      </div>
      <div style="text-align:center;margin-top:20px;font-size:11px;color:#94a3b8">SGM Ferroviario</div>
    </div>"""
    return send_email(to, f"[SGM] Nova OS #{os_numero}: {titulo}", html)


def email_plano_vencendo(to: str, plano_nome: str, dias_restantes: int, ativo: Optional[str] = None) -> bool:
    cor = "#dc2626" if dias_restantes <= 0 else "#f59e0b"
    status = "VENCIDO" if dias_restantes <= 0 else f"vence em {dias_restantes} dia(s)"
    ativo_html = f"<p><strong>Ativo:</strong> {ativo}</p>" if ativo else ""
    html = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1E3A5F;color:white;padding:16px 24px;border-radius:8px;margin-bottom:20px">
        <h1 style="margin:0;font-size:18px">SGM Ferroviario</h1>
      </div>
      <div style="border-left:4px solid {cor};padding:12px 16px;background:#fffbeb;border-radius:4px;margin-bottom:16px">
        <strong style="color:{cor}">Plano {status}</strong>
        <h2 style="margin:8px 0 0;font-size:16px">{plano_nome}</h2>
      </div>
      {ativo_html}
      <p>Acesse o SGM para tomar as acoes necessarias.</p>
      <div style="text-align:center;margin-top:20px;font-size:11px;color:#94a3b8">SGM Ferroviario</div>
    </div>"""
    return send_email(to, f"[SGM] Plano: {plano_nome} - {status}", html)
