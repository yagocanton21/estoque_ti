from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str
    manter_conectado: bool = False


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_days: int
    username: str


class UsuarioAtualResponse(BaseModel):
    username: str
    autenticado: bool

