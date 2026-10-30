from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
from datetime import datetime

StatusCompra = Literal["pendente", "comprado", "entregue", "cancelado"]

class ListaComprasBase(BaseModel):
    item_id: Optional[int] = Field(default=None, description="ID do item vinculado no estoque (opcional)")
    nome: str = Field(..., min_length=2, max_length=200, description="Nome do item para comprar")
    quantidade: int = Field(default=1, gt=0, description="Quantidade deve ser maior que zero")
    status: StatusCompra = Field(default="pendente", description="Status da compra: pendente, comprado, entregue, cancelado")
    link: Optional[str] = Field(default=None, max_length=4000, description="Link do produto")

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        limpo = valor.strip()
        if len(limpo) < 2:
            raise ValueError("O nome do item deve ter pelo menos 2 caracteres.")
        return limpo

class ListaComprasCreate(ListaComprasBase):
    pass

class ListaComprasUpdate(BaseModel):
    nome: Optional[str] = Field(default=None, max_length=200)
    quantidade: Optional[int] = Field(default=None, gt=0)
    status: Optional[StatusCompra] = None
    link: Optional[str] = Field(default=None, max_length=4000)
    data_compra: Optional[datetime] = None

    @field_validator("nome")
    @classmethod
    def validar_nome_opcional(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        limpo = valor.strip()
        if len(limpo) < 2:
            raise ValueError("O nome do item deve ter pelo menos 2 caracteres.")
        return limpo

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


class GerarPdfOrcamentoRequest(BaseModel):
    cidade: str = Field(default="Bom Jesus dos Perdões", min_length=2, max_length=100)
    solicitante: str = Field(default="Yago", min_length=2, max_length=100)
    destinatario: str = Field(default="Julia / Katia", min_length=2, max_length=100)
    assinatura: str = Field(default="Yago Canton.", min_length=2, max_length=100)

    @field_validator("cidade", "solicitante", "destinatario", "assinatura")
    @classmethod
    def validar_campos(cls, valor: str) -> str:
        limpo = valor.strip()
        if len(limpo) < 2:
            raise ValueError("O campo deve ter pelo menos 2 caracteres.")
        return limpo
