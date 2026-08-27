import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config


TEST_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////tmp/estoque_test.db")

if "test" not in TEST_DATABASE_URL.lower() and "/tmp/" not in TEST_DATABASE_URL.lower():
    raise RuntimeError("Os testes só podem usar um banco temporário identificado como teste.")

os.environ["DATABASE_URL"] = TEST_DATABASE_URL

backend_dir = Path(__file__).resolve().parents[1]
alembic_config = Config(str(backend_dir / "alembic.ini"))
alembic_config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
command.upgrade(alembic_config, "head")

from database import Base, engine  # noqa: E402
from main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture()
def client():
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def test_database_url():
    return TEST_DATABASE_URL
