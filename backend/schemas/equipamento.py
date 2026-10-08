from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TipoEquipamentoCreate(BaseModel):
    nome: str = Field(..., min_length=1)


class TipoEquipamentoResponse(BaseModel):
    id: int
    nome: str
    total: int = 0


class EquipamentoBase(BaseModel):
    tipo_id: int
    nome: str = Field(..., min_length=1)
    ip: Optional[str] = None
    mac: Optional[str] = None
    modelo: Optional[str] = None
    local: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True


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
