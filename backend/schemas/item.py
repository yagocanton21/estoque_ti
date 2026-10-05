from pydantic import BaseModel, Field

class ItemCreate(BaseModel):           # entrada (POST/PUT)
    nome: str
    marca: str | None = None
    modelo: str | None = None
    quantidade: int = Field(ge=0, description="Quantidade não pode ser negativa")
    quantidade_minima: int | None = Field(default=0, ge=0, description="Mínimo não pode ser negativo")
    foto_url: str | None = None

class ItemResponse(ItemCreate):        # saída (GET)
    id: int

    model_config = {
        "from_attributes": True,
        "revalidate_instances": "never"  # não revalida dados vindos do banco
    }

from datetime import datetime

class ItemHistoricoMovimentacao(BaseModel):
    id: int
    tipo: str
    quantidade: int
    quantidade_anterior: int | None = None
    quantidade_resultante: int | None = None
    motivo: str | None = None
    entregue_para: str | None = None
    observacao: str | None = None
    data: datetime

    model_config = {"from_attributes": True}

class ItemHistoricoResponse(BaseModel):
    item: ItemResponse
    total_entradas: int
    total_saidas: int
    total_ajustes: int
    movimentacoes: list[ItemHistoricoMovimentacao]
