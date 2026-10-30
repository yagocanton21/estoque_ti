"""add_concorrencia_e_constraints

Revision ID: 20261029_0002
Revises: 20261029_0001
Create Date: 2026-10-29 21:40:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261029_0002"
down_revision: Union[str, Sequence[str], None] = "20261029_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Saneamento prévio defensivo caso a base existente já tenha dados inconsistentes
    op.execute("UPDATE itens SET quantidade = 0 WHERE quantidade < 0")
    op.execute(
        """
        DELETE FROM lista_compras
        WHERE id NOT IN (
            SELECT MAX(id) FROM lista_compras
            WHERE status IN ('pendente', 'comprado') AND item_id IS NOT NULL
            GROUP BY item_id
        ) AND status IN ('pendente', 'comprado') AND item_id IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE maquinas
        SET ativo = 0
        WHERE id NOT IN (
            SELECT MAX(id) FROM maquinas
            WHERE ativo = 1
            GROUP BY nome_maquina
        ) AND ativo = 1
        """
    )

    # 1. CheckConstraint para impedir saldo negativo em itens
    with op.batch_alter_table("itens") as batch_op:
        batch_op.create_check_constraint("chk_item_quantidade_nao_negativa", "quantidade >= 0")

    # 2. Índice parcial único para impedir duplicidade de itens ativos na lista de compras
    op.create_index(
        "uq_lista_compras_item_ativo",
        "lista_compras",
        ["item_id"],
        unique=True,
        sqlite_where=sa.text("status IN ('pendente', 'comprado') AND item_id IS NOT NULL"),
        postgresql_where=sa.text("status IN ('pendente', 'comprado') AND item_id IS NOT NULL"),
    )

    # 3. Índice parcial único para impedir duplicidade de máquinas ativas
    op.create_index(
        "uq_maquinas_nome_ativo",
        "maquinas",
        ["nome_maquina"],
        unique=True,
        sqlite_where=sa.text("ativo = 1"),
        postgresql_where=sa.text("ativo = true"),
    )


def downgrade() -> None:
    op.drop_index("uq_maquinas_nome_ativo", table_name="maquinas")
    op.drop_index("uq_lista_compras_item_ativo", table_name="lista_compras")
    with op.batch_alter_table("itens") as batch_op:
        batch_op.drop_constraint("chk_item_quantidade_nao_negativa", type_="check")
