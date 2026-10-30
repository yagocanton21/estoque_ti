from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional


class TipoEquipamentoCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        limpo = valor.strip()
        if len(limpo) < 2:
            raise ValueError("O nome do tipo de equipamento deve ter pelo menos 2 caracteres.")
        return limpo


class TipoEquipamentoResponse(BaseModel):
    id: int
    nome: str
    total: int = 0


class EquipamentoBase(BaseModel):
    tipo_id: int
    nome: str = Field(..., min_length=2, max_length=100)
    ip: Optional[str] = None
    mac: Optional[str] = None
    modelo: Optional[str] = None
    local: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        limpo = valor.strip()
        if len(limpo) < 2:
            raise ValueError("O nome do equipamento deve ter pelo menos 2 caracteres.")
        return limpo

    @field_validator("ip", "mac", "modelo", "local", "observacoes", mode="before")
    @classmethod
    def sanitizar_texto_opcional(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        limpo = str(valor).strip()
        return limpo if limpo else None


class EquipamentoCreate(EquipamentoBase):
    pass


class EquipamentoUpdate(EquipamentoBase):
    pass


class EquipamentoResponse(EquipamentoBase):
    id: int
    data_criacao: datetime
    data_atualizacao: datetime

    model_config = {"from_attributes": True}


class EquipamentoPaginadoResponse(BaseModel):
    items: list[EquipamentoResponse]
    total: int
    pagina: int
    total_paginas: int
