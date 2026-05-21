import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
import logging

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "SGM Ferroviario")

def send_email(to: str, subject: str, html_body: str) -> bool:
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP nao configurado - email nao enviado")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to, msg.as_string())
        logger.info(f"Email enviado para {to}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar email: {e}")
        return False

BASE_STYLE = """
<style>
  body { font-family: Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; }
  .header { background: #1E3A5F; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0; margin: -24px -24px 20px; }
  .header h1 { margin: 0; font-size: 18px; }
  .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.7; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .badge-critical { background: #FEE2E2; color: #DC2626; }
  .badge-high { background: #FFEDD5; color: #EA580C; }
  .badge-medium { background: #FEF3C7; color: #D97706; }
  .badge-low { background: #DCFCE7; color: #16A34A; }
  .btn { display: inline-block; background: #2563EB; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; margin-top: 16px; }
  .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  td:first-child { color: #64748b; width: 40%; }
  td:last-child { font-weight: 500; }
</style>
"""

def email_alerta(to: str, alert_title: str, severity: str, asset_name: str, description: str = "", value: float = None, threshold: float = None) -> bool:
    severity_label = {"critical": "Critico", "high": "Alto", "medium": "Medio", "low": "Baixo"}.get(severity, severity)
    html = f"""
    {BASE_STYLE}
    <div class="card">
      <div class="header">
        <h1>⚠️ Alerta SGM Ferroviario</h1>
        <p>Sistema de Gestao de Manutencao</p>
      </div>
      <p>Um novo alerta foi gerado no sistema:</p>
      <table>
        <tr><td>Titulo</td><td>{alert_title}</td></tr>
        <tr><td>Severidade</td><td><span class="badge badge-{severity}">{severity_label}</span></td></tr>
        <tr><td>Ativo</td><td>{asset_name}</td></tr>
        {'<tr><td>Valor medido</td><td>' + str(value) + '</td></tr>' if value is not None else ''}
        {'<tr><td>Limite</td><td>' + str(threshold) + '</td></tr>' if threshold is not None else ''}
        {'<tr><td>Descricao</td><td>' + description + '</td></tr>' if description else ''}
      </table>
      <a href="#" class="btn">Ver no Sistema</a>
      <div class="footer">SGM Ferroviario — Gestao de Manutencao Ferroviaria</div>
    </div>
    """
    return send_email(to, f"[SGM] Alerta {severity_label}: {alert_title}", html)

def email_os_criada(to: str, os_number: str, os_title: str, asset_name: str, priority: str, scheduled_start: str = None) -> bool:
    priority_label = {"critical": "Critica", "high": "Alta", "medium": "Media", "low": "Baixa"}.get(priority, priority)
    html = f"""
    {BASE_STYLE}
    <div class="card">
      <div class="header">
        <h1>🔧 Nova Ordem de Servico</h1>
        <p>SGM Ferroviario — Gestao de Manutencao</p>
      </div>
      <p>Uma nova OS foi criada e aguarda atencao:</p>
      <table>
        <tr><td>Numero</td><td><strong>{os_number}</strong></td></tr>
        <tr><td>Titulo</td><td>{os_title}</td></tr>
        <tr><td>Ativo</td><td>{asset_name}</td></tr>
        <tr><td>Prioridade</td><td><span class="badge badge-{priority}">{priority_label}</span></td></tr>
        {'<tr><td>Inicio Previsto</td><td>' + scheduled_start + '</td></tr>' if scheduled_start else ''}
      </table>
      <a href="#" class="btn">Ver OS no Sistema</a>
      <div class="footer">SGM Ferroviario — Gestao de Manutencao Ferroviaria</div>
    </div>
    """
    return send_email(to, f"[SGM] Nova OS: {os_number} — {os_title}", html)

def email_os_atribuida(to: str, technician_name: str, os_number: str, os_title: str, asset_name: str, scheduled_start: str = None) -> bool:
    html = f"""
    {BASE_STYLE}
    <div class="card">
      <div class="header">
        <h1>👷 OS Atribuida a Voce</h1>
        <p>SGM Ferroviario — Gestao de Manutencao</p>
      </div>
      <p>Ola <strong>{technician_name}</strong>, uma OS foi atribuida a voce:</p>
      <table>
        <tr><td>Numero</td><td><strong>{os_number}</strong></td></tr>
        <tr><td>Titulo</td><td>{os_title}</td></tr>
        <tr><td>Ativo</td><td>{asset_name}</td></tr>
        {'<tr><td>Inicio Previsto</td><td>' + scheduled_start + '</td></tr>' if scheduled_start else ''}
      </table>
      <a href="#" class="btn">Ver OS no Sistema</a>
      <div class="footer">SGM Ferroviario — Gestao de Manutencao Ferroviaria</div>
    </div>
    """
    return send_email(to, f"[SGM] OS Atribuida: {os_number} — {os_title}", html)

def email_plano_vencendo(to: str, plan_name: str, asset_name: str, days_until: int, next_due: str) -> bool:
    urgency = "VENCIDO" if days_until < 0 else "HOJE" if days_until == 0 else f"em {days_until} dias"
    html = f"""
    {BASE_STYLE}
    <div class="card">
      <div class="header">
        <h1>📅 Plano de Manutencao Vencendo</h1>
        <p>SGM Ferroviario — Gestao de Manutencao</p>
      </div>
      <p>Um plano de manutencao preventiva precisa de atencao:</p>
      <table>
        <tr><td>Plano</td><td><strong>{plan_name}</strong></td></tr>
        <tr><td>Ativo</td><td>{asset_name}</td></tr>
        <tr><td>Vencimento</td><td>{next_due}</td></tr>
        <tr><td>Status</td><td><span class="badge badge-{'critical' if days_until <= 0 else 'medium'}">{urgency}</span></td></tr>
      </table>
      <a href="#" class="btn">Ver Planos no Sistema</a>
      <div class="footer">SGM Ferroviario — Gestao de Manutencao Ferroviaria</div>
    </div>
    """
    return send_email(to, f"[SGM] Plano vencendo {urgency}: {plan_name}", html)
