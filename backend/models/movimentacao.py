from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class Movimentacao(Base):
    __tablename__ = "movimentacoes"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id    = Column(Integer, ForeignKey("itens.id"), nullable=False)
    tipo       = Column(String, nullable=False, index=True)  # "entrada", "saida" ou "ajuste"
    quantidade = Column(Integer, nullable=False)
    quantidade_anterior = Column(Integer, nullable=True)
    quantidade_resultante = Column(Integer, nullable=True)
    motivo     = Column(String, nullable=True)
    entregue_para = Column(String, nullable=True)
    observacao = Column(String, nullable=True)
    data       = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    item = relationship("Item")
