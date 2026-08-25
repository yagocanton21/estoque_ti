from pydantic import BaseModel

class ItemCreate(BaseModel):           # entrada (POST/PUT)
    nome: str
    marca: str | None = None
    modelo: str | None = None
    quantidade: int

class ItemResponse(ItemCreate):        # saída (GET)
    id: int

    model_config = {"from_attributes": True}  # permite ler ORM objects
