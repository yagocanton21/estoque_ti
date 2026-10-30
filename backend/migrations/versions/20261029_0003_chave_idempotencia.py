"""add_chave_idempotencia_movimentacoes

Revision ID: 20261029_0003
Revises: 20261029_0002
Create Date: 2026-10-29 21:50:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261029_0003"
down_revision: Union[str, Sequence[str], None] = "20261029_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("movimentacoes") as batch_op:
        batch_op.add_column(sa.Column("chave_idempotencia", sa.String(length=100), nullable=True))
        batch_op.create_index("ix_movimentacoes_chave_idempotencia", ["chave_idempotencia"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("movimentacoes") as batch_op:
        batch_op.drop_index("ix_movimentacoes_chave_idempotencia")
        batch_op.drop_column("chave_idempotencia")
