import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import logging
from pathlib import Path

logger = logging.getLogger("auth")


def _obter_jwt_secret_key() -> str:
    # 1. Variável de ambiente explícita
    env_secret = (os.getenv("JWT_SECRET_KEY") or "").strip()
    if len(env_secret) >= 16:
        return env_secret

    # 2. Ambiente de teste
    db_url = os.getenv("DATABASE_URL", "").lower()
    if "test" in db_url or "pytest" in os.environ.get("_", "").lower() or "PYTEST_CURRENT_TEST" in os.environ:
        return "test_jwt_secret_key_fixed_for_test_environment_1234567890"

    # 3. Arquivo persistido para evitar deslogar usuários ou dessincronizar workers
    candidatos = []
    if os.getenv("JWT_SECRET_FILE"):
        candidatos.append(Path(os.environ["JWT_SECRET_FILE"]))
    candidatos.append(Path("/data/.jwt_secret"))
    candidatos.append(Path(__file__).resolve().parents[2] / "data" / ".jwt_secret")
    candidatos.append(Path(__file__).resolve().parents[1] / ".jwt_secret")

    for arq in candidatos:
        try:
            if arq.is_file():
                conteudo = arq.read_text(encoding="utf-8").strip()
                if len(conteudo) >= 16:
                    return conteudo
        except Exception:
            pass

    # Se nenhum arquivo existir, cria no primeiro diretório acessível
    nova_chave = secrets.token_hex(32)
    for arq in candidatos:
        try:
            arq.parent.mkdir(parents=True, exist_ok=True)
            arq.write_text(nova_chave, encoding="utf-8")
            logger.warning(
                "JWT_SECRET_KEY não foi definida nas variáveis de ambiente. "
                "Uma chave segura foi gerada e persistida em '%s'. "
                "Recomenda-se definir JWT_SECRET_KEY no .env para ambientes produtivos.",
                arq
            )
            return nova_chave
        except Exception:
            continue

    return nova_chave


JWT_SECRET_KEY = _obter_jwt_secret_key()
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
