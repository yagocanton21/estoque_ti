from fastapi import APIRouter, HTTPException, status, Depends
from schemas.auth import LoginRequest, LoginResponse, UsuarioAtualResponse
from services.auth import (
    verificar_credenciais,
    criar_token_acesso,
    obter_usuario_logado,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=LoginResponse)
def login(dados: LoginRequest):
    if not verificar_credenciais(dados.username, dados.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token, dias = criar_token_acesso(
        username=dados.username.strip(),
        manter_conectado=dados.manter_conectado,
    )

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in_days=dias,
        username=dados.username.strip(),
    )


@router.get("/me", response_model=UsuarioAtualResponse)
def obter_usuario_atual(usuario: str = Depends(obter_usuario_logado)):
    return UsuarioAtualResponse(
        username=usuario,
        autenticado=True,
    )

