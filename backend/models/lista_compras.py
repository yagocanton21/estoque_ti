from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from database import Base

class ListaCompras(Base):
    __tablename__ = "lista_compras"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id    = Column(Integer, ForeignKey("itens.id"), nullable=True)
    nome       = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    comprado   = Column(Boolean, nullable=False, default=False)