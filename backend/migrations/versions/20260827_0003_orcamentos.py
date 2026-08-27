"""Cria orçamentos para os itens da lista de compras.

Revision ID: 20260827_0003
Revises: 20260827_0002
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0003"
down_revision: Union[str, Sequence[str], None] = "20260827_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "orcamentos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("lista_compras_id", sa.Integer(), nullable=False),
        sa.Column("fornecedor", sa.String(), nullable=False),
        sa.Column("preco_unitario", sa.Numeric(12, 2), nullable=False),
        sa.Column("frete", sa.Numeric(12, 2), nullable=False),
        sa.Column("link", sa.String(), nullable=True),
        sa.Column("selecionado", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["lista_compras_id"],
            ["lista_compras.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_orcamentos_id", "orcamentos", ["id"], unique=False)
    op.create_index(
        "ix_orcamentos_lista_compras_id",
        "orcamentos",
        ["lista_compras_id"],
        unique=False,
    )
    op.create_index(
        "uq_orcamentos_selecionado_por_item",
        "orcamentos",
        ["lista_compras_id"],
        unique=True,
        sqlite_where=sa.text("selecionado = 1"),
        postgresql_where=sa.text("selecionado = true"),
    )


def downgrade() -> None:
    op.drop_index("uq_orcamentos_selecionado_por_item", table_name="orcamentos")
    op.drop_index("ix_orcamentos_lista_compras_id", table_name="orcamentos")
    op.drop_index("ix_orcamentos_id", table_name="orcamentos")
    op.drop_table("orcamentos")
