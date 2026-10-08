from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime, timezone
from database import Base


def obter_agora_utc():
    return datetime.now(timezone.utc)


class TipoEquipamento(Base):
    """Categoria de equipamento de rede (Coletores, Access Points, Roteadores...)."""
    __tablename__ = "tipos_equipamento"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String, nullable=False, unique=True, index=True)
    data_criacao = Column(DateTime, default=obter_agora_utc, nullable=False)


class Equipamento(Base):
    __tablename__ = "equipamentos_rede"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tipo_id = Column(Integer, ForeignKey("tipos_equipamento.id"), nullable=False, index=True)
    nome = Column(String, nullable=False, index=True)          # Nome / identificação
    ip = Column(String, nullable=True, index=True)
    mac = Column(String, nullable=True)
    modelo = Column(String, nullable=True)
    local = Column(String, nullable=True, index=True)          # Setor / localização física
    observacoes = Column(String, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    data_criacao = Column(DateTime, default=obter_agora_utc, nullable=False)
    data_atualizacao = Column(DateTime, default=obter_agora_utc, onupdate=obter_agora_utc, nullable=False)
