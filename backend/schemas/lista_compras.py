from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ListaComprasBase(BaseModel):
    item_id: Optional[int] = Field(default=None, description="ID do item vinculado no estoque (opcional)")
    nome: str = Field(..., min_length=1, description="Nome do item para comprar")
    quantidade: int = Field(default=1, gt=0, description="Quantidade deve ser maior que zero")
    status: str = Field(default="pendente", description="Status da compra: pendente, comprado, entregue, cancelado")
    link: Optional[str] = Field(default=None, description="Link do produto")

class ListaComprasCreate(ListaComprasBase):
    pass

class ListaComprasUpdate(BaseModel):
    nome: Optional[str] = None
    quantidade: Optional[int] = Field(default=None, gt=0)
    status: Optional[str] = None
    link: Optional[str] = None
    data_compra: Optional[datetime] = None

from schemas.orcamento import OrcamentoResponse

class ListaComprasResponse(ListaComprasBase):
    id: int
    data_compra: Optional[datetime] = None
    tem_pdf: bool = False
    pdf_nome: Optional[str] = None
    pdf_atualizado_em: Optional[datetime] = None
    orcamentos: list[OrcamentoResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}

from typing import List
class PaginatedListaComprasResponse(BaseModel):
    total: int
    items: List[ListaComprasResponse]


class PdfOrcamentoResponse(BaseModel):
    tem_pdf: bool
    pdf_nome: str
    pdf_atualizado_em: datetime
