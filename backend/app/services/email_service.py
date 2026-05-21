import smtplib
import os
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

# Configuracoes SMTP via variaveis de ambiente
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")


def send_email(to: str, subject: str, html_body: str) -> bool:
    """Envia um email HTML. Retorna True se enviado com sucesso."""
    if not SMTP_USER or not SMTP_PASS:
        logger.error("SMTP_USER ou SMTP_PASS nao configurados.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to, msg.as_string())

        logger.info(f"Email enviado para {to} | Assunto: {subject}")
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error("Erro de autenticacao SMTP. Verifique SMTP_USER e SMTP_PASS (use Senha de App do Gmail).")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"Erro SMTP ao enviar email: {e}")
        return False
    except Exception as e:
        logger.error(f"Erro inesperado ao enviar email: {e}")
        return False


def email_alerta(to: str, titulo: str, descricao: str, severidade: str, ativo: Optional[str] = None) -> bool:
    """Email de alerta critico/alto."""
    cor = "#dc2626" if severidade.lower() == "critico" else "#f59e0b"
    ativo_html = f"<p><strong>Ativo:</strong> {ativo}</p>" if ativo else ""

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1E3A5F;color:white;padding:16px 24px;border-radius:8px;margin-bottom:20px">
        <h1 style="margin:0;font-size:18px">SGM Ferroviario</h1>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.7">Sistema de Gestao de Manutencao</p>
      </div>
      <div style="border-left:4px solid {cor};padding:12px 16px;background:#fef2f2;border-radius:4px;margin-bottom:16px">
        <strong style="color:{cor}">ALERTA {severidade.upper()}</strong>
        <h2 style="margin:8px 0 0;font-size:16px;color:#1e293b">{titulo}</h2>
      </div>
      <p>{descricao}</p>
      {ativo_html}
      <div style="text-align:center;margin-top:20px;font-size:11px;color:#94a3b8">
        SGM Ferroviario — Gestao de Manutencao Ferroviaria
      </div>
    </div>
    """
    return send_email(to, f"[SGM] Alerta {severidade.upper()}: {titulo}", html)


def email_os_criada(to: str, os_numero: str, titulo: str, prioridade: str, atribuido_a: Optional[str] = None) -> bool:
    """Email de nova Ordem de Servico criada ou atribuida."""
    atribuido_html = f"<p><strong>Atribuido a:</strong> {atribuido_a}</p>" if atribuido_a else ""

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1E3A5F;color:white;padding:16px 24px;border-radius:8px;margin-bottom:20px">
        <h1 style="margin:0;font-size:18px">SGM Ferroviario</h1>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.7">Ordem de Servico</p>
      </div>
      <p>Uma nova Ordem de Servico foi criada:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px">
        <p style="margin:0 0 8px"><strong>OS #{os_numero}</strong></p>
        <p style="margin:0 0 8px"><strong>Titulo:</strong> {titulo}</p>
        <p style="margin:0 0 8px"><strong>Prioridade:</strong> {prioridade}</p>
        {atribuido_html}
      </div>
      <div style="text-align:center;margin-top:20px;font-size:11px;color:#94a3b8">
        SGM Ferroviario — Gestao de Manutencao Ferroviaria
      </div>
    </div>
    """
    return send_email(to, f"[SGM] Nova OS #{os_numero}: {titulo}", html)


def email_plano_vencendo(to: str, plano_nome: str, dias_restantes: int, ativo: Optional[str] = None) -> bool:
    """Email de aviso de plano de manutencao vencendo."""
    cor = "#dc2626" if dias_restantes <= 0 else "#f59e0b"
    status = "VENCIDO" if dias_restantes <= 0 else f"vence em {dias_restantes} dia(s)"
    ativo_html = f"<p><strong>Ativo:</strong> {ativo}</p>" if ativo else ""

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1E3A5F;color:white;padding:16px 24px;border-radius:8px;margin-bottom:20px">
        <h1 style="margin:0;font-size:18px">SGM Ferroviario</h1>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.7">Plano de Manutencao</p>
      </div>
      <div style="border-left:4px solid {cor};padding:12px 16px;background:#fffbeb;border-radius:4px;margin-bottom:16px">
        <strong style="color:{cor}">Plano {status}</strong>
        <h2 style="margin:8px 0 0;font-size:16px;color:#1e293b">{plano_nome}</h2>
      </div>
      {ativo_html}
      <p>Acesse o SGM Ferroviario para tomar as acoes necessarias.</p>
      <div style="text-align:center;margin-top:20px;font-size:11px;color:#94a3b8">
        SGM Ferroviario — Gestao de Manutencao Ferroviaria
      </div>
    </div>
    """
    return send_email(to, f"[SGM] Plano de Manutencao: {plano_nome} — {status}", html)
