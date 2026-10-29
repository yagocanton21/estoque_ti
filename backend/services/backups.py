"""Painel de backups: Cobian Reflector (servidores) + Duplicati (todas as máquinas).

Portado do painel que rodava sozinho no LXC 103 do Proxmox (kit-backup-monitor v2.5.0).

Fontes:
  - Cobian Reflector: o agente PowerShell dos servidores lê os logs e envia
    POST /backups/api/cobian (cabeçalho X-Auth-Token = token de envio).
  - Duplicati: relatório HTTP nativo de cada máquina
    POST /backups/api/duplicati/<token>/<MAQUINA> (o JSON do Duplicati não traz o nome da máquina).

Configuração (regras de prazo, tarefas esperadas, ignorados, apelidos padrão e tokens) fica em
BACKUP_CONFIG_PATH (padrão /data/backup_monitor.json), no mesmo formato do config.json do painel
antigo. BACKUP_INGEST_TOKEN / BACKUP_ADMIN_TOKEN, se definidos, sobrepõem os tokens do arquivo.
O arquivo é relido sozinho quando muda.
"""
import fnmatch
import hmac
import json
import logging
import os
import threading
import time
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session, aliased

from database import SessionLocal
from models.backup import (
    BackupAgente,
    BackupAlerta,
    BackupApelidoCartao,
    BackupApelidoMaquina,
    BackupEmAndamento,
    BackupExecucao,
    BackupPayload,
)
from services.backup_formatos import (
    agora_utc,
    bytes_legivel,
    dias_ignorados,
    do_banco,
    duplicati_texto,
    duracao_em_segundos,
    duracao_legivel,
    fuso_de,
    horas_ignoradas,
    inteiro,
    iso,
    ler_data,
    normalizar_maquina,
    normalizar_status,
    para_banco,
    primeira_chave,
    tamanho_em_bytes,
    tempo_atras,
)

VERSAO = "3.0.0"
PAYLOADS_GUARDADOS = 1000
ORDEM_ESTADOS = {"erro": 0, "atrasado": 1, "nunca": 2, "aviso": 3, "executando": 4, "ok": 5}
ESTADOS_PROBLEMA = ("erro", "atrasado", "nunca")

log = logging.getLogger("backups")

# ------------------------------------------------------------------ configuração

CONFIG_PADRAO = {
    "ingest_token": "",
    "admin_token": "",
    "timezone_offset": "-03:00",
    "late_hours_default": 26,
    "agent_late_minutes": 60,
    "alert_max_age_hours": 48,
    "duplicati_ui_url": "",
    "rules": [],
    "ignore": [],
    "tasks": [],
    "aliases": {},
}

_cfg: dict = {}
_cfg_caminho: str | None = None
_cfg_mtime: float | None = None
_cfg_conferido = 0.0
_cfg_fixa = False
_cfg_lock = threading.Lock()


def _token_forte(valor) -> str:
    valor = str(valor or "").strip()
    return valor if len(valor) >= 16 and "TROQUE" not in valor.upper() else ""


def _normalizar_config(bruta: dict) -> dict:
    cfg = {**CONFIG_PADRAO, **{k: v for k, v in bruta.items() if k in CONFIG_PADRAO or k == "token"}}
    if cfg.get("token") and not cfg.get("ingest_token"):   # compatibilidade com o kit v1
        cfg["ingest_token"] = cfg["token"]
    cfg.pop("token", None)
    cfg["ingest_token"] = _token_forte(os.getenv("BACKUP_INGEST_TOKEN") or cfg["ingest_token"])
    cfg["admin_token"] = _token_forte(os.getenv("BACKUP_ADMIN_TOKEN") or cfg["admin_token"]) or cfg["ingest_token"]
    for k in ("rules", "ignore", "tasks"):
        if not isinstance(cfg[k], list):
            raise ValueError(f'"{k}" deve ser uma lista')
    if not isinstance(cfg["aliases"], dict):
        raise ValueError('"aliases" deve ser um objeto {"MAQUINA": "Apelido"}')
    cfg["aliases"] = {normalizar_maquina(k): str(v).strip()[:60] for k, v in cfg["aliases"].items() if str(v).strip()}
    return cfg


def _ler_arquivo(caminho: str) -> dict:
    with open(caminho, encoding="utf-8-sig") as fh:      # aceita BOM (PowerShell/Notepad gravam com BOM)
        bruta = json.load(fh)
    if not isinstance(bruta, dict):
        raise ValueError("o arquivo deve conter um objeto JSON")
    return _normalizar_config(bruta)


def config() -> dict:
    """Config atual; relê o arquivo quando ele muda (confere no máximo a cada 5 s).
    Arquivo inválido é ignorado e a config anterior continua valendo."""
    global _cfg, _cfg_caminho, _cfg_mtime, _cfg_conferido
    with _cfg_lock:
        if _cfg_fixa:
            return _cfg
        caminho = os.getenv("BACKUP_CONFIG_PATH", "/data/backup_monitor.json")
        if _cfg and caminho == _cfg_caminho and time.monotonic() - _cfg_conferido < 5:
            return _cfg
        _cfg_conferido = time.monotonic()
        try:
            mtime = os.path.getmtime(caminho)
        except OSError:
            mtime = None
        if _cfg and caminho == _cfg_caminho and mtime == _cfg_mtime:
            return _cfg
        try:
            novo = _ler_arquivo(caminho) if mtime is not None else _normalizar_config({})
        except (OSError, ValueError) as exc:
            log.error("[backups] config %s ignorada, mantendo a anterior: %s", caminho, exc)
            if not _cfg:
                _cfg = _normalizar_config({})
            return _cfg
        _cfg, _cfg_caminho, _cfg_mtime = novo, caminho, mtime
        if mtime is not None:
            log.info("[backups] config carregada de %s: %d regra(s), %d tarefa(s)",
                     caminho, len(novo["rules"]), len(novo["tasks"]))
        return _cfg


def configurar(valores: dict | None) -> None:
    """Fixa a config (testes). None volta a ler o arquivo."""
    global _cfg, _cfg_fixa, _cfg_caminho
    with _cfg_lock:
        _cfg_fixa = valores is not None
        _cfg = _normalizar_config(valores) if valores is not None else {}
        _cfg_caminho = None


def fuso():
    return fuso_de(config()["timezone_offset"])


def ler(valor) -> datetime | None:
    return ler_data(valor, fuso())


def hora_local(dt: datetime | None) -> str:
    return dt.astimezone(fuso()).strftime("%d/%m %H:%M") if dt else "—"


def token_valido(recebido: str, *esperados: str) -> bool:
    return any(e and hmac.compare_digest(str(recebido or ""), str(e)) for e in esperados)


def papel_do_token(recebido: str) -> str | None:
    cfg = config()
    if token_valido(recebido, cfg["admin_token"]):
        return "admin"
    if token_valido(recebido, cfg["ingest_token"]):
        return "ingest"
    return None


# --------------------------------------------------------------- regras / prazo

def _casa(padrao, valor) -> bool:
    return fnmatch.fnmatchcase(str(valor).casefold(), str(padrao or "*").casefold())


def _regra_casa(regra: dict, fonte: str, maquina: str, tarefa: str) -> bool:
    return (_casa(regra.get("source", "*"), fonte) and _casa(regra.get("machine", "*"), maquina)
            and _casa(regra.get("task", "*"), tarefa))


def ignorado(fonte: str, maquina: str, tarefa: str) -> bool:
    return any(_regra_casa(r, fonte, maquina, tarefa) for r in config()["ignore"])


def tarefas_cadastradas() -> list[tuple]:
    return [(t.get("source", "cobian"), normalizar_maquina(t["machine"]), t["task"])
            for t in config()["tasks"] if t.get("machine") and t.get("task")]


def prazo_esperado(fonte: str, maquina: str, tarefa: str) -> tuple[float, str, frozenset]:
    """(prazo máximo em h sem backup bom, dica de agenda, dias da semana que não contam):
    tasks > rules (a primeira que casar vence) > padrão."""
    cfg = config()
    for t in cfg["tasks"]:
        if (t.get("source", "cobian") == fonte and normalizar_maquina(t.get("machine")) == maquina
                and t.get("task") == tarefa and "max_age_hours" in t):
            return float(t["max_age_hours"]), t.get("cron_hint", ""), dias_ignorados(t)
    for r in cfg["rules"]:
        if _regra_casa(r, fonte, maquina, tarefa):
            return (float(r.get("max_age_hours", cfg["late_hours_default"])), r.get("cron_hint", ""),
                    dias_ignorados(r))
    return float(cfg["late_hours_default"]), "", frozenset()


# ------------------------------------------------------------------ apelidos

def apelidos_maquina(db: Session) -> dict:
    """Arquivo de config = padrão; o que foi definido pela tela sobrepõe ('' remove)."""
    mapa = dict(config()["aliases"])
    mapa.update({a.maquina: a.apelido for a in db.query(BackupApelidoMaquina).all()})
    return {k: v for k, v in mapa.items() if v}


def apelidos_cartao(db: Session) -> dict:
    return {(a.fonte, a.maquina, a.tarefa): a.apelido for a in db.query(BackupApelidoCartao).all() if a.apelido}


def salvar_apelido(db: Session, maquina: str, apelido: str, fonte: str = "", tarefa: str = "") -> None:
    agora = para_banco(agora_utc())
    if tarefa:
        registro = db.get(BackupApelidoCartao, (fonte, maquina, tarefa))
        if registro is None:
            db.add(BackupApelidoCartao(fonte=fonte, maquina=maquina, tarefa=tarefa, apelido=apelido, atualizado_em=agora))
        else:
            registro.apelido, registro.atualizado_em = apelido, agora
    else:
        registro = db.get(BackupApelidoMaquina, maquina)
        if registro is None:
            db.add(BackupApelidoMaquina(maquina=maquina, apelido=apelido, atualizado_em=agora))
        else:
            registro.apelido, registro.atualizado_em = apelido, agora
    db.commit()


# ------------------------------------------------------------------- alertas

def criar_alerta(db: Session, nivel: str, fonte: str, maquina: str, tarefa: str, episodio: str, mensagem: str) -> bool:
    """Um alerta por episódio (chave única). Devolve True se o alerta é novo."""
    stmt = sqlite_insert(BackupAlerta).values(
        criado_em=para_banco(agora_utc()), chave=f"{fonte}|{maquina}|{tarefa}|{nivel}|{episodio}",
        nivel=nivel, maquina=maquina, tarefa=tarefa, fonte=fonte, mensagem=mensagem,
    ).on_conflict_do_nothing()
    return db.execute(stmt).rowcount == 1


def _abertos(db: Session):
    return db.query(BackupAlerta).filter(BackupAlerta.reconhecido_em.is_(None), BackupAlerta.resolvido_em.is_(None))


def resolver_alertas(db: Session, fonte: str, maquina: str, tarefa: str) -> int:
    """Fecha os alertas abertos da tarefa (o backup voltou a dar certo)."""
    return (_abertos(db)
            .filter(BackupAlerta.fonte == fonte, BackupAlerta.maquina == maquina, BackupAlerta.tarefa == tarefa)
            .update({BackupAlerta.resolvido_em: para_banco(agora_utc())}, synchronize_session=False))


def alertas_abertos(db: Session, limite: int = 100) -> list[dict]:
    alertas = _abertos(db).order_by(BackupAlerta.criado_em.desc(), BackupAlerta.id.desc()).limit(limite).all()
    return [{"id": a.id, "criado_em": iso(do_banco(a.criado_em)), "criado_em_local": hora_local(do_banco(a.criado_em)),
             "nivel": a.nivel, "fonte": a.fonte, "maquina": a.maquina, "tarefa": a.tarefa, "mensagem": a.mensagem}
            for a in alertas]


def reconhecer_alertas(db: Session, ids: list[int] | None) -> int:
    consulta = _abertos(db)
    if ids:
        consulta = consulta.filter(BackupAlerta.id.in_(ids))
    total = consulta.update({BackupAlerta.reconhecido_em: para_banco(agora_utc())}, synchronize_session=False)
    db.commit()
    return total


# ------------------------------------------------------------------ ingestão

def gravar_payload(db: Session, fonte: str, maquina: str | None, payload) -> int:
    texto = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False)
    registro = BackupPayload(recebido_em=para_banco(agora_utc()), fonte=fonte, maquina=maquina, payload=texto)
    db.add(registro)
    db.flush()
    db.query(BackupPayload).filter(BackupPayload.id <= registro.id - PAYLOADS_GUARDADOS).delete(synchronize_session=False)
    return registro.id


def _gravar_execucao(db: Session, rec: dict) -> dict | None:
    """Grava uma execução (sem duplicar pela chave_execucao). Devolve o registro se for NOVO."""
    rec.setdefault("recebido_em", para_banco(agora_utc()))
    stmt = sqlite_insert(BackupExecucao).values(**rec).on_conflict_do_nothing().returning(BackupExecucao.id)
    novo_id = db.execute(stmt).scalar_one_or_none()
    if novo_id is None:
        return None
    return {**rec, "id": novo_id}


def _apos_execucao_nova(db: Session, rec: dict) -> None:
    """Alerta de falha (uma vez por execução) ou recuperação."""
    fonte, maquina, tarefa = rec["fonte"], rec["maquina"], rec["tarefa"]
    if ignorado(fonte, maquina, tarefa):
        return
    if rec["status"] in ("erro", "aviso"):
        criar_alerta(db, rec["status"], fonte, maquina, tarefa, rec["chave_execucao"],
                     f"{fonte} · {maquina} · {tarefa}: {rec['status'].upper()} "
                     f"(erros={rec['erros']}, avisos={rec['avisos']})"
                     + (f" — {rec['mensagem'][:200]}" if rec.get("mensagem") else ""))
    elif rec["status"] == "ok":
        resolver_alertas(db, fonte, maquina, tarefa)


def ingerir_cobian(db: Session, payload: dict, ip_origem: str, payload_id: int) -> dict:
    """Payload do agente PowerShell: {agent, agent_version, heartbeat{}, runs[], running[]}."""
    maquina = normalizar_maquina(payload.get("agent") or payload.get("machine") or ip_origem)
    hb = payload.get("heartbeat") if isinstance(payload.get("heartbeat"), dict) else {}
    agora = agora_utc()
    conflito = None
    agente = db.get(BackupAgente, maquina)
    if agente:
        # dois servidores diferentes usando o MESMO nome (ex.: instalador copiado com -MachineName fixo)
        try:
            info_antiga = json.loads(agente.info or "{}")
        except json.JSONDecodeError:
            info_antiga = {}
        pasta_antiga = str(info_antiga.get("cobian_dir") or "").strip().lower()
        pasta_nova = str(hb.get("cobian_dir") or "").strip().lower()
        visto = do_banco(agente.ultimo_contato)
        if pasta_antiga and pasta_nova and pasta_antiga != pasta_nova and visto and agora - visto < timedelta(hours=6):
            conflito = (f"dois servidores diferentes estão usando o nome {maquina} (Cobian em "
                        f"'{info_antiga.get('cobian_dir')}' e em '{hb.get('cobian_dir')}'). "
                        f"Reinstale o agente no segundo servidor com o nome correto do computador.")
            hb = {**hb, "problem": conflito, "conflict": True}
    else:
        agente = BackupAgente(maquina=maquina)
        db.add(agente)
    agente.fonte = "cobian"
    agente.ultimo_contato = para_banco(agora)
    agente.versao = str(payload.get("agent_version") or "")
    agente.info = json.dumps(hb, ensure_ascii=False)

    db.query(BackupEmAndamento).filter(BackupEmAndamento.fonte == "cobian",
                                       BackupEmAndamento.maquina == maquina).delete(synchronize_session=False)
    rodando = payload.get("running") or []
    em_andamento = {}
    for it in ([rodando] if isinstance(rodando, dict) else rodando):
        if isinstance(it, dict) and it.get("task"):
            em_andamento[str(it["task"])] = para_banco(ler(it.get("started_at")))
    for tarefa, inicio in em_andamento.items():
        db.add(BackupEmAndamento(fonte="cobian", maquina=maquina, tarefa=tarefa, inicio=inicio, visto_em=para_banco(agora)))
    db.flush()
    if conflito:
        criar_alerta(db, "agente", "cobian", maquina, "*", f"conflito|{iso(agora)[:10]}", conflito)

    execucoes = payload.get("runs") or payload.get("cobian") or []
    if isinstance(execucoes, dict):
        execucoes = [execucoes]
    novos = []
    for it in execucoes:
        if not isinstance(it, dict):
            continue
        erros, avisos = inteiro(it.get("errors")), inteiro(it.get("warnings"))
        inicio, fim = ler(it.get("started_at")), ler(it.get("finished_at"))
        status = normalizar_status(it.get("status"), erros, avisos)
        if status == "desconhecido":
            continue  # o agente não inventa resultado; o painel também não
        duracao = inteiro(it.get("duration_s")) or (int((fim - inicio).total_seconds()) if inicio and fim else 0)
        rec = _gravar_execucao(db, {
            "fonte": "cobian", "maquina": maquina, "tarefa": str(it.get("task") or "?"),
            "chave_execucao": f"{iso(inicio) or ''}|{iso(fim) or ''}",
            "job_id": str(it["task_id"]) if it.get("task_id") else None,
            "inicio": para_banco(inicio), "fim": para_banco(fim),
            "status": status, "resultado_original": str(it.get("status") or ""),
            "erros": erros, "avisos": avisos,
            "processados": inteiro(it.get("processed_files")), "copiados": inteiro(it.get("backed_up_files")),
            "tamanho_bytes": tamanho_em_bytes(it.get("total_size_bytes") if it.get("total_size_bytes") is not None
                                              else it.get("total_size")),
            "duracao_s": duracao, "destino": it.get("destination") or None,
            "mensagem": str(it["message"])[:500] if it.get("message") else None, "payload_id": payload_id,
        })
        if rec:
            novos.append(rec)
    # Alerta/recuperação só para a execução MAIS RECENTE de cada tarefa e só se for recente:
    # carga de histórico (agente novo, janela grande) não pode disparar uma tempestade de alertas.
    recentes: dict[str, dict] = {}
    for rec in novos:
        atual = recentes.get(rec["tarefa"])
        if atual is None or (rec["fim"] or datetime.min) >= (atual["fim"] or datetime.min):
            recentes[rec["tarefa"]] = rec
    limite = para_banco(agora - timedelta(hours=float(config()["alert_max_age_hours"])))
    for rec in recentes.values():
        if rec["fim"] and rec["fim"] >= limite:
            _apos_execucao_nova(db, rec)
    db.commit()
    return {"machine": maquina, "received": len(execucoes), "new": len(novos),
            "stored": [{"task": r["tarefa"], "status": r["status"], "finished_at": iso(do_banco(r["fim"]))} for r in novos]}


def ingerir_duplicati(db: Session, payload, maquina_url: str, ip_origem: str, payload_id: int) -> dict:
    """Relatório nativo do Duplicati (JSON: Data/Extra/LogLines)."""
    if isinstance(payload, str):
        payload = duplicati_texto(payload)
    if not isinstance(payload, dict):
        return {"received": 0, "new": 0, "ignored": "payload não reconhecido"}
    data = payload.get("Data") if isinstance(payload.get("Data"), dict) else {}
    extra = payload.get("Extra") if isinstance(payload.get("Extra"), dict) else {}
    operacao = primeira_chave(extra, "OperationName") or primeira_chave(data, "MainOperation") or "Backup"
    if str(operacao).lower() != "backup":
        return {"received": 1, "new": 0, "ignored": f"operação {operacao}"}

    maquina = normalizar_maquina(maquina_url or primeira_chave(extra, "machine-name", "MachineName")
                                 or primeira_chave(data, "MachineName") or primeira_chave(payload, "MachineName")
                                 or primeira_chave(extra, "machine-id") or ip_origem)
    tarefa = str(primeira_chave(extra, "backup-name", "BackupName") or primeira_chave(data, "BackupName")
                 or primeira_chave(payload, "BackupName")
                 or (f"backup-id {primeira_chave(extra, 'backup-id')}" if primeira_chave(extra, "backup-id") else "Duplicati"))
    resultado = primeira_chave(data, "ParsedResult") or primeira_chave(payload, "ParsedResult")
    excecao = primeira_chave(payload, "Exception") or primeira_chave(data, "Exception")
    if not excecao and primeira_chave(data, "ClassName") and primeira_chave(data, "Message"):
        # backup abortado: o Duplicati manda a exceção inteira no lugar do resultado
        excecao = f"{primeira_chave(data, 'ClassName')}: {primeira_chave(data, 'Message')}"
    lista_erros = data.get("Errors") if isinstance(data.get("Errors"), list) else []
    lista_avisos = data.get("Warnings") if isinstance(data.get("Warnings"), list) else []
    erros = inteiro(primeira_chave(data, "ErrorsActualLength")) or len(lista_erros)
    avisos = inteiro(primeira_chave(data, "WarningsActualLength")) or len(lista_avisos)
    status = normalizar_status(resultado, erros, avisos)
    if excecao or status == "desconhecido":
        status = "erro"
        erros = max(erros, 1)
    inicio = ler(primeira_chave(data, "BeginTime") or primeira_chave(payload, "BeginTime"))
    fim = ler(primeira_chave(data, "EndTime") or primeira_chave(payload, "EndTime")) or agora_utc()
    duracao = duracao_em_segundos(primeira_chave(data, "Duration")) or (
        int((fim - inicio).total_seconds()) if inicio else 0)
    linhas = payload.get("LogLines") if isinstance(payload.get("LogLines"), list) else []
    if excecao:
        mensagem = str(excecao)
    elif lista_erros:
        mensagem = " | ".join(str(x) for x in lista_erros[:3])
    elif lista_avisos:
        mensagem = " | ".join(str(x) for x in lista_avisos[:3])
    elif status != "ok" and linhas:
        mensagem = " | ".join(str(x) for x in linhas[-3:])
    elif status != "ok":
        mensagem = "relatório do Duplicati sem resultado reconhecido (veja /backups/api/raw?source=duplicati)"
    else:
        mensagem = None
    rec = _gravar_execucao(db, {
        "fonte": "duplicati", "maquina": maquina, "tarefa": tarefa,
        "chave_execucao": f"{iso(inicio) or ''}|{iso(fim)}",
        "job_id": str(primeira_chave(extra, "backup-id") or ""),
        "inicio": para_banco(inicio), "fim": para_banco(fim),
        "status": status, "resultado_original": str(resultado or ("Exception" if excecao else "")),
        "erros": erros, "avisos": avisos,
        "processados": inteiro(primeira_chave(data, "ExaminedFiles")),
        "copiados": inteiro(primeira_chave(data, "AddedFiles")) + inteiro(primeira_chave(data, "ModifiedFiles")),
        "tamanho_bytes": tamanho_em_bytes(primeira_chave(data, "SizeOfAddedFiles", padrao=0))
        + tamanho_em_bytes(primeira_chave(data, "SizeOfModifiedFiles", padrao=0)),
        "duracao_s": duracao, "destino": None,
        "mensagem": mensagem[:500] if mensagem else None, "payload_id": payload_id,
    })
    if rec:
        _apos_execucao_nova(db, rec)
    db.commit()
    return {"machine": maquina, "task": tarefa, "status": status, "received": 1, "new": 1 if rec else 0}


# -------------------------------------------------------------------- estado

def linhas_status(db: Session) -> list[dict]:
    """Um cartão por (fonte, máquina, tarefa): tarefas cadastradas + tudo que já reportou."""
    E = BackupExecucao
    ordem = func.row_number().over(
        partition_by=(E.fonte, E.maquina, E.tarefa),
        order_by=(func.coalesce(E.fim, E.inicio, E.recebido_em).desc(), E.id.desc()),
    ).label("ordem")
    sub = select(E, ordem).subquery()
    ultima = aliased(E, sub)
    ultimas = {(r.fonte, r.maquina, r.tarefa): r for r in db.execute(select(ultima).where(sub.c.ordem == 1)).scalars()}

    desde = para_banco(agora_utc() - timedelta(days=31))
    quando = func.coalesce(E.fim, E.inicio)
    historico_bruto = db.query(E.fonte, E.maquina, E.tarefa, E.status, quando).filter(quando >= desde).all()
    rodando = {(r.fonte, r.maquina, r.tarefa): r for r in db.query(BackupEmAndamento).all()}
    maquinas, cartoes = apelidos_maquina(db), apelidos_cartao(db)

    tz = fuso()
    historicos: dict[tuple, dict] = {}
    for fonte, maquina, tarefa, status, momento in historico_bruto:
        if not momento:
            continue
        dia = do_banco(momento).astimezone(tz).date().isoformat()
        d = historicos.setdefault((fonte, maquina, tarefa), {}).setdefault(dia, {"ok": 0, "erro": 0, "aviso": 0})
        if status in d:
            d[status] += 1

    chaves = []
    for chave in [*tarefas_cadastradas(), *ultimas.keys(), *rodando.keys()]:
        if chave not in chaves and not ignorado(*chave):
            chaves.append(chave)
    linhas = [_montar_linha(chave, ultimas.get(chave), historicos.get(chave, {}), rodando.get(chave),
                            maquinas.get(chave[1], ""), cartoes.get(chave, "")) for chave in chaves]
    linhas.sort(key=lambda x: (ORDEM_ESTADOS.get(x["estado"], 9), x["maquina"], x["tarefa"]))
    return linhas


def _montar_linha(chave: tuple, r, historico: dict, rodando, apelido: str, apelido_cartao: str) -> dict:
    fonte, maquina, tarefa = chave
    cfg = config()
    prazo, dica, dias = prazo_esperado(fonte, maquina, tarefa)
    modelo_link = cfg["duplicati_ui_url"]
    base = {"fonte": fonte, "maquina": maquina, "apelido": apelido, "apelido_cartao": apelido_cartao,
            "tarefa": tarefa, "prazo_horas": prazo, "dica_agenda": dica, "dias_ignorados": sorted(dias),
            "link_duplicati": modelo_link.replace("{machine}", maquina.lower()) if fonte == "duplicati" and modelo_link else "",
            "historico": _historico_30_dias(historico)}
    agora = agora_utc()
    atraso_agente = timedelta(minutes=float(cfg["agent_late_minutes"]))
    rodando_recente = rodando is not None and agora - do_banco(rodando.visto_em) < atraso_agente
    if r is None:
        return {**base, "estado": "executando" if rodando_recente else "nunca", "ultima_execucao": None,
                "ultima_execucao_legivel": "nunca", "ultima_execucao_local": "—", "idade_horas": None,
                "erros": 0, "avisos": 0, "processados": 0, "copiados": 0, "tamanho": "—", "duracao": "—",
                "destino": "", "mensagem": "nenhum relatório recebido ainda"}
    fim = do_banco(r.fim) or do_banco(r.inicio) or do_banco(r.recebido_em)
    # dias em skip_days não contam (ex.: sábado e domingo)
    idade = (agora - fim).total_seconds() / 3600 - horas_ignoradas(fim, agora, dias, fuso()) if fim else None
    estado = r.status
    if estado in ("ok", "aviso") and idade is not None and idade > prazo:
        estado = "atrasado"
    if rodando_recente:
        inicio_rodando = do_banco(rodando.inicio)
        if inicio_rodando is None or fim is None or inicio_rodando > fim:
            estado = "executando"
    return {**base, "estado": estado, "ultima_execucao": iso(fim), "ultima_execucao_legivel": tempo_atras(fim),
            "ultima_execucao_local": hora_local(fim), "idade_horas": round(idade, 1) if idade is not None else None,
            "erros": r.erros, "avisos": r.avisos, "processados": r.processados, "copiados": r.copiados,
            "tamanho": bytes_legivel(r.tamanho_bytes), "duracao": duracao_legivel(r.duracao_s),
            "destino": r.destino or "", "mensagem": r.mensagem or ""}


def _historico_30_dias(historico: dict) -> list[dict]:
    dias, hoje = [], agora_utc().astimezone(fuso()).date()
    for i in range(29, -1, -1):
        d = (hoje - timedelta(days=i)).isoformat()
        h = historico.get(d)
        estado = "sem" if not h else ("erro" if h["erro"] else ("aviso" if h["aviso"] else "ok"))
        dias.append({"data": d, "estado": estado, "execucoes": sum(h.values()) if h else 0})
    return dias


def linhas_agentes(db: Session) -> list[dict]:
    atraso = timedelta(minutes=float(config()["agent_late_minutes"]))
    maquinas = apelidos_maquina(db)
    saida = []
    for a in db.query(BackupAgente).order_by(BackupAgente.maquina).all():
        if ignorado(a.fonte, a.maquina, "*"):
            continue
        visto = do_banco(a.ultimo_contato)
        try:
            info = json.loads(a.info or "{}")
        except json.JSONDecodeError:
            info = {}
        servico = str(info.get("cobian_service") or "")
        if visto is None or agora_utc() - visto > atraso:
            estado = "parado"
        elif servico and servico.lower() != "running":
            estado = "servico"
        elif info.get("conflict"):
            estado = "conflito"
        elif info.get("problem"):
            estado = "aviso"
        else:
            estado = "ok"
        saida.append({"maquina": a.maquina, "apelido": maquinas.get(a.maquina, ""), "fonte": a.fonte,
                      "versao": a.versao or "", "ultimo_contato": iso(visto), "ultimo_contato_legivel": tempo_atras(visto),
                      "estado": estado, "servico_cobian": servico, "problema": info.get("problem") or "",
                      "logs_lidos": info.get("logs_read"), "idioma": info.get("language")})
    return saida


def montar_painel(db: Session) -> dict:
    linhas, agentes = linhas_status(db), linhas_agentes(db)
    contagem = {k: 0 for k in ORDEM_ESTADOS}
    for r in linhas:
        contagem[r["estado"]] = contagem.get(r["estado"], 0) + 1
    problemas = (sum(1 for r in linhas if r["estado"] in ESTADOS_PROBLEMA)
                 + sum(1 for a in agentes if a["estado"] != "ok"))
    return {"versao": VERSAO, "atualizado_em": iso(agora_utc()), "contagem": contagem, "problemas": problemas,
            "tarefas": linhas, "agentes": agentes, "alertas": alertas_abertos(db)}


def montar_resumo(db: Session) -> dict:
    """Resumo compacto (Visão Geral e outros painéis): contagens + só o que tem problema."""
    linhas, agentes = linhas_status(db), linhas_agentes(db)
    contagem = {k: 0 for k in ORDEM_ESTADOS}
    for r in linhas:
        contagem[r["estado"]] = contagem.get(r["estado"], 0) + 1
    itens = []
    for r in linhas:
        if r["estado"] in ("erro", "atrasado", "nunca", "aviso"):
            itens.append({"tipo": "backup", "estado": r["estado"], "fonte": r["fonte"], "maquina": r["maquina"],
                          "apelido": r["apelido"], "tarefa": r["tarefa"], "apelido_cartao": r["apelido_cartao"],
                          "ultima_execucao_legivel": r["ultima_execucao_legivel"], "ultima_execucao": r["ultima_execucao"],
                          "erros": r["erros"], "mensagem": (r["mensagem"] or "")[:300], "prazo_horas": r["prazo_horas"]})
    for a in agentes:
        if a["estado"] != "ok":
            itens.append({"tipo": "agente", "estado": a["estado"], "fonte": a["fonte"], "maquina": a["maquina"],
                          "apelido": a["apelido"], "tarefa": "", "apelido_cartao": "",
                          "ultima_execucao_legivel": a["ultimo_contato_legivel"], "ultima_execucao": a["ultimo_contato"],
                          "erros": 0, "mensagem": (a["problema"] or "")[:300], "prazo_horas": None})
    problemas = sum(1 for i in itens if i["tipo"] == "agente" or i["estado"] in ESTADOS_PROBLEMA)
    return {"versao": VERSAO, "atualizado_em": iso(agora_utc()), "total": len(linhas), "agentes": len(agentes),
            "contagem": contagem, "problemas": problemas, "itens": itens[:60],
            "alertas_abertos": _abertos(db).count()}


def resumo_formato_antigo(resumo: dict) -> dict:
    """Mesmo JSON do /api/resumo do painel antigo (consumido pelo painel-uso-claude)."""
    return {"ok": True, "version": resumo["versao"], "time": resumo["atualizado_em"], "total": resumo["total"],
            "counts": resumo["contagem"], "problems": resumo["problemas"], "open_alerts": resumo["alertas_abertos"],
            "items": [{"kind": i["tipo"], "state": i["estado"], "source": i["fonte"], "machine": i["maquina"],
                       "alias": i["apelido"], "task": i["tarefa"], "card_alias": i["apelido_cartao"],
                       "last_run_human": i["ultima_execucao_legivel"], "last_run": i["ultima_execucao"],
                       "errors": i["erros"], "message": i["mensagem"], "max_age_hours": i["prazo_horas"]}
                      for i in resumo["itens"]]}


# ---------------------------------------------------------------- verificação

def verificar(db: Session) -> list[dict]:
    """Atrasos, tarefas que nunca reportaram e agentes parados -> alertas (1 por episódio)."""
    novas = []
    for linha in linhas_status(db):
        if linha["estado"] == "nunca":
            episodio, msg = "nunca", "nenhum relatório recebido"
        elif linha["estado"] == "atrasado":
            episodio = linha["ultima_execucao"] or "?"
            msg = f"sem backup bom há {linha['idade_horas']} h (limite {linha['prazo_horas']:g} h)"
        else:
            continue
        completa = f"{linha['fonte']} · {linha['maquina']} · {linha['tarefa']}: {msg}"
        if criar_alerta(db, "atraso", linha["fonte"], linha["maquina"], linha["tarefa"], episodio, completa):
            novas.append({"nivel": "atraso", "maquina": linha["maquina"], "tarefa": linha["tarefa"], "mensagem": completa})
    for a in linhas_agentes(db):
        if a["estado"] == "ok":              # agente voltou ao normal: fecha os alertas de agente dele
            (_abertos(db)
             .filter(BackupAlerta.nivel == "agente", BackupAlerta.fonte == a["fonte"], BackupAlerta.maquina == a["maquina"])
             .update({BackupAlerta.resolvido_em: para_banco(agora_utc())}, synchronize_session=False))
        if a["estado"] in ("parado", "servico"):
            msg = (f"agente {a['fonte']} em {a['maquina']} sem comunicar desde {a['ultimo_contato_legivel']}"
                   if a["estado"] == "parado" else
                   f"serviço do Cobian em {a['maquina']} está '{a['servico_cobian']}'")
            if criar_alerta(db, "agente", a["fonte"], a["maquina"], "*", f"{a['estado']}|{(a['ultimo_contato'] or '')[:10]}", msg):
                novas.append({"nivel": "agente", "maquina": a["maquina"], "tarefa": "*", "mensagem": msg})
    db.commit()
    return novas


_parar = threading.Event()
_thread: threading.Thread | None = None


def _laco_verificacao(intervalo_s: float) -> None:
    if _parar.wait(60):          # dá tempo da API subir antes da primeira verificação
        return
    while True:
        try:
            with SessionLocal() as db:
                novas = verificar(db)
            if novas:
                log.warning("[backups] verificação: %d alerta(s) novo(s)", len(novas))
        except Exception:  # noqa: BLE001 - o laço não pode morrer por um erro pontual
            log.exception("[backups] falha na verificação periódica")
        if _parar.wait(intervalo_s):
            return


def iniciar_verificacao_periodica() -> None:
    """Substitui o timer systemd do painel antigo (a cada BACKUP_CHECK_MINUTES, padrão 15; 0 desliga)."""
    global _thread
    try:
        minutos = float(os.getenv("BACKUP_CHECK_MINUTES", "15"))
    except ValueError:
        minutos = 15.0
    if minutos <= 0 or (_thread and _thread.is_alive()):
        return
    _parar.clear()
    _thread = threading.Thread(target=_laco_verificacao, args=(minutos * 60,), name="verificacao-backups", daemon=True)
    _thread.start()


def parar_verificacao_periodica() -> None:
    _parar.set()
