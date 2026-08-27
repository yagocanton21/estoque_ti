from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class MovimentacaoCreate(BaseModel):
    item_id: int
    tipo: Literal["entrada", "saida"]
    quantidade: int = Field(gt=0, description="Quantidade deve ser maior que zero")


class AjusteEstoqueCreate(BaseModel):
    item_id: int
    nova_quantidade: int = Field(ge=0)
    motivo: str = Field(min_length=3, max_length=300)

    @field_validator("motivo")
    @classmethod
    def validar_motivo(cls, valor: str) -> str:
        motivo = valor.strip()
        if len(motivo) < 3:
            raise ValueError("Informe um motivo com pelo menos 3 caracteres")
        return motivo


class MovimentacaoResponse(BaseModel):
    id: int
    item_id: int
    item_nome: str
    tipo: Literal["entrada", "saida", "ajuste"]
    quantidade: int
    quantidade_anterior: int | None
    quantidade_resultante: int | None
    motivo: str | None
    data: datetime
    alerta: str | None = None


class MovimentacaoPaginadaResponse(BaseModel):
    total: int
    items: list[MovimentacaoResponse]
