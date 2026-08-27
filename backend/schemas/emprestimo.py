from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class EmprestimoBase(BaseModel):
    item_nome: str = Field(..., min_length=1, description="Nome do item sendo emprestado")
    pessoa: str = Field(..., min_length=1, description="Nome da pessoa que está pegando emprestado")
    quantidade: int = Field(default=1, gt=0, description="Quantidade emprestada")

class EmprestimoCreate(EmprestimoBase):
    pass

class EmprestimoResponse(EmprestimoBase):
    id: int
    data_emprestimo: datetime
    devolvido: bool
    data_devolucao: Optional[datetime] = None

    model_config = {"from_attributes": True}
