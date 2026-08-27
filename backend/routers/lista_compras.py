from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.lista_compras import ListaCompras
from schemas.lista_compras import ListaComprasCreate, ListaComprasUpdate, ListaComprasResponse
from datetime import datetime

router = APIRouter(prefix="/lista-compras", tags=["Lista de Compras"])

@router.get("/", response_model=list[ListaComprasResponse])
def listar_itens_compras(db: Session = Depends(get_db)):
    return db.query(ListaCompras).all()

@router.get("/{id}", response_model=ListaComprasResponse)
def buscar_item_compra(id: int, db: Session = Depends(get_db)):
    db_item = db.query(ListaCompras).filter(ListaCompras.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return db_item

@router.post("/", response_model=ListaComprasResponse, status_code=201)
def adicionar_item_compra(item: ListaComprasCreate, db: Session = Depends(get_db)):
    novo_item = ListaCompras(**item.model_dump())
    db.add(novo_item)
    db.commit()
    db.refresh(novo_item)
    return novo_item

@router.put("/{id}", response_model=ListaComprasResponse, status_code=200)
def atualizar_item_compra(id: int, item: ListaComprasUpdate, db: Session = Depends(get_db)):
    db_item = db.query(ListaCompras).filter(ListaCompras.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    # Atualiza apenas os campos enviados, ignorando os que não foram passados (exclude_unset=True)
    update_data = item.model_dump(exclude_unset=True)
    
    # Se está marcando como comprado e não estava antes, registra a data
    if update_data.get("comprado") is True and not db_item.comprado:
        db_item.data_compra = datetime.utcnow()
    # Se está desmarcando, apaga a data
    elif update_data.get("comprado") is False:
        db_item.data_compra = None
        
    for campo, valor in update_data.items():
        setattr(db_item, campo, valor)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{id}", status_code=204)
def deletar_item_compra(id: int, db: Session = Depends(get_db)):
    db_item = db.query(ListaCompras).filter(ListaCompras.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(db_item)
    db.commit()
