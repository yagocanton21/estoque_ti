"""limpar_dominio_usuario_ad

Revision ID: 20261008_0002
Revises: 20261008_0001
Create Date: 2026-10-08 15:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261008_0002"
down_revision: Union[str, Sequence[str], None] = "20261008_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove qualquer prefixo de domínio (ex: ARTHICOM\controle.qualidade -> controle.qualidade)
    op.execute(
        "UPDATE maquinas "
        "SET usuario_ad = SUBSTR(usuario_ad, INSTR(usuario_ad, '\\') + 1) "
        "WHERE usuario_ad LIKE '%\\%'"
    )
    op.execute(
        "UPDATE maquinas "
        "SET usuario_ad = SUBSTR(usuario_ad, INSTR(usuario_ad, '/') + 1) "
        "WHERE usuario_ad LIKE '%/%'"
    )
    op.execute(
        "UPDATE maquinas "
        "SET usuario_ad = LTRIM(usuario_ad, '@') "
        "WHERE usuario_ad LIKE '@%'"
    )


def downgrade() -> None:
    pass
