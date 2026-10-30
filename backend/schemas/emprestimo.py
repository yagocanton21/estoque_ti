from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class EmprestimoBase(BaseModel):
    item_nome: str = Field(..., min_length=2, max_length=150, description="Nome do item sendo emprestado")
    pessoa: str = Field(..., min_length=2, max_length=150, description="Nome da pessoa que está pegando emprestado")
    quantidade: int = Field(default=1, gt=0, description="Quantidade emprestada")

    @field_validator("item_nome", "pessoa")
    @classmethod
    def validar_textos(cls, valor: str) -> str:
        limpo = valor.strip()
        if len(limpo) < 2:
            raise ValueError("O campo deve ter pelo menos 2 caracteres.")
        return limpo

class EmprestimoCreate(EmprestimoBase):
    pass

class EmprestimoResponse(EmprestimoBase):
    id: int
    data_emprestimo: datetime
    devolvido: bool
    data_devolucao: Optional[datetime] = None

    model_config = {"from_attributes": True}
