"""Copia um SQLite legado e o marca com a migração inicial do Alembic."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


INITIAL_REVISION = "20260827_0001"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    return parser.parse_args()


def migrate(source_path: Path, destination_path: Path) -> None:
    if not source_path.is_file():
        raise SystemExit(f"Banco de origem não encontrado: {source_path}")

    destination_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(source_path) as source:
        if source.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise SystemExit("O banco de origem falhou no teste de integridade.")

        with sqlite3.connect(destination_path) as destination:
            source.backup(destination)
            destination.execute(
                "CREATE TABLE IF NOT EXISTS alembic_version "
                "(version_num VARCHAR(32) NOT NULL)"
            )
            revisions = destination.execute(
                "SELECT version_num FROM alembic_version"
            ).fetchall()
            if revisions and revisions != [(INITIAL_REVISION,)]:
                raise SystemExit(f"Versão Alembic inesperada: {revisions!r}")
            if not revisions:
                destination.execute(
                    "INSERT INTO alembic_version(version_num) VALUES (?)",
                    (INITIAL_REVISION,),
                )
            destination.commit()

            integrity = destination.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity != "ok":
                raise SystemExit("A cópia falhou no teste de integridade.")

            items = destination.execute("SELECT COUNT(*) FROM itens").fetchone()[0]
            movements = destination.execute(
                "SELECT COUNT(*) FROM movimentacoes"
            ).fetchone()[0]

    print(f"integrity={integrity}")
    print(f"items={items}")
    print(f"movements={movements}")
    print(f"revision={INITIAL_REVISION}")


if __name__ == "__main__":
    arguments = parse_args()
    migrate(arguments.source, arguments.destination)
