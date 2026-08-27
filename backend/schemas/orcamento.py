from pydantic import BaseModel, Field
from typing import Optional

class OrcamentoBase(BaseModel):
    fornecedor: str = Field(..., min_length=1, description="Nome da loja ou site")
    preco_unitario: float = Field(..., gt=0, description="Preço unitário do produto")
    frete: float = Field(default=0.0, ge=0, description="Valor do frete")
    link: Optional[str] = Field(default=None, description="Link do produto")
    selecionado: bool = False

class OrcamentoCreate(OrcamentoBase):
    pass

class OrcamentoUpdate(BaseModel):
    fornecedor: Optional[str] = None
    preco_unitario: Optional[float] = Field(default=None, gt=0)
    frete: Optional[float] = Field(default=None, ge=0)
    link: Optional[str] = None
    selecionado: Optional[bool] = None

class OrcamentoResponse(OrcamentoBase):
    id: int
    lista_compras_id: int

    model_config = {"from_attributes": True}
