import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config


import tempfile

default_db_path = Path(tempfile.gettempdir()) / "estoque_test.db"
TEST_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{default_db_path.as_posix()}")

if "test" not in TEST_DATABASE_URL.lower() and "/tmp/" not in TEST_DATABASE_URL.lower():
    raise RuntimeError("Os testes só podem usar um banco temporário identificado como teste.")

os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["BACKUP_CHECK_MINUTES"] = "0"  # sem a verificação periódica do painel de backups nos testes
os.environ["AUTH_USERNAME"] = "admin_teste"
os.environ["AUTH_PASSWORD"] = "senha_teste_123"

backend_dir = Path(__file__).resolve().parents[1]
alembic_config = Config(str(backend_dir / "alembic.ini"))
alembic_config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
command.upgrade(alembic_config, "head")

from database import Base, engine  # noqa: E402
from main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from services.auth import criar_token_acesso  # noqa: E402


@pytest.fixture()
def client():
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())

    token, _ = criar_token_acesso("admin_teste")
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as test_client:
        yield test_client


@pytest.fixture()
def unauthenticated_client():
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def test_database_url():
    return TEST_DATABASE_URL
