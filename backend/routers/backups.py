import json
import logging
import urllib.parse
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.backup import BackupExecucao, BackupPayload
from services import backups
from services.backup_formatos import agora_utc, do_banco, iso, limpar_apelido, normalizar_maquina, para_banco

router = APIRouter(prefix="/backups", tags=["Backups"])
log = logging.getLogger("backups")

TAMANHO_MAXIMO = 32 * 1024 * 1024


class ApelidoRequest(BaseModel):
    maquina: str
    apelido: str = ""
    fonte: Optional[str] = None
    tarefa: Optional[str] = None


class ReconhecerRequest(BaseModel):
    ids: Optional[list[int]] = None


def _ip(request: Request) -> str:
    # atrás do nginx o cliente direto é o próprio container do frontend
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "")


async def _corpo(request: Request) -> bytes:
    corpo = await request.body()
    if not corpo:
        raise HTTPException(status_code=400, detail="Corpo ausente.")
    if len(corpo) > TAMANHO_MAXIMO:
        raise HTTPException(status_code=413, detail="Corpo maior que 32 MB.")
    return corpo


# ---------------------------------------------------------------------------
# Rotas usadas pelos agentes (mesmos caminhos do painel antigo, sob /backups).
# O agente Cobian e o Duplicati só precisam apontar para http://<servidor>/api/backups
# ---------------------------------------------------------------------------

@router.get("/api/health")
def saude():
    return {"ok": True, "version": backups.VERSAO, "time": iso(agora_utc()),
            "ingest_configured": bool(backups.config()["ingest_token"])}


@router.get("/api/whoami")
def quem_sou(x_auth_token: str = Header("")):
    """Valida o token sem gravar nada (usado pelo instalador do agente)."""
    papel = backups.papel_do_token(x_auth_token)
    if not papel:
        raise HTTPException(status_code=401, detail="Token inválido (X-Auth-Token).")
    return {"ok": True, "role": papel, "version": backups.VERSAO}


def _exigir_envio_configurado():
    if not backups.config()["ingest_token"]:
        raise HTTPException(
            status_code=503,
            detail="Painel de backups sem token de envio. Defina BACKUP_INGEST_TOKEN ou ingest_token no arquivo de config.",
        )


@router.post("/api/cobian")
@router.post("/api/report", include_in_schema=False)
async def receber_cobian(request: Request, x_auth_token: str = Header(""), db: Session = Depends(get_db)):
    _exigir_envio_configurado()
    if not backups.papel_do_token(x_auth_token):
        raise HTTPException(status_code=401, detail="Token inválido (X-Auth-Token).")
    corpo = await _corpo(request)
    try:
        payload = json.loads(corpo.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        payload = None
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Corpo JSON ausente ou inválido.")
    payload_id = backups.gravar_payload(db, "cobian", normalizar_maquina(payload.get("agent")), payload)
    res = backups.ingerir_cobian(db, payload, _ip(request), payload_id)
    log.info("[backups] cobian %s: %s execução(ões), %s nova(s)", res["machine"], res["received"], res["new"])
    return {"ok": True, **res}


@router.post("/api/duplicati/{token}/{maquina}")
@router.post("/api/duplicati/{token}", include_in_schema=False)
async def receber_duplicati(request: Request, token: str, maquina: str = "", db: Session = Depends(get_db)):
    _exigir_envio_configurado()
    cfg = backups.config()
    if not backups.token_valido(token, cfg["ingest_token"], cfg["admin_token"]):
        raise HTTPException(status_code=401, detail="Token inválido no caminho.")
    corpo = await _corpo(request)
    texto = corpo.decode("utf-8-sig", errors="replace")
    if "x-www-form-urlencoded" in (request.headers.get("content-type") or "").lower():
        texto = (urllib.parse.parse_qs(texto).get("message") or [texto])[0]
    try:
        payload = json.loads(texto)
    except json.JSONDecodeError:
        payload = texto
    payload_id = backups.gravar_payload(db, "duplicati", normalizar_maquina(maquina) if maquina else None, payload)
    res = backups.ingerir_duplicati(db, payload, maquina, _ip(request), payload_id)
    log.info("[backups] duplicati %s · %s: %s (novo=%s)", res.get("machine", "?"), res.get("task", "?"),
             res.get("status", res.get("ignored", "?")), res.get("new"))
    return {"ok": True, **res}


@router.get("/api/resumo")
def resumo_formato_antigo(db: Session = Depends(get_db)):
    """Mesmo formato do /api/resumo do painel antigo (painel-uso-claude)."""
    return backups.resumo_formato_antigo(backups.montar_resumo(db))


@router.get("/api/raw")
def payloads_crus(
    source: Optional[str] = Query(None),
    limit: int = Query(5, ge=1, le=100),
    x_auth_token: str = Header(""),
    db: Session = Depends(get_db),
):
    """Últimos corpos recebidos, para calibrar o parser. Exige o token de administração."""
    if backups.papel_do_token(x_auth_token) != "admin":
        raise HTTPException(status_code=401, detail="Token inválido (X-Auth-Token = admin_token).")
    consulta = db.query(BackupPayload)
    if source:
        consulta = consulta.filter(BackupPayload.fonte == source)
    saida = []
    for p in consulta.order_by(BackupPayload.id.desc()).limit(limit).all():
        item = {"id": p.id, "recebido_em": iso(do_banco(p.recebido_em)), "fonte": p.fonte, "maquina": p.maquina}
        try:
            item["payload"] = json.loads(p.payload)
        except json.JSONDecodeError:
            item["payload"], item["observacao"] = p.payload, "corpo não era JSON; guardado como texto"
        saida.append(item)
    return {"ok": True, "payloads": saida}


# ---------------------------------------------------------------------------
# Rotas da tela
# ---------------------------------------------------------------------------

@router.get("/painel")
def painel(db: Session = Depends(get_db)):
    return backups.montar_painel(db)


@router.get("/resumo")
def resumo(db: Session = Depends(get_db)):
    return backups.montar_resumo(db)


@router.get("/historico")
def historico(
    dias: int = Query(7, ge=1, le=400),
    fonte: Optional[str] = Query(None),
    maquina: Optional[str] = Query(None),
    tarefa: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    E = BackupExecucao
    quando = func.coalesce(E.fim, E.recebido_em)
    consulta = db.query(E).filter(quando >= para_banco(agora_utc() - timedelta(days=dias)))
    if fonte:
        consulta = consulta.filter(E.fonte == fonte)
    if maquina:
        consulta = consulta.filter(E.maquina == normalizar_maquina(maquina))
    if tarefa:
        consulta = consulta.filter(E.tarefa == tarefa)
    execucoes = consulta.order_by(quando.desc(), E.id.desc()).limit(1000).all()
    return [
        {"id": e.id, "fonte": e.fonte, "maquina": e.maquina, "tarefa": e.tarefa, "status": e.status,
         "inicio": iso(do_banco(e.inicio)), "fim": iso(do_banco(e.fim)), "erros": e.erros, "avisos": e.avisos,
         "processados": e.processados, "copiados": e.copiados, "tamanho_bytes": e.tamanho_bytes,
         "duracao_s": e.duracao_s, "mensagem": e.mensagem}
        for e in execucoes
    ]


@router.post("/apelido")
def definir_apelido(dados: ApelidoRequest, db: Session = Depends(get_db)):
    maquina = normalizar_maquina(dados.maquina)[:100] if dados.maquina.strip() else ""
    if not maquina:
        raise HTTPException(status_code=400, detail="Informe a máquina.")
    apelido = limpar_apelido(dados.apelido)
    tarefa = (dados.tarefa or "").strip()[:200]
    fonte = (dados.fonte or "").strip().lower()
    if tarefa and fonte not in ("cobian", "duplicati"):
        raise HTTPException(status_code=400, detail='"fonte" deve ser "cobian" ou "duplicati" quando a tarefa é informada.')
    backups.salvar_apelido(db, maquina, apelido, fonte if tarefa else "", tarefa)
    return {"maquina": maquina, "fonte": fonte if tarefa else None, "tarefa": tarefa or None, "apelido": apelido}


@router.post("/alertas/reconhecer")
def reconhecer_alertas(dados: ReconhecerRequest, db: Session = Depends(get_db)):
    return {"reconhecidos": backups.reconhecer_alertas(db, dados.ids)}


@router.post("/verificar")
def verificar_agora(db: Session = Depends(get_db)):
    novas = backups.verificar(db)
    return {"criados": len(novas), "alertas": novas}
