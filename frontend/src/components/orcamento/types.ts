export interface Orcamento {
  id: number;
  fornecedor: string;
  preco_unitario: number;
  frete: number;
  link: string | null;
  selecionado: boolean;
  data_cotacao?: string;
}

export interface ItemParaOrcamento {
  id: number;
  nome: string;
  quantidade: number;
  item_id?: number | null;
}

export interface CotacaoDetalhe {
  id: number;
  fornecedor: string;
  preco_unitario: number;
  frete: number;
  preco_total: number;
  link: string | null;
  selecionado: boolean;
  data_cotacao: string;
}

export interface PedidoHistoricoOrcamento {
  lista_compras_id: number;
  item_id: number | null;
  nome: string;
  quantidade: number;
  status: string;
  data_registro: string;
  data_compra: string | null;
  fornecedor_vencedor: string | null;
  preco_unitario_vencedor: number | null;
  preco_total_vencedor: number | null;
  total_cotacoes: number;
  tem_pdf: boolean;
  pdf_nome: string | null;
  cotacoes: CotacaoDetalhe[];
}

export interface ItemHistoricoOrcamento {
  id: number;
  orcamento_id: number;
  lista_compras_id: number;
  item_id: number | null;
  item_nome: string;
  quantidade_comprada: number;
  status_item: string;
  data_compra: string | null;
  data_cotacao: string;
  fornecedor: string;
  preco_unitario: number;
  frete: number;
  preco_total: number;
  link: string | null;
  selecionado: boolean;
}

export interface EstatisticasHistorico {
  total_cotacoes: number;
  total_pedidos?: number;
  menor_preco_unitario?: number | null;
  fornecedor_menor_preco?: string | null;
  ultimo_preco_pago?: number | null;
  ultimo_fornecedor_pago?: string | null;
  data_ultima_compra?: string | null;
  media_preco_unitario?: number | null;
}

export interface HistoricoOrcamentosResponse {
  termo?: string | null;
  item_id?: number | null;
  pagina?: number;
  tamanho_pagina?: number;
  total_pedidos?: number;
  total_paginas?: number;
  estatisticas: EstatisticasHistorico;
  pedidos?: PedidoHistoricoOrcamento[];
  cotacoes: ItemHistoricoOrcamento[];
}

export interface SugestaoItemCotado {
  nome: string;
  item_id: number | null;
  total_cotacoes: number;
  ultima_cotacao_em: string | null;
  ultimo_fornecedor: string | null;
  ultimo_preco: number | null;
}

export function converterMoeda(valor: string): number {
  if (!valor) return NaN;
  const texto = valor.replace(/r\$/gi, '').trim().replace(/\s/g, '');
  if (!texto) return NaN;
  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  return Number(normalizado);
}

export function normalizarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const limpo = url.trim();
  if (!limpo) return null;
  if (/^https?:\/\//i.test(limpo)) {
    return limpo;
  }
  return `https://${limpo}`;
}

export { formatarMoeda } from '../../utils/formatters';
