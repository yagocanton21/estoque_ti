"""simplificar_nomes_office

Revision ID: 20261008_0003
Revises: 20261008_0002
Create Date: 2026-10-08 16:20:00
"""
from typing import Sequence, Union
import re

from alembic import op
import sqlalchemy as sa


revision: str = "20261008_0003"
down_revision: Union[str, Sequence[str], None] = "20261008_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def simplificar(texto: str | None) -> str | None:
    if not texto:
        return None
    limpo = texto.strip()
    if not limpo or limpo.lower() in [
        "nao identificado",
        "não identificado",
        "falha na consulta",
        "falha",
        "sem office",
        "nenhum",
        "none",
        "null",
        "-",
        "—",
    ]:
        return None

    if re.search(r"\b(365|o365|m365)\b", limpo, re.IGNORECASE):
        return "Microsoft 365"

    m_ano = re.search(r"\b(20\d\d)\b", limpo)
    if m_ano:
        return f"Office {m_ano.group(1)}"

    return limpo


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, office FROM maquinas WHERE office IS NOT NULL AND office != ''")
    ).fetchall()

    for row_id, off in rows:
        novo = simplificar(off)
        conn.execute(
            sa.text("UPDATE maquinas SET office = :novo WHERE id = :id"),
            {"novo": novo, "id": row_id},
        )


def downgrade() -> None:
    pass
