from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, Numeric, String, text
from sqlalchemy.orm import relationship
from database import Base

class Orcamento(Base):
    __tablename__ = "orcamentos"
    __table_args__ = (
        Index("ix_orcamentos_lista_compras_id", "lista_compras_id"),
        Index(
            "uq_orcamentos_selecionado_por_item",
            "lista_compras_id",
            unique=True,
            sqlite_where=text("selecionado = 1"),
            postgresql_where=text("selecionado = true"),
        ),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lista_compras_id = Column(Integer, ForeignKey("lista_compras.id", ondelete="CASCADE"), nullable=False)
    fornecedor = Column(String, nullable=False)
    preco_unitario = Column(Numeric(12, 2), nullable=False)
    frete = Column(Numeric(12, 2), nullable=False, default=0)
    link = Column(String, nullable=True)
    selecionado = Column(Boolean, nullable=False, default=False)

    lista_compras = relationship("ListaCompras", back_populates="orcamentos")
