from pydantic import BaseModel, Field

class ItemCreate(BaseModel):           # entrada (POST/PUT)
    nome: str
    marca: str | None = None
    modelo: str | None = None
    quantidade: int = Field(ge=0, description="Quantidade não pode ser negativa")
    quantidade_minima: int | None = Field(default=0, ge=0, description="Mínimo não pode ser negativo")

class ItemResponse(ItemCreate):        # saída (GET)
    id: int

    model_config = {"from_attributes": True}  # permite ler ORM objects
