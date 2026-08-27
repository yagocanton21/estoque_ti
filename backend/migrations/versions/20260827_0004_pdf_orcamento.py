"""Armazena o PDF do orçamento no histórico de compras.

Revision ID: 20260827_0004
Revises: 20260827_0003
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0004"
down_revision: Union[str, Sequence[str], None] = "20260827_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("lista_compras") as batch_op:
        batch_op.add_column(sa.Column("orcamento_pdf", sa.LargeBinary(), nullable=True))
        batch_op.add_column(sa.Column("orcamento_pdf_nome", sa.String(length=180), nullable=True))
        batch_op.add_column(sa.Column("orcamento_pdf_atualizado_em", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("lista_compras") as batch_op:
        batch_op.drop_column("orcamento_pdf_atualizado_em")
        batch_op.drop_column("orcamento_pdf_nome")
        batch_op.drop_column("orcamento_pdf")
