from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from database import get_db
from models.equipamento import Equipamento, TipoEquipamento
from schemas.equipamento import (
    TipoEquipamentoCreate,
    TipoEquipamentoResponse,
    EquipamentoCreate,
    EquipamentoUpdate,
    EquipamentoResponse,
    EquipamentoPaginadoResponse,
)

router = APIRouter(prefix="/equipamentos", tags=["Equipamentos de Rede"])


def _limpar(valor: Optional[str]) -> Optional[str]:
    valor = (valor or "").strip()
    return valor or None


def _tipo_ou_404(db: Session, tipo_id: int) -> TipoEquipamento:
    tipo = db.query(TipoEquipamento).filter(TipoEquipamento.id == tipo_id).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de equipamento não encontrado.")
    return tipo


@router.get("/tipos", response_model=list[TipoEquipamentoResponse])
def listar_tipos(db: Session = Depends(get_db)):
    contagens = dict(
        db.query(Equipamento.tipo_id, func.count(Equipamento.id))
        .filter(Equipamento.ativo.is_(True))
        .group_by(Equipamento.tipo_id)
        .all()
    )
    tipos = db.query(TipoEquipamento).order_by(func.lower(TipoEquipamento.nome).asc()).all()
    return [{"id": t.id, "nome": t.nome, "total": contagens.get(t.id, 0)} for t in tipos]


@router.post("/tipos", response_model=TipoEquipamentoResponse, status_code=201)
def criar_tipo(dados: TipoEquipamentoCreate, db: Session = Depends(get_db)):
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="O nome do tipo é obrigatório.")
    existe = db.query(TipoEquipamento).filter(func.lower(TipoEquipamento.nome) == nome.lower()).first()
    if existe:
        raise HTTPException(status_code=400, detail=f"Já existe um tipo chamado '{existe.nome}'.")
    tipo = TipoEquipamento(nome=nome)
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return {"id": tipo.id, "nome": tipo.nome, "total": 0}


@router.put("/tipos/{tipo_id}", response_model=TipoEquipamentoResponse)
def renomear_tipo(tipo_id: int, dados: TipoEquipamentoCreate, db: Session = Depends(get_db)):
    tipo = _tipo_ou_404(db, tipo_id)
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="O nome do tipo é obrigatório.")
    existe = (
        db.query(TipoEquipamento)
        .filter(func.lower(TipoEquipamento.nome) == nome.lower(), TipoEquipamento.id != tipo_id)
        .first()
    )
    if existe:
        raise HTTPException(status_code=400, detail=f"Já existe um tipo chamado '{existe.nome}'.")
    tipo.nome = nome
    db.commit()
    db.refresh(tipo)
    total = db.query(Equipamento).filter(Equipamento.tipo_id == tipo.id, Equipamento.ativo.is_(True)).count()
    return {"id": tipo.id, "nome": tipo.nome, "total": total}


@router.delete("/tipos/{tipo_id}", status_code=204)
def excluir_tipo(tipo_id: int, db: Session = Depends(get_db)):
    tipo = _tipo_ou_404(db, tipo_id)
    if db.query(Equipamento).filter(Equipamento.tipo_id == tipo_id).count() > 0:
        raise HTTPException(
            status_code=409,
            detail="Este tipo possui equipamentos cadastrados. Exclua-os antes de remover o tipo.",
        )
    db.delete(tipo)
    db.commit()


@router.get("/", response_model=EquipamentoPaginadoResponse)
def listar_equipamentos(
    tipo_id: int = Query(...),
    q: Optional[str] = Query(None),
    local: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Equipamento).filter(Equipamento.tipo_id == tipo_id, Equipamento.ativo.is_(True))

    if local and local.strip():
        query = query.filter(Equipamento.local == local.strip())

    if q and q.strip():
        termo = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Equipamento.nome).like(termo),
                func.lower(Equipamento.ip).like(termo),
                func.lower(Equipamento.mac).like(termo),
                func.lower(Equipamento.modelo).like(termo),
                func.lower(Equipamento.local).like(termo),
                func.lower(Equipamento.observacoes).like(termo),
            )
        )

    total = query.count()
    items = (
        query.order_by(func.lower(Equipamento.nome).asc(), Equipamento.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "items": items,
        "total": total,
        "pagina": (skip // limit) + 1,
        "total_paginas": max(1, (total + limit - 1) // limit) if total > 0 else 1,
    }


@router.get("/locais", response_model=list[str])
def listar_locais(tipo_id: int = Query(...), db: Session = Depends(get_db)):
    rows = (
        db.query(Equipamento.local)
        .filter(
            Equipamento.tipo_id == tipo_id,
            Equipamento.ativo.is_(True),
            Equipamento.local.isnot(None),
            Equipamento.local != "",
        )
        .distinct()
        .order_by(Equipamento.local.asc())
        .all()
    )
    return [r[0] for r in rows if r[0]]


@router.post("/", response_model=EquipamentoResponse, status_code=201)
def criar_equipamento(dados: EquipamentoCreate, db: Session = Depends(get_db)):
    _tipo_ou_404(db, dados.tipo_id)
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="O nome é obrigatório.")
    eq = Equipamento(
        tipo_id=dados.tipo_id,
        nome=nome,
        ip=_limpar(dados.ip),
        mac=_limpar(dados.mac),
        modelo=_limpar(dados.modelo),
        local=_limpar(dados.local),
        observacoes=_limpar(dados.observacoes),
        ativo=dados.ativo,
    )
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return eq


@router.put("/{equipamento_id}", response_model=EquipamentoResponse)
def atualizar_equipamento(equipamento_id: int, dados: EquipamentoUpdate, db: Session = Depends(get_db)):
    eq = db.query(Equipamento).filter(Equipamento.id == equipamento_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    _tipo_ou_404(db, dados.tipo_id)
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="O nome é obrigatório.")
    eq.tipo_id = dados.tipo_id
    eq.nome = nome
    eq.ip = _limpar(dados.ip)
    eq.mac = _limpar(dados.mac)
    eq.modelo = _limpar(dados.modelo)
    eq.local = _limpar(dados.local)
    eq.observacoes = _limpar(dados.observacoes)
    eq.ativo = dados.ativo
    db.commit()
    db.refresh(eq)
    return eq


@router.delete("/{equipamento_id}", status_code=204)
def excluir_equipamento(equipamento_id: int, db: Session = Depends(get_db)):
    eq = db.query(Equipamento).filter(Equipamento.id == equipamento_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    db.delete(eq)
    db.commit()
