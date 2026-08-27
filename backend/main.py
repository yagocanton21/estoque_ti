from fastapi import FastAPI
from routers import itens, movimentacoes, lista_compras, emprestimos
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

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
