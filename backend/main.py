from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles
from routers import itens, movimentacoes, lista_compras, emprestimos, relacao_ips, equipamentos, backups, auth
from services.auth import obter_usuario_logado
from services.backups import iniciar_verificacao_periodica, parar_verificacao_periodica
from fastapi.middleware.cors import CORSMiddleware
import os

os.makedirs("/data/uploads", exist_ok=True)


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    # verificação de atrasos/agentes parados do painel de backups (antes era um timer systemd)
    iniciar_verificacao_periodica()
    yield
    parar_verificacao_periodica()


app = FastAPI(title="Estoque TI & Relação de IPs API", lifespan=ciclo_de_vida)
app.mount("/uploads", StaticFiles(directory="/data/uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def status_api():
    return {"mensagem": "API funcionando"}

# Dependência que exige token JWT válido para todas as rotas de negócio
auth_guard = [Depends(obter_usuario_logado)]

app.include_router(itens.router, dependencies=auth_guard)
app.include_router(movimentacoes.router, dependencies=auth_guard)
app.include_router(lista_compras.router, dependencies=auth_guard)
app.include_router(emprestimos.router, dependencies=auth_guard)
app.include_router(relacao_ips.router, dependencies=auth_guard)
app.include_router(equipamentos.router, dependencies=auth_guard)
app.include_router(backups.router)
app.include_router(auth.router)
