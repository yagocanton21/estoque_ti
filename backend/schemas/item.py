from datetime import datetime

from pydantic import BaseModel, Field, field_validator

class ItemCreate(BaseModel):           # entrada (POST/PUT)
    nome: str = Field(..., min_length=2, max_length=200, description="Nome do item")
    marca: str | None = Field(default=None, max_length=100)
    modelo: str | None = Field(default=None, max_length=100)
    quantidade: int = Field(ge=0, description="Quantidade não pode ser negativa")
    quantidade_minima: int | None = Field(default=0, ge=0, description="Mínimo não pode ser negativo")
    foto_url: str | None = None

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        limpo = valor.strip()
        if len(limpo) < 2:
            raise ValueError("O nome do item deve ter pelo menos 2 caracteres válidos.")
        return limpo

    @field_validator("marca", "modelo", mode="before")
    @classmethod
    def sanitizar_texto_opcional(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        limpo = str(valor).strip()
        return limpo if limpo else None

class ItemResponse(ItemCreate):        # saída (GET)
    id: int

    model_config = {
        "from_attributes": True,
        "revalidate_instances": "never"  # não revalida dados vindos do banco
    }

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
