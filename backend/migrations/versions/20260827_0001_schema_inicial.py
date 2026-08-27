"""Cria o esquema inicial do estoque.

Revision ID: 20260827_0001
Revises:
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "itens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("marca", sa.String(), nullable=True),
        sa.Column("modelo", sa.String(), nullable=True),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column("quantidade_minima", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_itens_id", "itens", ["id"], unique=False)

    op.create_table(
        "emprestimos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("item_nome", sa.String(), nullable=False),
        sa.Column("pessoa", sa.String(), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column("data_emprestimo", sa.DateTime(), nullable=False),
        sa.Column("devolvido", sa.Boolean(), nullable=False),
        sa.Column("data_devolucao", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_emprestimos_id", "emprestimos", ["id"], unique=False)

    op.create_table(
        "lista_compras",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column("comprado", sa.Boolean(), nullable=False),
        sa.Column("link", sa.String(), nullable=True),
        sa.Column("data_compra", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["item_id"], ["itens.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lista_compras_id", "lista_compras", ["id"], unique=False)

    op.create_table(
        "movimentacoes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column("data", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["item_id"], ["itens.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_movimentacoes_id", "movimentacoes", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_movimentacoes_id", table_name="movimentacoes")
    op.drop_table("movimentacoes")
    op.drop_index("ix_lista_compras_id", table_name="lista_compras")
    op.drop_table("lista_compras")
    op.drop_index("ix_emprestimos_id", table_name="emprestimos")
    op.drop_table("emprestimos")
    op.drop_index("ix_itens_id", table_name="itens")
    op.drop_table("itens")
