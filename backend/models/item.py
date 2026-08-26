from sqlalchemy import Column, Integer, String
from database import Base

class Item(Base):
    __tablename__ = "itens"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome       = Column(String, nullable=False)
    marca      = Column(String, nullable=True)
    modelo     = Column(String, nullable=True)
    quantidade = Column(Integer, nullable=False)
    quantidade_minima = Column(Integer, nullable=True, default=0)
