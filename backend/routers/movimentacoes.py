from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models.item import Item
from models.movimentacao import Movimentacao
from schemas.movimentacao import (
    AjusteEstoqueCreate,
    MovimentacaoCreate,
    MovimentacaoPaginadaResponse,
    MovimentacaoResponse,
)
from services.estoque import checar_estoque_minimo_e_alertar


router = APIRouter(prefix="/movimentacoes", tags=["Movimentações"])


def montar_resposta(movimentacao: Movimentacao, alerta: str | None = None):
    return MovimentacaoResponse(
        id=movimentacao.id,
        item_id=movimentacao.item_id,
        item_nome=movimentacao.item.nome,
        tipo=movimentacao.tipo,
        quantidade=movimentacao.quantidade,
        quantidade_anterior=movimentacao.quantidade_anterior,
        quantidade_resultante=movimentacao.quantidade_resultante,
        motivo=movimentacao.motivo,
        data=movimentacao.data,
        alerta=alerta,
    )


@router.get("/", response_model=list[MovimentacaoResponse])
def listar_movimentacoes(db: Session = Depends(get_db)):
    movimentacoes = db.query(Movimentacao).order_by(Movimentacao.data.desc()).all()
    return [montar_resposta(movimentacao) for movimentacao in movimentacoes]


@router.get("/historico/paginado", response_model=MovimentacaoPaginadaResponse)
def listar_historico_paginado(
    skip: int = 0,
    limit: int = 5,
    q: str | None = None,
    tipo: Literal["entrada", "saida", "ajuste", "entrada_saida"] | None = None,
    db: Session = Depends(get_db),
):
    consulta = db.query(Movimentacao).join(Item)
    if tipo == "entrada_saida":
        consulta = consulta.filter(Movimentacao.tipo.in_(["entrada", "saida"]))
    elif tipo:
        consulta = consulta.filter(Movimentacao.tipo == tipo)
    if q and q.strip():
        termo = f"%{q.strip()}%"
        consulta = consulta.filter(
            or_(Item.nome.ilike(termo), Movimentacao.motivo.ilike(termo))
        )

    total = consulta.count()
    movimentacoes = (
        consulta.order_by(Movimentacao.data.desc(), Movimentacao.id.desc())
        .offset(skip)
        .limit(min(max(limit, 1), 100))
        .all()
    )
    return {
        "total": total,
        "items": [montar_resposta(movimentacao) for movimentacao in movimentacoes],
    }


@router.post("/ajuste", response_model=MovimentacaoResponse, status_code=201)
def ajustar_estoque(ajuste: AjusteEstoqueCreate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == ajuste.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    if item.quantidade == ajuste.nova_quantidade:
        raise HTTPException(
            status_code=400,
            detail="A quantidade informada já é o saldo atual do produto",
        )

    quantidade_anterior = item.quantidade
    item.quantidade = ajuste.nova_quantidade
    movimentacao = Movimentacao(
        item_id=item.id,
        tipo="ajuste",
        quantidade=abs(ajuste.nova_quantidade - quantidade_anterior),
        quantidade_anterior=quantidade_anterior,
        quantidade_resultante=ajuste.nova_quantidade,
        motivo=ajuste.motivo,
    )
    db.add(movimentacao)
    alerta = checar_estoque_minimo_e_alertar(db, item)
    db.commit()
    db.refresh(movimentacao)
    return montar_resposta(movimentacao, alerta)


@router.post("/", response_model=MovimentacaoResponse, status_code=201)
def registrar_movimentacao(mov: MovimentacaoCreate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == mov.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    if mov.tipo == "saida" and item.quantidade < mov.quantidade:
        raise HTTPException(status_code=400, detail="Estoque insuficiente")

    quantidade_anterior = item.quantidade
    if mov.tipo == "entrada":
        item.quantidade += mov.quantidade
    else:
        item.quantidade -= mov.quantidade

    nova_movimentacao = Movimentacao(
        **mov.model_dump(),
        quantidade_anterior=quantidade_anterior,
        quantidade_resultante=item.quantidade,
    )
    db.add(nova_movimentacao)

    alerta = None
    if mov.tipo == "saida":
        alerta = checar_estoque_minimo_e_alertar(db, item)

    db.commit()
    db.refresh(nova_movimentacao)
    return montar_resposta(nova_movimentacao, alerta)
