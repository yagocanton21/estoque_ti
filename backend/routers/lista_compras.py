from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload
from database import get_db
from models.lista_compras import ListaCompras
from schemas.lista_compras import (
    ListaComprasCreate,
    ListaComprasUpdate,
    ListaComprasResponse,
    PaginatedListaComprasResponse,
    PdfOrcamentoResponse,
    GerarPdfOrcamentoRequest,
)
from schemas.orcamento import (
    OrcamentoCreate,
    OrcamentoUpdate,
    OrcamentoResponse,
    HistoricoOrcamentosResponse,
    ItemHistoricoOrcamento,
    PedidoHistoricoOrcamento,
    CotacaoDetalhe,
    EstatisticasHistorico,
    SugestaoItemCotado,
)
from models.orcamento import Orcamento
from services.gerador_pdf import gerar_pdf_orcamento_bytes, sanitizar_nome_arquivo
from datetime import datetime, timezone
from typing import Optional
import math
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


@router.get("/metricas")
def obter_metricas_compras(db: Session = Depends(get_db)):
    """Retorna contadores de status e valor total estimado/aprovado para resumo no topo da tela."""
    itens_em_andamento = (
        consulta_com_orcamentos(db)
        .filter(ListaCompras.status.in_(["pendente", "comprado"]))
        .all()
    )
    
    total_pendentes = sum(1 for item in itens_em_andamento if item.status == "pendente")
    total_comprados = sum(1 for item in itens_em_andamento if item.status == "comprado")
    total_entregues = db.query(ListaCompras).filter(ListaCompras.status == "entregue").count()

    valor_total_estimado = 0.0
    for item in itens_em_andamento:
        if not item.orcamentos:
            continue
        vencedor = next((o for o in item.orcamentos if o.selecionado), None)
        if not vencedor:
            # Se ainda não escolheu vencedor, considera o de menor valor total como estimativa
            vencedor = min(
                item.orcamentos,
                key=lambda o: float(o.preco_unitario) * item.quantidade + float(o.frete),
            )
        valor_total_estimado += float(vencedor.preco_unitario) * item.quantidade + float(vencedor.frete)

    return {
        "total_pendentes": total_pendentes,
        "total_comprados": total_comprados,
        "total_entregues": total_entregues,
        "valor_total_estimado": round(valor_total_estimado, 2),
    }


@router.get("/orcamentos/historico", response_model=HistoricoOrcamentosResponse)
def buscar_historico_orcamentos(
    termo: Optional[str] = Query(None, description="Nome ou parte do nome do produto"),
    item_id: Optional[int] = Query(None, description="ID do item vinculado no estoque"),
    pagina: int = Query(1, ge=1, description="Número da página (iniciando em 1)"),
    tamanho_pagina: int = Query(10, ge=1, le=100, description="Quantidade de pedidos por página"),
    limite: int = Query(500, ge=1, le=2000, description="Limite máximo de cotações para consolidação"),
    db: Session = Depends(get_db),
):
    """
    Busca o histórico de cotações de orçamentos para um produto,
    permitindo comparar preços históricos com ou sem cadastro no estoque,
    com suporte à paginação de pedidos.
    """
    consulta = (
        db.query(Orcamento, ListaCompras)
        .join(ListaCompras, Orcamento.lista_compras_id == ListaCompras.id)
    )

    filtros = []
    if item_id is not None:
        filtros.append(ListaCompras.item_id == item_id)
    if termo and termo.strip():
        termo_limpo = f"%{termo.strip()}%"
        filtros.append(ListaCompras.nome.ilike(termo_limpo))

    if filtros:
        consulta = consulta.filter(or_(*filtros))

    # Ordena pelo mais recente
    consulta = consulta.order_by(Orcamento.data_cotacao.desc(), Orcamento.id.desc())
    resultados = consulta.limit(limite).all()

    cotacoes: list[ItemHistoricoOrcamento] = []
    pedidos_dict: dict[int, PedidoHistoricoOrcamento] = {}

    for orcamento, item in resultados:
        preco_unit = float(orcamento.preco_unitario)
        frete_val = float(orcamento.frete)
        preco_tot = round(preco_unit * item.quantidade + frete_val, 2)
        
        cotacoes.append(
            ItemHistoricoOrcamento(
                id=orcamento.id,
                orcamento_id=orcamento.id,
                lista_compras_id=orcamento.lista_compras_id,
                item_id=item.item_id,
                item_nome=item.nome,
                quantidade_comprada=item.quantidade,
                status_item=item.status,
                data_compra=item.data_compra,
                data_cotacao=orcamento.data_cotacao,
                fornecedor=orcamento.fornecedor,
                preco_unitario=preco_unit,
                frete=frete_val,
                preco_total=preco_tot,
                link=orcamento.link,
                selecionado=orcamento.selecionado,
            )
        )

        if item.id not in pedidos_dict:
            pedidos_dict[item.id] = PedidoHistoricoOrcamento(
                lista_compras_id=item.id,
                item_id=item.item_id,
                nome=item.nome,
                quantidade=item.quantidade,
                status=item.status,
                data_registro=orcamento.data_cotacao,
                data_compra=item.data_compra,
                fornecedor_vencedor=None,
                preco_unitario_vencedor=None,
                preco_total_vencedor=None,
                total_cotacoes=0,
                tem_pdf=item.tem_pdf,
                pdf_nome=item.pdf_nome,
                cotacoes=[],
            )

        detalhe = CotacaoDetalhe(
            id=orcamento.id,
            fornecedor=orcamento.fornecedor,
            preco_unitario=preco_unit,
            frete=frete_val,
            preco_total=preco_tot,
            link=orcamento.link,
            selecionado=orcamento.selecionado,
            data_cotacao=orcamento.data_cotacao,
        )
        pedidos_dict[item.id].cotacoes.append(detalhe)
        pedidos_dict[item.id].total_cotacoes += 1

        if orcamento.selecionado:
            pedidos_dict[item.id].fornecedor_vencedor = orcamento.fornecedor
            pedidos_dict[item.id].preco_unitario_vencedor = preco_unit
            pedidos_dict[item.id].preco_total_vencedor = preco_tot

    pedidos_lista = list(pedidos_dict.values())
    for p in pedidos_lista:
        if not p.fornecedor_vencedor and p.cotacoes:
            melhor = min(p.cotacoes, key=lambda c: c.preco_total)
            p.fornecedor_vencedor = melhor.fornecedor
            p.preco_unitario_vencedor = melhor.preco_unitario
            p.preco_total_vencedor = melhor.preco_total

    # Cálculo de estatísticas comparativas (apenas quando há filtro de termo ou item_id)
    tem_filtro = bool((termo and termo.strip()) or item_id is not None)
    if tem_filtro and cotacoes:
        menor_cotacao = min(cotacoes, key=lambda c: c.preco_unitario)
        menor_preco = menor_cotacao.preco_unitario
        fornecedor_menor = menor_cotacao.fornecedor

        # Última cotação vencedora / comprada
        ultima_vencedora = next((c for c in cotacoes if c.selecionado), None)
        ultimo_preco = ultima_vencedora.preco_unitario if ultima_vencedora else None
        ultimo_fornecedor = ultima_vencedora.fornecedor if ultima_vencedora else None
        data_ultima_compra = (
            (ultima_vencedora.data_compra or ultima_vencedora.data_cotacao)
            if ultima_vencedora
            else None
        )

        media_preco = round(sum(c.preco_unitario for c in cotacoes) / len(cotacoes), 2)
        estatisticas = EstatisticasHistorico(
            total_cotacoes=len(cotacoes),
            total_pedidos=len(pedidos_lista),
            menor_preco_unitario=menor_preco,
            fornecedor_menor_preco=fornecedor_menor,
            ultimo_preco_pago=ultimo_preco,
            ultimo_fornecedor_pago=ultimo_fornecedor,
            data_ultima_compra=data_ultima_compra,
            media_preco_unitario=media_preco,
        )
    else:
        estatisticas = EstatisticasHistorico(total_cotacoes=0, total_pedidos=0)

    total_pedidos = len(pedidos_lista)
    total_paginas = max(1, math.ceil(total_pedidos / tamanho_pagina))
    inicio = (pagina - 1) * tamanho_pagina
    fim = inicio + tamanho_pagina
    pedidos_paginados = pedidos_lista[inicio:fim]

    return HistoricoOrcamentosResponse(
        termo=termo,
        item_id=item_id,
        pagina=pagina,
        tamanho_pagina=tamanho_pagina,
        total_pedidos=total_pedidos,
        total_paginas=total_paginas,
        estatisticas=estatisticas,
        pedidos=pedidos_paginados,
        cotacoes=cotacoes,
    )


@router.get("/orcamentos/itens-cotados", response_model=list[SugestaoItemCotado])
def listar_itens_cotados_frequentes(
    limite: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Retorna a lista dos itens que já foram cotados anteriormente,
    com contagem de cotações e última cotação.
    """
    itens = (
        db.query(
            ListaCompras.nome,
            ListaCompras.item_id,
            func.count(Orcamento.id).label("total_cotacoes"),
            func.max(Orcamento.data_cotacao).label("ultima_cotacao_em"),
        )
        .join(Orcamento, Orcamento.lista_compras_id == ListaCompras.id)
        .group_by(ListaCompras.nome, ListaCompras.item_id)
        .order_by(func.count(Orcamento.id).desc(), func.max(Orcamento.data_cotacao).desc())
        .limit(limite)
        .all()
    )

    sugestoes: list[SugestaoItemCotado] = []
    for nome, item_id, total_cotacoes, ultima_cotacao_em in itens:
        # Pega a última cotação desse item para obter fornecedor e preço
        ultima_cotacao = (
            db.query(Orcamento)
            .join(ListaCompras, Orcamento.lista_compras_id == ListaCompras.id)
            .filter(ListaCompras.nome == nome)
            .order_by(Orcamento.data_cotacao.desc(), Orcamento.id.desc())
            .first()
        )
        sugestoes.append(
            SugestaoItemCotado(
                nome=nome,
                item_id=item_id,
                total_cotacoes=total_cotacoes,
                ultima_cotacao_em=ultima_cotacao_em,
                ultimo_fornecedor=ultima_cotacao.fornecedor if ultima_cotacao else None,
                ultimo_preco=float(ultima_cotacao.preco_unitario) if ultima_cotacao else None,
            )
        )

    return sugestoes


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
    
    update_data = item.model_dump(exclude_unset=True)
    
    if update_data.get("status") in ["comprado", "entregue"] and db_item.status not in ["comprado", "entregue"]:
        db_item.data_compra = datetime.now(timezone.utc)
    elif update_data.get("status") in ["pendente", "cancelado"]:
        db_item.data_compra = None
        
    for campo, valor in update_data.items():
        setattr(db_item, campo, valor)
        
    db.commit()
    db.refresh(db_item)
    return db_item


@router.post("/{id}/gerar-pdf")
def gerar_e_armazenar_pdf_orcamento(
    id: int,
    dados: GerarPdfOrcamentoRequest,
    db: Session = Depends(get_db),
):
    db_item = (
        db.query(ListaCompras)
        .options(selectinload(ListaCompras.orcamentos))
        .filter(ListaCompras.id == id)
        .first()
    )
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    if not db_item.orcamentos:
        raise HTTPException(
            status_code=400,
            detail="Adicione ao menos um orçamento antes de gerar o PDF",
        )

    nome_arquivo = sanitizar_nome_arquivo(db_item.nome)
    atualizado_em = datetime.now(timezone.utc)

    conteudo_pdf = gerar_pdf_orcamento_bytes(
        item_nome=db_item.nome,
        item_quantidade=db_item.quantidade,
        orcamentos=db_item.orcamentos,
        cidade=dados.cidade,
        solicitante=dados.solicitante,
        destinatario=dados.destinatario,
        assinatura=dados.assinatura,
        data_documento=atualizado_em,
    )

    db_item.orcamento_pdf = conteudo_pdf
    db_item.orcamento_pdf_nome = nome_arquivo
    db_item.orcamento_pdf_atualizado_em = atualizado_em
    db.commit()

    return Response(
        content=conteudo_pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{nome_arquivo}"',
            "X-PDF-Filename": nome_arquivo,
            "Cache-Control": "private, no-store",
        },
    )


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

    novo_orcamento = Orcamento(
        **orcamento.model_dump(),
        lista_compras_id=id,
        data_cotacao=datetime.now(timezone.utc),
    )
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
