from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.item import Item
from models.movimentacao import Movimentacao
from schemas.movimentacao import MovimentacaoCreate, MovimentacaoResponse

router = APIRouter(prefix="/movimentacoes", tags=["Movimentações"])

# Rota para listar movimentações
@router.get("/", response_model=list[MovimentacaoResponse])
def listar_movimentacoes(db: Session = Depends(get_db)):
    return db.query(Movimentacao).all()

# Rota de entrada e saida 
@router.post("/", response_model=MovimentacaoResponse, status_code=201)
def registrar_movimentacao(mov: MovimentacaoCreate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == mov.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    if mov.tipo == "saida" and item.quantidade < mov.quantidade:
        raise HTTPException(status_code=400, detail="Estoque insuficiente")

    if mov.tipo == "entrada":
        item.quantidade += mov.quantidade
    else:
        item.quantidade -= mov.quantidade

    nova_mov = Movimentacao(**mov.model_dump())
    db.add(item)
    db.add(nova_mov)
    db.commit()
    db.refresh(nova_mov)

    alerta = None
    if mov.tipo == "saida" and item.quantidade_minima and item.quantidade < item.quantidade_minima:
        alerta = f"Estoque abaixo do mínimo! Atual: {item.quantidade}, Mínimo: {item.quantidade_minima}"

    return MovimentacaoResponse(
        id=nova_mov.id,
        item_id=nova_mov.item_id,
        tipo=nova_mov.tipo,
        quantidade=nova_mov.quantidade,
        data=nova_mov.data,
        alerta=alerta
    )
