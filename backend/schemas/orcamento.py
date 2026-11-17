from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional

class OrcamentoBase(BaseModel):
    fornecedor: str = Field(..., min_length=1, max_length=200, description="Nome da loja ou site")
    preco_unitario: float = Field(..., gt=0, description="Preço unitário do produto")
    frete: float = Field(default=0.0, ge=0, description="Valor do frete")
    link: Optional[str] = Field(default=None, max_length=4000, description="Link do produto")
    selecionado: bool = False

    @field_validator("fornecedor")
    @classmethod
    def validar_fornecedor(cls, valor: str) -> str:
        fornecedor = valor.strip()
        if not fornecedor:
            raise ValueError("Informe o fornecedor")
        return fornecedor

class OrcamentoCreate(OrcamentoBase):
    pass

class OrcamentoUpdate(BaseModel):
    fornecedor: Optional[str] = Field(default=None, max_length=200)
    preco_unitario: Optional[float] = Field(default=None, gt=0)
    frete: Optional[float] = Field(default=None, ge=0)
    link: Optional[str] = Field(default=None, max_length=4000)
    selecionado: Optional[bool] = None

class OrcamentoResponse(OrcamentoBase):
    id: int
    lista_compras_id: int
    data_cotacao: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CotacaoDetalhe(BaseModel):
    id: int
    fornecedor: str
    preco_unitario: float
    frete: float
    preco_total: float
    link: Optional[str] = None
    selecionado: bool
    data_cotacao: datetime


class PedidoHistoricoOrcamento(BaseModel):
    lista_compras_id: int
    item_id: Optional[int] = None
    nome: str
    quantidade: int
    status: str
    data_registro: datetime
    data_compra: Optional[datetime] = None
    fornecedor_vencedor: Optional[str] = None
    preco_unitario_vencedor: Optional[float] = None
    preco_total_vencedor: Optional[float] = None
    total_cotacoes: int
    tem_pdf: bool
    pdf_nome: Optional[str] = None
    cotacoes: list[CotacaoDetalhe]


class ItemHistoricoOrcamento(BaseModel):
    id: int
    orcamento_id: int
    lista_compras_id: int
    item_id: Optional[int] = None
    item_nome: str
    quantidade_comprada: int
    status_item: str
    data_compra: Optional[datetime] = None
    data_cotacao: datetime
    fornecedor: str
    preco_unitario: float
    frete: float
    preco_total: float
    link: Optional[str] = None
    selecionado: bool


class EstatisticasHistorico(BaseModel):
    total_cotacoes: int
    total_pedidos: int = 0
    menor_preco_unitario: Optional[float] = None
    fornecedor_menor_preco: Optional[str] = None
    ultimo_preco_pago: Optional[float] = None
    ultimo_fornecedor_pago: Optional[str] = None
    data_ultima_compra: Optional[datetime] = None
    media_preco_unitario: Optional[float] = None


class HistoricoOrcamentosResponse(BaseModel):
    termo: Optional[str] = None
    item_id: Optional[int] = None
    pagina: int = 1
    tamanho_pagina: int = 10
    total_pedidos: int = 0
    total_paginas: int = 1
    estatisticas: EstatisticasHistorico
    pedidos: list[PedidoHistoricoOrcamento] = []
    cotacoes: list[ItemHistoricoOrcamento] = []


class SugestaoItemCotado(BaseModel):
    nome: str
    item_id: Optional[int] = None
    total_cotacoes: int
    ultima_cotacao_em: Optional[datetime] = None
    ultimo_fornecedor: Optional[str] = None
    ultimo_preco: Optional[float] = None
