from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routers import itens, movimentacoes, lista_compras, emprestimos, relacao_ips, equipamentos
from fastapi.middleware.cors import CORSMiddleware
import os

os.makedirs("/data/uploads", exist_ok=True)

app = FastAPI(title="Estoque TI & Relação de IPs API")
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

app.include_router(itens.router)
app.include_router(movimentacoes.router)
app.include_router(lista_compras.router)
app.include_router(emprestimos.router)
app.include_router(relacao_ips.router)
app.include_router(equipamentos.router)
