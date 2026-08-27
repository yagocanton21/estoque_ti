from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from database import Base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

class Emprestimo(Base):
    __tablename__ = "emprestimos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_nome = Column(String, nullable=False)
    pessoa = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    data_emprestimo = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    devolvido = Column(Boolean, nullable=False, default=False)
    data_devolucao = Column(DateTime, nullable=True)
