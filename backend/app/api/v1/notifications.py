from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from app.models.user import User
from app.api.deps import get_current_user
from app.services.email_service import send_email, email_alerta, email_os_criada, email_plano_vencendo

router = APIRouter(prefix="/notifications", tags=["Notificacoes"])

class TestEmailRequest(BaseModel):
    email: EmailStr

@router.post("/test-email")
async def test_email(body: TestEmailRequest, current_user: User = Depends(get_current_user)):
    html = """
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1E3A5F;color:white;padding:16px 24px;border-radius:8px;margin-bottom:20px">
        <h1 style="margin:0;font-size:18px">SGM Ferroviario</h1>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.7">Teste de Notificacao por Email</p>
      </div>
      <p>Parabens! As notificacoes por email estao configuradas corretamente.</p>
      <p>Voce recebera emails quando:</p>
      <ul>
        <li>Um alerta critico ou alto for gerado</li>
        <li>Uma nova OS for criada</li>
        <li>Uma OS for atribuida a voce</li>
        <li>Um plano de manutencao estiver vencendo</li>
      </ul>
      <div style="text-align:center;margin-top:20px;font-size:11px;color:#94a3b8">
        SGM Ferroviario — Gestao de Manutencao Ferroviaria
      </div>
    </div>
    """
    success = send_email(body.email, "[SGM] Teste de Notificacao", html)
    if not success:
        raise HTTPException(status_code=500, detail="Erro ao enviar email. Verifique as configuracoes SMTP.")
    return {"status": "ok", "message": f"Email enviado para {body.email}"}
