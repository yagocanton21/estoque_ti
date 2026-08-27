import argparse
import os
import sqlite3
from pathlib import Path


def sqlite_path_from_url(database_url: str) -> Path:
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        raise RuntimeError("O backup atual suporta somente bancos SQLite.")
    return Path(database_url.removeprefix(prefix)).resolve()


def main() -> None:
    parser = argparse.ArgumentParser(description="Cria um backup consistente do banco SQLite.")
    parser.add_argument("--output", required=True, help="Caminho do arquivo de backup")
    args = parser.parse_args()

    source_path = sqlite_path_from_url(os.getenv("DATABASE_URL", "sqlite:///./estoque.db"))
    output_path = Path(args.output).resolve()

    if not source_path.exists():
        raise FileNotFoundError(f"Banco de origem não encontrado: {source_path}")
    if output_path.exists():
        raise FileExistsError(f"O backup já existe e não será sobrescrito: {output_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(source_path, timeout=30) as source:
        with sqlite3.connect(output_path) as destination:
            source.backup(destination)
            integrity = destination.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity != "ok":
                raise RuntimeError(f"Falha na verificação de integridade: {integrity}")

            counts = {}
            for table in ("itens", "movimentacoes", "lista_compras", "emprestimos"):
                counts[table] = destination.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]

    print(f"Backup criado: {output_path}")
    print(f"Integridade: {integrity}")
    print("Registros: " + ", ".join(f"{table}={count}" for table, count in counts.items()))


if __name__ == "__main__":
    main()
