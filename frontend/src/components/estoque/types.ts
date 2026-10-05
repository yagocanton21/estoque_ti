export interface Item {
  id: number;
  nome: string;
  marca: string | null;
  modelo: string | null;
  quantidade: number;
  quantidade_minima: number | null;
  foto_url?: string;
}

export interface EdicaoItem {
  id: number;
  nome: string;
  marca: string;
  modelo: string;
  quantidade: number;
  quantidade_minima: number;
  foto_url?: string;
  foto_arquivo?: File;
}

export interface ItemMovimentacaoHistorico {
  id: number;
  tipo: 'entrada' | 'saida' | 'ajuste' | string;
  quantidade: number;
  quantidade_anterior?: number | null;
  quantidade_resultante?: number | null;
  motivo?: string | null;
  entregue_para?: string | null;
  observacao?: string | null;
  data: string;
}

export interface ItemHistoricoDados {
  item: Item;
  total_entradas: number;
  total_saidas: number;
  total_ajustes: number;
  movimentacoes: ItemMovimentacaoHistorico[];
}

export type FiltroEstoque = 'todos' | 'normal' | 'limite' | 'abaixo';
