from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

class Orcamento(Base):
    __tablename__ = "orcamentos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lista_compras_id = Column(Integer, ForeignKey("lista_compras.id", ondelete="CASCADE"), nullable=False)
    fornecedor = Column(String, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    frete = Column(Float, nullable=False, default=0.0)
    link = Column(String, nullable=True)
    selecionado = Column(Boolean, nullable=False, default=False)

    lista_compras = relationship("ListaCompras", back_populates="orcamentos")