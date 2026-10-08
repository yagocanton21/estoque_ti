"""add_equipamentos_rede

Revision ID: 20261008_0001
Revises: 371777fd500e
Create Date: 2026-10-08 11:30:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


revision: str = "20261008_0001"
down_revision: Union[str, Sequence[str], None] = "371777fd500e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tipos = op.create_table(
        "tipos_equipamento",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("data_criacao", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("tipos_equipamento", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_tipos_equipamento_id"), ["id"], unique=False)
        batch_op.create_index(batch_op.f("ix_tipos_equipamento_nome"), ["nome"], unique=True)

    op.create_table(
        "equipamentos_rede",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tipo_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("ip", sa.String(), nullable=True),
        sa.Column("mac", sa.String(), nullable=True),
        sa.Column("modelo", sa.String(), nullable=True),
        sa.Column("local", sa.String(), nullable=True),
        sa.Column("observacoes", sa.String(), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column("data_criacao", sa.DateTime(), nullable=False),
        sa.Column("data_atualizacao", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tipo_id"], ["tipos_equipamento.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("equipamentos_rede", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_equipamentos_rede_id"), ["id"], unique=False)
        batch_op.create_index(batch_op.f("ix_equipamentos_rede_tipo_id"), ["tipo_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_equipamentos_rede_nome"), ["nome"], unique=False)
        batch_op.create_index(batch_op.f("ix_equipamentos_rede_ip"), ["ip"], unique=False)
        batch_op.create_index(batch_op.f("ix_equipamentos_rede_local"), ["local"], unique=False)

    agora = datetime.now(timezone.utc)
    op.bulk_insert(
        tipos,
        [
            {"nome": "Coletores", "data_criacao": agora},
            {"nome": "Access Points", "data_criacao": agora},
            {"nome": "Roteadores", "data_criacao": agora},
        ],
    )


def downgrade() -> None:
    with op.batch_alter_table("equipamentos_rede", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_equipamentos_rede_local"))
        batch_op.drop_index(batch_op.f("ix_equipamentos_rede_ip"))
        batch_op.drop_index(batch_op.f("ix_equipamentos_rede_nome"))
        batch_op.drop_index(batch_op.f("ix_equipamentos_rede_tipo_id"))
        batch_op.drop_index(batch_op.f("ix_equipamentos_rede_id"))
    op.drop_table("equipamentos_rede")
    with op.batch_alter_table("tipos_equipamento", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_tipos_equipamento_nome"))
        batch_op.drop_index(batch_op.f("ix_tipos_equipamento_id"))
    op.drop_table("tipos_equipamento")
