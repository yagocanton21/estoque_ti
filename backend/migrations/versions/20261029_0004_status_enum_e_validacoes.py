"""add_status_enum_e_validacoes

Revision ID: 20261029_0004
Revises: 20261029_0003
Create Date: 2026-10-29 22:15:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261029_0004"
down_revision: Union[str, Sequence[str], None] = "20261029_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Saneamento defensivo de registros com status legado ou nulo
    op.execute(
        """
        UPDATE lista_compras
        SET status = 'pendente'
        WHERE status NOT IN ('pendente', 'comprado', 'entregue', 'cancelado') OR status IS NULL
        """
    )

    with op.batch_alter_table("lista_compras") as batch_op:
        batch_op.create_check_constraint(
            "chk_lista_compras_status_valido",
            "status IN ('pendente', 'comprado', 'entregue', 'cancelado')"
        )


def downgrade() -> None:
    with op.batch_alter_table("lista_compras") as batch_op:
        batch_op.drop_constraint("chk_lista_compras_status_valido", type_="check")
