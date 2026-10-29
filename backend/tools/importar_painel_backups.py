"""Importa o histórico do painel de backups antigo (backups.db do LXC 103) para o banco do Estoque TI.

Uso, com a API em execução e o arquivo copiado para data/:
    docker compose exec -T api python /app/tools/importar_painel_backups.py /data/backups-painel-antigo.db

Pode rodar mais de uma vez: execuções e alertas já importados são ignorados e apelidos
definidos pela tela nova não são sobrescritos.
"""
import argparse
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from backup_database import sqlite_path_from_url


def para_banco(valor: str | None) -> str | None:
    """'2026-10-09T13:27:43Z' -> '2026-10-09 13:27:43.000000' (formato DateTime do SQLAlchemy, UTC)."""
    if not valor:
        return None
    dt = datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.strftime("%Y-%m-%d %H:%M:%S.%f")


def importar(origem: sqlite3.Connection, destino: sqlite3.Connection) -> dict:
    origem.row_factory = sqlite3.Row
    totais = {}

    cur = destino.executemany(
        "INSERT OR IGNORE INTO backup_execucoes (recebido_em, fonte, maquina, tarefa, chave_execucao, job_id, inicio, "
        "fim, status, resultado_original, erros, avisos, processados, copiados, tamanho_bytes, duracao_s, destino, "
        "mensagem, payload_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)",
        [(para_banco(r["received_at"]), r["source"], r["machine"], r["task"], r["run_key"], r["job_id"],
          para_banco(r["started_at"]), para_banco(r["finished_at"]), r["status"], r["parsed_result"],
          r["errors"] or 0, r["warnings"] or 0, r["processed"] or 0, r["backed_up"] or 0, r["size_bytes"] or 0,
          r["duration_s"] or 0, r["destination"], r["message"])
         for r in origem.execute("SELECT * FROM reports ORDER BY id")],
    )
    totais["execucoes"] = cur.rowcount

    cur = destino.executemany(
        "INSERT OR IGNORE INTO backup_apelidos_maquina (maquina, apelido, atualizado_em) VALUES (?,?,?)",
        [(r["machine"], r["alias"], para_banco(r["updated_at"])) for r in origem.execute("SELECT * FROM aliases")],
    )
    totais["apelidos_maquina"] = cur.rowcount

    cur = destino.executemany(
        "INSERT OR IGNORE INTO backup_apelidos_cartao (fonte, maquina, tarefa, apelido, atualizado_em) VALUES (?,?,?,?,?)",
        [(r["source"], r["machine"], r["task"], r["alias"], para_banco(r["updated_at"]))
         for r in origem.execute("SELECT * FROM card_aliases")],
    )
    totais["apelidos_cartao"] = cur.rowcount

    cur = destino.executemany(
        "INSERT OR IGNORE INTO backup_agentes (maquina, fonte, ultimo_contato, versao, info) VALUES (?,?,?,?,?)",
        [(r["machine"], r["source"], para_banco(r["last_seen"]), r["version"], r["info"])
         for r in origem.execute("SELECT * FROM agents")],
    )
    totais["agentes"] = cur.rowcount

    # os alertas vêm junto para não repetir avisos de episódios que já tinham sido avisados
    cur = destino.executemany(
        "INSERT OR IGNORE INTO backup_alertas (criado_em, chave, nivel, maquina, tarefa, fonte, mensagem, "
        "reconhecido_em, resolvido_em) VALUES (?,?,?,?,?,?,?,?,?)",
        [(para_banco(r["created_at"]), r["alert_key"], r["level"], r["machine"], r["task"], r["source"], r["message"],
          para_banco(r["acked_at"]), para_banco(r["resolved_at"]))
         for r in origem.execute("SELECT * FROM alerts ORDER BY id")],
    )
    totais["alertas"] = cur.rowcount
    return totais


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa o backups.db do painel de backups antigo.")
    parser.add_argument("origem", help="Caminho do backups.db antigo")
    args = parser.parse_args()

    origem_path = Path(args.origem).resolve()
    destino_path = sqlite_path_from_url(os.getenv("DATABASE_URL", "sqlite:///./estoque.db"))
    if not origem_path.exists():
        raise FileNotFoundError(f"Banco antigo não encontrado: {origem_path}")

    with sqlite3.connect(f"file:{origem_path}?mode=ro", uri=True) as origem:
        with sqlite3.connect(destino_path, timeout=30) as destino:
            totais = importar(origem, destino)

    print("Importado: " + ", ".join(f"{nome}={total}" for nome, total in totais.items()))


if __name__ == "__main__":
    main()
