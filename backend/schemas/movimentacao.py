from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal

class MovimentacaoCreate(BaseModel):
    item_id: int
    tipo: Literal["entrada", "saida"]
    quantidade: int = Field(gt=0, description="Quantidade deve ser maior que zero")

class MovimentacaoResponse(MovimentacaoCreate):
    id: int
    data: datetime
    alerta: str | None = None

    model_config = {"from_attributes": False}
