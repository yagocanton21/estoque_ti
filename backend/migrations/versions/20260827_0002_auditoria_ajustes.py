"""Adiciona auditoria às movimentações de estoque.

Revision ID: 20260827_0002
Revises: 20260827_0001
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0002"
down_revision: Union[str, Sequence[str], None] = "20260827_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("movimentacoes") as batch_op:
        batch_op.add_column(sa.Column("quantidade_anterior", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("quantidade_resultante", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("motivo", sa.String(), nullable=True))
        batch_op.create_index("ix_movimentacoes_data", ["data"], unique=False)
        batch_op.create_index("ix_movimentacoes_tipo", ["tipo"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("movimentacoes") as batch_op:
        batch_op.drop_index("ix_movimentacoes_tipo")
        batch_op.drop_index("ix_movimentacoes_data")
        batch_op.drop_column("motivo")
        batch_op.drop_column("quantidade_resultante")
        batch_op.drop_column("quantidade_anterior")
