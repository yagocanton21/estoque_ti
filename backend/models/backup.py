from sqlalchemy import Column, Integer, String, Text, DateTime, Index, UniqueConstraint
from database import Base

# Painel de backups (Cobian Reflector nos servidores + Duplicati nas máquinas).
# Datas sempre gravadas em UTC sem fuso (o SQLite não guarda fuso).


class BackupExecucao(Base):
    """Uma execução de backup relatada por um agente Cobian ou pelo Duplicati."""
    __tablename__ = "backup_execucoes"
    __table_args__ = (
        UniqueConstraint("fonte", "maquina", "tarefa", "chave_execucao", name="ux_backup_execucoes_execucao"),
        Index("ix_backup_execucoes_fim", "fim"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    recebido_em = Column(DateTime, nullable=False)
    fonte = Column(String, nullable=False)            # cobian | duplicati
    maquina = Column(String, nullable=False)
    tarefa = Column(String, nullable=False)
    chave_execucao = Column(String, nullable=False)   # identifica a execução (evita duplicar no reenvio)
    job_id = Column(String, nullable=True)
    inicio = Column(DateTime, nullable=True)
    fim = Column(DateTime, nullable=True)
    status = Column(String, nullable=False)           # ok | aviso | erro
    resultado_original = Column(String, nullable=True)
    erros = Column(Integer, nullable=False, default=0)
    avisos = Column(Integer, nullable=False, default=0)
    processados = Column(Integer, nullable=False, default=0)
    copiados = Column(Integer, nullable=False, default=0)
    tamanho_bytes = Column(Integer, nullable=False, default=0)
    duracao_s = Column(Integer, nullable=False, default=0)
    destino = Column(String, nullable=True)
    mensagem = Column(String, nullable=True)
    payload_id = Column(Integer, nullable=True)


class BackupEmAndamento(Base):
    """Tarefas que o agente viu rodando no último envio."""
    __tablename__ = "backup_em_andamento"

    fonte = Column(String, primary_key=True)
    maquina = Column(String, primary_key=True)
    tarefa = Column(String, primary_key=True)
    inicio = Column(DateTime, nullable=True)
    visto_em = Column(DateTime, nullable=False)


class BackupApelidoMaquina(Base):
    __tablename__ = "backup_apelidos_maquina"

    maquina = Column(String, primary_key=True)
    apelido = Column(String, nullable=False)          # '' = sem apelido (sobrepõe o do arquivo de config)
    atualizado_em = Column(DateTime, nullable=False)


class BackupApelidoCartao(Base):
    """Apelido de um backup específico, independente dos outros cartões da mesma máquina."""
    __tablename__ = "backup_apelidos_cartao"

    fonte = Column(String, primary_key=True)
    maquina = Column(String, primary_key=True)
    tarefa = Column(String, primary_key=True)
    apelido = Column(String, nullable=False)
    atualizado_em = Column(DateTime, nullable=False)


class BackupAgente(Base):
    __tablename__ = "backup_agentes"

    maquina = Column(String, primary_key=True)
    fonte = Column(String, nullable=False)
    ultimo_contato = Column(DateTime, nullable=False)
    versao = Column(String, nullable=True)
    info = Column(Text, nullable=True)                # heartbeat do agente em JSON


class BackupPayload(Base):
    """Corpo cru recebido (calibração). Só os mais recentes são mantidos."""
    __tablename__ = "backup_payloads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recebido_em = Column(DateTime, nullable=False)
    fonte = Column(String, nullable=False)
    maquina = Column(String, nullable=True)
    payload = Column(Text, nullable=False)


class BackupAlerta(Base):
    __tablename__ = "backup_alertas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    criado_em = Column(DateTime, nullable=False)
    chave = Column(String, nullable=False, unique=True)   # um alerta por episódio
    nivel = Column(String, nullable=False)                # erro | aviso | atraso | agente
    maquina = Column(String, nullable=True)
    tarefa = Column(String, nullable=True)
    fonte = Column(String, nullable=True)
    mensagem = Column(String, nullable=False)
    reconhecido_em = Column(DateTime, nullable=True)
    resolvido_em = Column(DateTime, nullable=True)
