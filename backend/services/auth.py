import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or secrets.token_hex(32)
JWT_ALGORITHM = "HS256"

# Duração dos tokens
DURACAO_TOKEN_PADRAO = timedelta(days=1)
DURACAO_TOKEN_LEMBRAR = timedelta(days=30)

security = HTTPBearer(auto_error=False)


def obter_credenciais_configuradas() -> tuple[str, str]:
    """Obtém credenciais configuradas estritamente via variáveis de ambiente."""
    username = (os.getenv("AUTH_USERNAME") or "").strip()
    password = os.getenv("AUTH_PASSWORD") or ""
    return username, password


def verificar_credenciais(username: str, password: str) -> bool:
    """
    Verifica usuário e senha de forma segura contra ataques de timing.
    Se as variáveis de ambiente não estiverem configuradas, rejeita qualquer acesso.
    """
    config_user, config_pass = obter_credenciais_configuradas()

    # Falha de segurança se não houver credenciais definidas no ambiente
    if not config_user or not config_pass:
        return False

    if not username or not password:
        return False

    usuario_valido = secrets.compare_digest(username.strip(), config_user)
    senha_valida = secrets.compare_digest(password, config_pass)
    return usuario_valido and senha_valida


def criar_token_acesso(username: str, manter_conectado: bool = False) -> tuple[str, int]:
    """
    Gera um token JWT assinado.
    Retorna o token e a quantidade de dias de validade.
    """
    validade_dias = 30 if manter_conectado else 1
    delta = DURACAO_TOKEN_LEMBRAR if manter_conectado else DURACAO_TOKEN_PADRAO
    expiracao = datetime.now(timezone.utc) + delta

    payload = {
        "sub": username,
        "exp": expiracao,
        "iat": datetime.now(timezone.utc),
        "manter_conectado": manter_conectado,
    }

    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, validade_dias


def decodificar_token(token: str) -> Optional[dict]:
    """Decodifica e valida a assinatura e expiração do JWT."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def obter_usuario_logado(
    credenciais: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """
    Dependência FastAPI para verificar se a requisição possui um token JWT válido.
    """
    if not credenciais or not credenciais.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acesso não autorizado. Faça login para continuar.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decodificar_token(credenciais.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada. Faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload["sub"]
