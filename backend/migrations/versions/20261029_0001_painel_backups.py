"""add_painel_backups

Revision ID: 20261029_0001
Revises: 20261008_0003
Create Date: 2026-10-29 10:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261029_0001"
down_revision: Union[str, Sequence[str], None] = "20261008_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "backup_execucoes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("recebido_em", sa.DateTime(), nullable=False),
        sa.Column("fonte", sa.String(), nullable=False),
        sa.Column("maquina", sa.String(), nullable=False),
        sa.Column("tarefa", sa.String(), nullable=False),
        sa.Column("chave_execucao", sa.String(), nullable=False),
        sa.Column("job_id", sa.String(), nullable=True),
        sa.Column("inicio", sa.DateTime(), nullable=True),
        sa.Column("fim", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("resultado_original", sa.String(), nullable=True),
        sa.Column("erros", sa.Integer(), nullable=False),
        sa.Column("avisos", sa.Integer(), nullable=False),
        sa.Column("processados", sa.Integer(), nullable=False),
        sa.Column("copiados", sa.Integer(), nullable=False),
        sa.Column("tamanho_bytes", sa.Integer(), nullable=False),
        sa.Column("duracao_s", sa.Integer(), nullable=False),
        sa.Column("destino", sa.String(), nullable=True),
        sa.Column("mensagem", sa.String(), nullable=True),
        sa.Column("payload_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("fonte", "maquina", "tarefa", "chave_execucao", name="ux_backup_execucoes_execucao"),
    )
    with op.batch_alter_table("backup_execucoes", schema=None) as batch_op:
        batch_op.create_index("ix_backup_execucoes_fim", ["fim"], unique=False)

    op.create_table(
        "backup_em_andamento",
        sa.Column("fonte", sa.String(), nullable=False),
        sa.Column("maquina", sa.String(), nullable=False),
        sa.Column("tarefa", sa.String(), nullable=False),
        sa.Column("inicio", sa.DateTime(), nullable=True),
        sa.Column("visto_em", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("fonte", "maquina", "tarefa"),
    )

    op.create_table(
        "backup_apelidos_maquina",
        sa.Column("maquina", sa.String(), nullable=False),
        sa.Column("apelido", sa.String(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("maquina"),
    )

    op.create_table(
        "backup_apelidos_cartao",
        sa.Column("fonte", sa.String(), nullable=False),
        sa.Column("maquina", sa.String(), nullable=False),
        sa.Column("tarefa", sa.String(), nullable=False),
        sa.Column("apelido", sa.String(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("fonte", "maquina", "tarefa"),
    )

    op.create_table(
        "backup_agentes",
        sa.Column("maquina", sa.String(), nullable=False),
        sa.Column("fonte", sa.String(), nullable=False),
        sa.Column("ultimo_contato", sa.DateTime(), nullable=False),
        sa.Column("versao", sa.String(), nullable=True),
        sa.Column("info", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("maquina"),
    )

    op.create_table(
        "backup_payloads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("recebido_em", sa.DateTime(), nullable=False),
        sa.Column("fonte", sa.String(), nullable=False),
        sa.Column("maquina", sa.String(), nullable=True),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "backup_alertas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("chave", sa.String(), nullable=False),
        sa.Column("nivel", sa.String(), nullable=False),
        sa.Column("maquina", sa.String(), nullable=True),
        sa.Column("tarefa", sa.String(), nullable=True),
        sa.Column("fonte", sa.String(), nullable=True),
        sa.Column("mensagem", sa.String(), nullable=False),
        sa.Column("reconhecido_em", sa.DateTime(), nullable=True),
        sa.Column("resolvido_em", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("chave"),
    )


def downgrade() -> None:
    op.drop_table("backup_alertas")
    op.drop_table("backup_payloads")
    op.drop_table("backup_agentes")
    op.drop_table("backup_apelidos_cartao")
    op.drop_table("backup_apelidos_maquina")
    op.drop_table("backup_em_andamento")
    with op.batch_alter_table("backup_execucoes", schema=None) as batch_op:
        batch_op.drop_index("ix_backup_execucoes_fim")
    op.drop_table("backup_execucoes")
