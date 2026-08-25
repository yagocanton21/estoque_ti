from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.item import Item
from schemas.item import ItemCreate, ItemResponse

router = APIRouter(prefix="/itens", tags=["Itens"])

@router.get("/", response_model=list[ItemResponse])
def listar_itens(db: Session = Depends(get_db)):
    return db.query(Item).all()