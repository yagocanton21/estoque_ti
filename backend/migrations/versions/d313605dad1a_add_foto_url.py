"""add foto_url

Revision ID: d313605dad1a
Revises: 20260827_0004
Create Date: 2026-09-01 14:02:02.980831
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd313605dad1a'
down_revision: Union[str, Sequence[str], None] = '20260827_0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('itens', sa.Column('foto_url', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('itens', 'foto_url')
