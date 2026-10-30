from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional

class MaquinaBase(BaseModel):
    usuario: Optional[str] = None
    nome_maquina: str = Field(..., min_length=2, max_length=100, description="Nome da máquina ou Hostname")
    usuario_ad: Optional[str] = None
    ip: Optional[str] = None
    sistema_operacional: Optional[str] = None
    office: Optional[str] = None
    setor: Optional[str] = None
    antivirus: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True

    @field_validator("nome_maquina")
    @classmethod
    def validar_nome_maquina(cls, valor: str) -> str:
        limpo = valor.strip()
        if len(limpo) < 2:
            raise ValueError("O nome da máquina deve ter pelo menos 2 caracteres.")
        return limpo

    @field_validator("usuario", "usuario_ad", "ip", "sistema_operacional", "office", "setor", "antivirus", "observacoes", mode="before")
    @classmethod
    def sanitizar_texto_opcional(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        limpo = str(valor).strip()
        return limpo if limpo else None

class MaquinaCreate(MaquinaBase):
    pass

class MaquinaUpdate(MaquinaBase):
    pass

class MaquinaResponse(MaquinaBase):
    id: int
    data_criacao: datetime
    data_atualizacao: datetime

    model_config = {"from_attributes": True}

class MaquinaPaginadaResponse(BaseModel):
    items: list[MaquinaResponse]
    total: int
    pagina: int
    total_paginas: int

class EstatisticasIpsResponse(BaseModel):
    total_maquinas: int
    total_com_ip: int
    total_com_ad: int
    total_setores: int
