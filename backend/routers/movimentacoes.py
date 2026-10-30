from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import or_, update
from sqlalchemy.exc import IntegrityError
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
        entregue_para=movimentacao.entregue_para,
        observacao=movimentacao.observacao,
        data=movimentacao.data,
        alerta=alerta,
        chave_idempotencia=movimentacao.chave_idempotencia,
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
def ajustar_estoque(
    ajuste: AjusteEstoqueCreate,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
):
    chave = (ajuste.chave_idempotencia or idempotency_key or "").strip() or None
    if chave:
        mov_existente = (
            db.query(Movimentacao)
            .filter(Movimentacao.chave_idempotencia == chave)
            .first()
        )
        if mov_existente:
            return montar_resposta(mov_existente)

    item = db.query(Item).filter(Item.id == ajuste.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    if item.quantidade == ajuste.nova_quantidade:
        raise HTTPException(
            status_code=400,
            detail="A quantidade informada já é o saldo atual do produto",
        )

    quantidade_anterior = item.quantidade
    resultado = db.execute(
        update(Item)
        .where(Item.id == ajuste.item_id, Item.quantidade != ajuste.nova_quantidade)
        .values(quantidade=ajuste.nova_quantidade)
    )
    if resultado.rowcount == 0:
        raise HTTPException(
            status_code=400,
            detail="A quantidade informada já é o saldo atual do produto",
        )
    db.refresh(item)
    movimentacao = Movimentacao(
        item_id=item.id,
        tipo="ajuste",
        quantidade=abs(ajuste.nova_quantidade - quantidade_anterior),
        quantidade_anterior=quantidade_anterior,
        quantidade_resultante=ajuste.nova_quantidade,
        motivo=ajuste.motivo,
        chave_idempotencia=chave,
    )
    db.add(movimentacao)
    alerta = checar_estoque_minimo_e_alertar(db, item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if chave:
            mov_concorrente = (
                db.query(Movimentacao)
                .filter(Movimentacao.chave_idempotencia == chave)
                .first()
            )
            if mov_concorrente:
                return montar_resposta(mov_concorrente)
        raise

    db.refresh(movimentacao)
    return montar_resposta(movimentacao, alerta)


@router.post("/", response_model=MovimentacaoResponse, status_code=201)
def registrar_movimentacao(
    mov: MovimentacaoCreate,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
):
    chave = (mov.chave_idempotencia or idempotency_key or "").strip() or None

    # Se a requisição enviou chave de idempotência, verifica se já foi processada anteriormente
    if chave:
        mov_existente = (
            db.query(Movimentacao)
            .filter(Movimentacao.chave_idempotencia == chave)
            .first()
        )
        if mov_existente:
            # Já processada! Retorna a resposta original sem alterar o saldo novamente
            return montar_resposta(mov_existente)

    if mov.tipo == "saida":
        # Atualização atômica condicional: só deduz se o estoque atual for suficiente
        resultado = db.execute(
            update(Item)
            .where(Item.id == mov.item_id, Item.quantidade >= mov.quantidade)
            .values(quantidade=Item.quantidade - mov.quantidade)
        )
        if resultado.rowcount == 0:
            item_existe = db.query(Item).filter(Item.id == mov.item_id).first()
            if not item_existe:
                raise HTTPException(status_code=404, detail="Item não encontrado")
            raise HTTPException(status_code=400, detail="Estoque insuficiente")
    else:
        resultado = db.execute(
            update(Item)
            .where(Item.id == mov.item_id)
            .values(quantidade=Item.quantidade + mov.quantidade)
        )
        if resultado.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item não encontrado")

    item = db.query(Item).filter(Item.id == mov.item_id).first()
    quantidade_resultante = item.quantidade
    if mov.tipo == "entrada":
        quantidade_anterior = quantidade_resultante - mov.quantidade
    else:
        quantidade_anterior = quantidade_resultante + mov.quantidade

    dados_mov = mov.model_dump()
    dados_mov["chave_idempotencia"] = chave

    nova_movimentacao = Movimentacao(
        **dados_mov,
        quantidade_anterior=quantidade_anterior,
        quantidade_resultante=quantidade_resultante,
    )
    db.add(nova_movimentacao)

    alerta = None
    if mov.tipo == "saida":
        alerta = checar_estoque_minimo_e_alertar(db, item)

    try:
        db.commit()
    except IntegrityError:
        # Se duas requisições paralelas enviaram a mesma chave no exato mesmo milissegundo,
        # uma comitou e a outra bateu na constraint única de chave_idempotencia.
        db.rollback()
        if chave:
            mov_concorrente = (
                db.query(Movimentacao)
                .filter(Movimentacao.chave_idempotencia == chave)
                .first()
            )
            if mov_concorrente:
                return montar_resposta(mov_concorrente)
        raise

    db.refresh(nova_movimentacao)
    return montar_resposta(nova_movimentacao, alerta)
