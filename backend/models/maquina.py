from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index, text
from datetime import datetime, timezone
from database import Base

def obter_agora_utc():
    return datetime.now(timezone.utc)

class Maquina(Base):
    __tablename__ = "maquinas"
    __table_args__ = (
        Index(
            "uq_maquinas_nome_ativo",
            "nome_maquina",
            unique=True,
            sqlite_where=text("ativo = 1"),
            postgresql_where=text("ativo = true"),
        ),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario = Column(String, nullable=True, index=True)              # Nome do colaborador / usuário
    nome_maquina = Column(String(collation="NOCASE"), nullable=False, index=True)         # Hostname / Nome da máquina
    usuario_ad = Column(String, nullable=True, index=True)            # Usuário do Active Directory
    ip = Column(String, nullable=True, index=True)                    # Endereço IP
    sistema_operacional = Column(String, nullable=True)               # Windows 11, Windows 10, Linux, etc.
    office = Column(String, nullable=True)                            # Versão do Office / Licença
    setor = Column(String, nullable=True, index=True)                 # Setor / Departamento
    antivirus = Column(String, nullable=True)                         # Antivírus / EDR
    observacoes = Column(String, nullable=True)                       # Observações gerais
    ativo = Column(Boolean, default=True, nullable=False)
    data_criacao = Column(DateTime, default=obter_agora_utc, nullable=False)
    data_atualizacao = Column(DateTime, default=obter_agora_utc, onupdate=obter_agora_utc, nullable=False)
