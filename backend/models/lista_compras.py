from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, LargeBinary, String, text
from sqlalchemy.orm import deferred, relationship
from database import Base

class ListaCompras(Base):
    __tablename__ = "lista_compras"
    __table_args__ = (
        Index(
            "uq_lista_compras_item_ativo",
            "item_id",
            unique=True,
            sqlite_where=text("status IN ('pendente', 'comprado') AND item_id IS NOT NULL"),
            postgresql_where=text("status IN ('pendente', 'comprado') AND item_id IS NOT NULL"),
        ),
        CheckConstraint(
            "status IN ('pendente', 'comprado', 'entregue', 'cancelado')",
            name="chk_lista_compras_status_valido",
        ),
    )

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id    = Column(Integer, ForeignKey("itens.id"), nullable=True)
    nome       = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    status     = Column(String, nullable=False, default="pendente")
    link       = Column(String, nullable=True)
    data_compra = Column(DateTime, nullable=True)
    orcamento_pdf = deferred(Column(LargeBinary, nullable=True))
    orcamento_pdf_nome = Column(String(180), nullable=True)
    orcamento_pdf_atualizado_em = Column(DateTime, nullable=True)

    orcamentos = relationship("Orcamento", back_populates="lista_compras", cascade="all, delete-orphan")

    @property
    def tem_pdf(self) -> bool:
        return bool(self.orcamento_pdf_nome)

    @property
    def pdf_nome(self) -> str | None:
        return self.orcamento_pdf_nome

    @property
    def pdf_atualizado_em(self):
        return self.orcamento_pdf_atualizado_em
