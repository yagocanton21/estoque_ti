from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from database import get_db
from models.maquina import Maquina
from schemas.maquina import (
    MaquinaCreate,
    MaquinaUpdate,
    MaquinaResponse,
    MaquinaPaginadaResponse,
    EstatisticasIpsResponse,
)
from services.planilha_ips import (
    parse_planilha_bytes,
    processar_linhas_importadas,
    gerar_planilha_exportacao,
    simplificar_nome_office,
)

router = APIRouter(prefix="/relacao-ips", tags=["Relação de IPs / Máquinas"])


@router.get("/", response_model=MaquinaPaginadaResponse)
def listar_maquinas(
    q: Optional[str] = Query(None, description="Busca por máquina, IP, usuário, AD ou setor"),
    setor: Optional[str] = Query(None, description="Filtrar por setor"),
    sistema_operacional: Optional[str] = Query(None, description="Filtrar por sistema operacional"),
    office: Optional[str] = Query(None, description="Filtrar por versão do Office"),
    antivirus: Optional[str] = Query(None, description="Filtrar por antivírus"),
    apenas_ativos: bool = Query(True, description="Filtrar apenas ativos"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Maquina)

    if apenas_ativos:
        query = query.filter(Maquina.ativo.is_(True))

    if setor and setor.strip():
        query = query.filter(Maquina.setor == setor.strip())

    if sistema_operacional and sistema_operacional.strip():
        query = query.filter(Maquina.sistema_operacional == sistema_operacional.strip())

    if office and office.strip():
        query = query.filter(Maquina.office == office.strip())

    if antivirus and antivirus.strip():
        query = query.filter(Maquina.antivirus == antivirus.strip())

    if q and q.strip():
        termo = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Maquina.nome_maquina).like(termo),
                func.lower(Maquina.ip).like(termo),
                func.lower(Maquina.usuario).like(termo),
                func.lower(Maquina.usuario_ad).like(termo),
                func.lower(Maquina.setor).like(termo),
                func.lower(Maquina.sistema_operacional).like(termo),
                func.lower(Maquina.office).like(termo),
                func.lower(Maquina.antivirus).like(termo),
                func.lower(Maquina.observacoes).like(termo),
            )
        )

    total = query.count()
    items = (
        query.order_by(
            func.lower(Maquina.nome_maquina).asc(),
            Maquina.id.asc(),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    pagina_atual = (skip // limit) + 1
    total_paginas = max(1, (total + limit - 1) // limit) if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "pagina": pagina_atual,
        "total_paginas": total_paginas,
    }


@router.get("/filtros")
def listar_opcoes_filtros(db: Session = Depends(get_db)):
    def valores(coluna):
        rows = (
            db.query(coluna)
            .filter(Maquina.ativo.is_(True), coluna.isnot(None), coluna != "")
            .distinct()
            .order_by(coluna.asc())
            .all()
        )
        return [r[0] for r in rows if r[0]]

    return {
        "setores": valores(Maquina.setor),
        "sistemas_operacionais": valores(Maquina.sistema_operacional),
        "offices": valores(Maquina.office),
        "antivirus": valores(Maquina.antivirus),
    }


@router.get("/setores", response_model=list[str])
def listar_setores(db: Session = Depends(get_db)):
    setores = (
        db.query(Maquina.setor)
        .filter(Maquina.setor.isnot(None), Maquina.setor != "")
        .distinct()
        .order_by(Maquina.setor.asc())
        .all()
    )
    return [s[0] for s in setores if s[0]]


@router.get("/estatisticas", response_model=EstatisticasIpsResponse)
def obter_estatisticas(db: Session = Depends(get_db)):
    total_maquinas = db.query(Maquina).filter(Maquina.ativo.is_(True)).count()
    total_com_ip = (
        db.query(Maquina)
        .filter(
            Maquina.ativo.is_(True),
            Maquina.ip.isnot(None),
            Maquina.ip != "",
        )
        .count()
    )
    total_com_ad = (
        db.query(Maquina)
        .filter(
            Maquina.ativo.is_(True),
            Maquina.usuario_ad.isnot(None),
            Maquina.usuario_ad != "",
        )
        .count()
    )
    total_setores = (
        db.query(Maquina.setor)
        .filter(
            Maquina.ativo.is_(True),
            Maquina.setor.isnot(None),
            Maquina.setor != "",
        )
        .distinct()
        .count()
    )

    return {
        "total_maquinas": total_maquinas,
        "total_com_ip": total_com_ip,
        "total_com_ad": total_com_ad,
        "total_setores": total_setores,
    }


@router.post("/importar")
async def importar_planilha(file: UploadFile = File(...), db: Session = Depends(get_db)):
    conteudo = await file.read()
    filename = (file.filename or "").lower()
    linhas_dados = parse_planilha_bytes(conteudo, filename)
    return processar_linhas_importadas(linhas_dados, db)


@router.get("/exportar")
def exportar_planilha(db: Session = Depends(get_db)):
    output = gerar_planilha_exportacao(db)
    headers_resp = {
        "Content-Disposition": 'attachment; filename="relacao_ips.xlsx"',
    }
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers_resp
    )


def limpar_usuario_ad(val: str | None) -> str | None:
    if not val:
        return None
    limpo = val.strip()
    if "\\" in limpo:
        limpo = limpo.split("\\", 1)[1].strip()
    if "/" in limpo:
        limpo = limpo.split("/", 1)[1].strip()
    limpo = limpo.lstrip("@").strip()
    return limpo or None


@router.post("/", response_model=MaquinaResponse, status_code=201)
def criar_maquina(dados: MaquinaCreate, db: Session = Depends(get_db)):
    nome_limpo = dados.nome_maquina.strip()
    if not nome_limpo:
        raise HTTPException(status_code=400, detail="O nome da máquina é obrigatório.")

    maquina = Maquina(
        usuario=dados.usuario.strip() if dados.usuario else None,
        nome_maquina=nome_limpo,
        usuario_ad=limpar_usuario_ad(dados.usuario_ad),
        ip=dados.ip.strip() if dados.ip else None,
        sistema_operacional=dados.sistema_operacional.strip() if dados.sistema_operacional else None,
        office=simplificar_nome_office(dados.office),
        setor=dados.setor.strip() if dados.setor else None,
        antivirus=dados.antivirus.strip() if dados.antivirus else None,
        observacoes=dados.observacoes.strip() if dados.observacoes else None,
        ativo=dados.ativo,
    )
    db.add(maquina)
    db.commit()
    db.refresh(maquina)
    return maquina


@router.get("/{id}", response_model=MaquinaResponse)
def obter_maquina(id: int, db: Session = Depends(get_db)):
    maquina = db.query(Maquina).filter(Maquina.id == id).first()
    if not maquina:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")
    return maquina


@router.put("/{id}", response_model=MaquinaResponse)
def atualizar_maquina(id: int, dados: MaquinaUpdate, db: Session = Depends(get_db)):
    maquina = db.query(Maquina).filter(Maquina.id == id).first()
    if not maquina:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")

    nome_limpo = dados.nome_maquina.strip()
    if not nome_limpo:
        raise HTTPException(status_code=400, detail="O nome da máquina não pode ficar vazio.")

    maquina.usuario = dados.usuario.strip() if dados.usuario else None
    maquina.nome_maquina = nome_limpo
    maquina.usuario_ad = limpar_usuario_ad(dados.usuario_ad)
    maquina.ip = dados.ip.strip() if dados.ip else None
    maquina.sistema_operacional = dados.sistema_operacional.strip() if dados.sistema_operacional else None
    maquina.office = simplificar_nome_office(dados.office)
    maquina.setor = dados.setor.strip() if dados.setor else None
    maquina.antivirus = dados.antivirus.strip() if dados.antivirus else None
    maquina.observacoes = dados.observacoes.strip() if dados.observacoes else None
    maquina.ativo = dados.ativo

    db.commit()
    db.refresh(maquina)
    return maquina


@router.delete("/{id}", status_code=204)
def excluir_maquina(id: int, db: Session = Depends(get_db)):
    maquina = db.query(Maquina).filter(Maquina.id == id).first()
    if not maquina:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")

    db.delete(maquina)
    db.commit()
