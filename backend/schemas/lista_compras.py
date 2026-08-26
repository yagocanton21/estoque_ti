from pydantic import BaseModel, Field
from typing import Optional

class ListaComprasBase(BaseModel):
    item_id: Optional[int] = Field(default=None, description="ID do item vinculado no estoque (opcional)")
    nome: str = Field(..., min_length=1, description="Nome do item para comprar")
    quantidade: int = Field(default=1, gt=0, description="Quantidade deve ser maior que zero")
    comprado: bool = False

class ListaComprasCreate(ListaComprasBase):
    pass

class ListaComprasUpdate(BaseModel):
    nome: Optional[str] = None
    quantidade: Optional[int] = Field(default=None, gt=0)
    comprado: Optional[bool] = None

class ListaComprasResponse(ListaComprasBase):
    id: int

    model_config = {"from_attributes": True}