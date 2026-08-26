from fastapi import FastAPI
from database import Base, engine
from routers import itens, movimentacoes

Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def status_api():
    return {"mensagem": "API funcionando"}

app.include_router(itens.router)
app.include_router(movimentacoes.router)