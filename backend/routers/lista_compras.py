from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from database import get_db
from models.lista_compras import ListaCompras
from schemas.lista_compras import (
    ListaComprasCreate,
    ListaComprasUpdate,
    ListaComprasResponse,
    PaginatedListaComprasResponse,
    PdfOrcamentoResponse,
)
from schemas.orcamento import OrcamentoCreate, OrcamentoUpdate, OrcamentoResponse
from models.orcamento import Orcamento
from datetime import datetime, timezone
import re

router = APIRouter(prefix="/lista-compras", tags=["Lista de Compras"])
MAX_PDF_BYTES = 10 * 1024 * 1024


def consulta_com_orcamentos(db: Session):
    return db.query(ListaCompras).options(selectinload(ListaCompras.orcamentos))


def desmarcar_outros_orcamentos(
    db: Session,
    lista_compras_id: int,
    exceto_id: int | None = None,
) -> None:
    consulta = db.query(Orcamento).filter(
        Orcamento.lista_compras_id == lista_compras_id,
        Orcamento.selecionado.is_(True),
    )
    if exceto_id is not None:
        consulta = consulta.filter(Orcamento.id != exceto_id)
    consulta.update({Orcamento.selecionado: False}, synchronize_session=False)

@router.get("/", response_model=list[ListaComprasResponse])
def listar_itens_compras(db: Session = Depends(get_db)):
    return consulta_com_orcamentos(db).all()

@router.get("/pendentes/paginado", response_model=PaginatedListaComprasResponse)
def listar_pendentes_paginado(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    consulta = consulta_com_orcamentos(db).filter(ListaCompras.status.in_(["pendente", "comprado"]))
    total = consulta.count()
    items = consulta.offset(skip).limit(limit).all()
    return {"total": total, "items": items}

@router.get("/{id}", response_model=ListaComprasResponse)
def buscar_item_compra(id: int, db: Session = Depends(get_db)):
    db_item = consulta_com_orcamentos(db).filter(ListaCompras.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return db_item

@router.post("/", response_model=ListaComprasResponse, status_code=201)
def adicionar_item_compra(item: ListaComprasCreate, db: Session = Depends(get_db)):
    novo_item = ListaCompras(**item.model_dump())
    db.add(novo_item)
    db.commit()
    db.refresh(novo_item)
    return novo_item

@router.put("/{id}", response_model=ListaComprasResponse, status_code=200)
def atualizar_item_compra(id: int, item: ListaComprasUpdate, db: Session = Depends(get_db)):
    db_item = db.query(ListaCompras).filter(ListaCompras.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    # Atualiza apenas os campos enviados, ignorando os que não foram passados (exclude_unset=True)
    update_data = item.model_dump(exclude_unset=True)
    
    # Se está marcando como comprado/entregue e não estava antes, registra a data
    if update_data.get("status") in ["comprado", "entregue"] and db_item.status not in ["comprado", "entregue"]:
        db_item.data_compra = datetime.now(timezone.utc)
    # Se está voltando para pendente/cancelado, apaga a data
    elif update_data.get("status") in ["pendente", "cancelado"]:
        db_item.data_compra = None
        
    for campo, valor in update_data.items():
        setattr(db_item, campo, valor)
        
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put("/{id}/pdf", response_model=PdfOrcamentoResponse)
async def armazenar_pdf_orcamento(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    db_item = db.query(ListaCompras).filter(ListaCompras.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    if request.headers.get("content-type", "").split(";", 1)[0] != "application/pdf":
        raise HTTPException(status_code=415, detail="Envie um arquivo PDF válido")

    conteudo = await request.body()
    if not conteudo or not conteudo.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="O arquivo enviado não é um PDF válido")
    if len(conteudo) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="O PDF deve ter no máximo 10 MB")

    nome_recebido = request.headers.get("x-pdf-filename", f"Orcamento_{id}.pdf")
    nome_arquivo = re.sub(r"[^A-Za-z0-9._-]+", "_", nome_recebido.strip())[:180]
    if not nome_arquivo.lower().endswith(".pdf"):
        nome_arquivo += ".pdf"

    atualizado_em = datetime.now(timezone.utc)
    db_item.orcamento_pdf = conteudo
    db_item.orcamento_pdf_nome = nome_arquivo
    db_item.orcamento_pdf_atualizado_em = atualizado_em
    db.commit()

    return {
        "tem_pdf": True,
        "pdf_nome": nome_arquivo,
        "pdf_atualizado_em": atualizado_em,
    }


@router.get("/{id}/pdf")
def visualizar_pdf_orcamento(id: int, db: Session = Depends(get_db)):
    db_item = db.query(ListaCompras).filter(ListaCompras.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    if not db_item.orcamento_pdf:
        raise HTTPException(status_code=404, detail="Este item ainda não possui PDF salvo")

    nome_arquivo = db_item.orcamento_pdf_nome or f"Orcamento_{id}.pdf"
    return Response(
        content=db_item.orcamento_pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{nome_arquivo}"',
            "Cache-Control": "private, no-store",
        },
    )

@router.delete("/{id}", status_code=204)
def deletar_item_compra(id: int, db: Session = Depends(get_db)):
    db_item = db.query(ListaCompras).filter(ListaCompras.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(db_item)
    db.commit()

@router.post("/{id}/orcamentos", response_model=OrcamentoResponse, status_code=201)
def adicionar_orcamento(id: int, orcamento: OrcamentoCreate, db: Session = Depends(get_db)):
    lista_item = db.query(ListaCompras).filter(ListaCompras.id == id).first()
    if not lista_item:
        raise HTTPException(status_code=404, detail="Item da lista de compras não encontrado")
    
    if orcamento.selecionado:
        desmarcar_outros_orcamentos(db, id)

    novo_orcamento = Orcamento(**orcamento.model_dump(), lista_compras_id=id)
    db.add(novo_orcamento)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Não foi possível selecionar o orçamento. Tente novamente.",
        )
    db.refresh(novo_orcamento)
    return novo_orcamento

@router.put("/orcamentos/{orcamento_id}", response_model=OrcamentoResponse)
def atualizar_orcamento(orcamento_id: int, orcamento: OrcamentoUpdate, db: Session = Depends(get_db)):
    db_orc = db.query(Orcamento).filter(Orcamento.id == orcamento_id).first()
    if not db_orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    update_data = orcamento.model_dump(exclude_unset=True)
    if update_data.get("selecionado") is True:
        desmarcar_outros_orcamentos(
            db,
            db_orc.lista_compras_id,
            exceto_id=db_orc.id,
        )
    for campo, valor in update_data.items():
        setattr(db_orc, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Não foi possível selecionar o orçamento. Tente novamente.",
        )
    db.refresh(db_orc)
    return db_orc

@router.delete("/orcamentos/{orcamento_id}", status_code=204)
def deletar_orcamento(orcamento_id: int, db: Session = Depends(get_db)):
    db_orc = db.query(Orcamento).filter(Orcamento.id == orcamento_id).first()
    if not db_orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    db.delete(db_orc)
    db.commit()
