from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.item import Item
from schemas.item import ItemCreate, ItemResponse

router = APIRouter(prefix="/itens", tags=["Itens"])

@router.get("/", response_model=list[ItemResponse])
def listar_itens(db: Session = Depends(get_db)):
    return db.query(Item).all()

@router.post("/", response_model=ItemResponse, status_code=201)
def cadastrar_item(item: ItemCreate, db: Session = Depends(get_db)):
    novo_item = Item(**item.model_dump())
    db.add(novo_item)
    db.commit()
    db.refresh(novo_item)
    return novo_item

@router.put("/{id}", response_model=ItemResponse, status_code=200)
def atualizar_item(id: int, item: ItemCreate, db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    for campo, valor in item.model_dump().items():
        setattr(db_item, campo, valor)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{id}", status_code=204)
def deletar_item(id: int, db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(db_item)
    db.commit()
