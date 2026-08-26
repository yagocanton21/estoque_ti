from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class Movimentacao(Base):
    __tablename__ = "movimentacoes"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id    = Column(Integer, ForeignKey("itens.id"), nullable=False)
    tipo       = Column(String, nullable=False)  # "entrada" ou "saida"
    quantidade = Column(Integer, nullable=False)
    data       = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    item = relationship("Item")
