from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class MaquinaBase(BaseModel):
    usuario: Optional[str] = None
    nome_maquina: str = Field(..., min_length=1, description="Nome da máquina ou Hostname")
    usuario_ad: Optional[str] = None
    ip: Optional[str] = None
    sistema_operacional: Optional[str] = None
    office: Optional[str] = None
    setor: Optional[str] = None
    antivirus: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True

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
