from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os
from PIL import Image
from sqlalchemy.orm import Session
from database import get_db
from models.item import Item
from schemas.item import ItemCreate, ItemResponse
from pydantic import BaseModel
from typing import List
from sqlalchemy import func, or_

class PaginatedItemResponse(BaseModel):
    total: int
    items: List[ItemResponse]
router = APIRouter(prefix="/itens", tags=["Itens"])

@router.get("/", response_model=list[ItemResponse])
def listar_itens(db: Session = Depends(get_db)):
    return db.query(Item).all()

@router.get("/paginado", response_model=PaginatedItemResponse)
def listar_itens_paginado(
    skip: int = 0,
    limit: int = 10,
    q: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    consulta = db.query(Item)
    minimo = func.coalesce(Item.quantidade_minima, 0)

    if q and q.strip():
        termo = f"%{q.strip()}%"
        consulta = consulta.filter(
            or_(
                Item.nome.ilike(termo),
                Item.marca.ilike(termo),
                Item.modelo.ilike(termo),
            )
        )

    if status == "normal":
        consulta = consulta.filter(Item.quantidade > minimo)
    elif status == "limite":
        consulta = consulta.filter(Item.quantidade == minimo)
    elif status == "abaixo":
        consulta = consulta.filter(Item.quantidade < minimo)

    total = consulta.count()
    items = consulta.offset(skip).limit(limit).all()
    return {"total": total, "items": items}

@router.get("/buscar", response_model=list[ItemResponse])
def buscar_itens_por_nome(q: str, limit: int = 10, db: Session = Depends(get_db)):
    return db.query(Item).filter(Item.nome.ilike(f"%{q}%")).limit(limit).all()


@router.get("/criticos/paginado", response_model=PaginatedItemResponse)
def listar_itens_criticos_paginados(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    minimo = func.coalesce(Item.quantidade_minima, 0)
    consulta = db.query(Item).filter(Item.quantidade <= minimo)
    total = consulta.count()
    items = (
        consulta
        .order_by((minimo - Item.quantidade).desc(), Item.nome.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"total": total, "items": items}

@router.get("/{id}", response_model=ItemResponse)
def buscar_item(id: int, db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return db_item

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
    if item.quantidade != db_item.quantidade:
        raise HTTPException(
            status_code=400,
            detail="Para alterar a quantidade, use Ajuste de estoque e informe o motivo",
        )
    for campo, valor in item.model_dump().items():
        if campo == "quantidade":
            continue
        setattr(db_item, campo, valor)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{id}", status_code=204)
def deletar_item(id: int, db: Session = Depends(get_db)):
    from models.movimentacao import Movimentacao
    db_item = db.query(Item).filter(Item.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    tem_movimentacoes = db.query(Movimentacao).filter(Movimentacao.item_id == id).first()
    if tem_movimentacoes:
        raise HTTPException(status_code=409, detail="Item possui movimentações registradas e não pode ser deletado")
    db.delete(db_item)
    db.commit()

@router.post("/{id}/foto", response_model=ItemResponse)
def upload_foto_item(id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="O arquivo deve ser uma imagem")
    
    os.makedirs("/data/uploads", exist_ok=True)
    # Garante extensão jpg
    safe_filename = f"{id}_foto.jpg"
    filepath = os.path.join("/data/uploads", safe_filename)
    
    try:
        image = Image.open(file.file)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        image.thumbnail((800, 800))
        image.save(filepath, "JPEG", quality=85, optimize=True)
        
        db_item.foto_url = f"/uploads/{safe_filename}"
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar imagem: {str(e)}")
