"""add_data_cotacao_orcamentos

Revision ID: 20261117_0001
Revises: 20261029_0004
Create Date: 2026-11-17 14:30:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261117_0001"
down_revision: Union[str, Sequence[str], None] = "20261029_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("orcamentos") as batch_op:
        batch_op.add_column(
            sa.Column(
                "data_cotacao",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("orcamentos") as batch_op:
        batch_op.drop_column("data_cotacao")
