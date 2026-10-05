export interface OrcamentoItem {
  id: number;
  fornecedor: string;
  preco_unitario: number;
  frete: number;
  selecionado: boolean;
}

export interface ListaComprasItem {
  id: number;
  item_id: number | null;
  nome: string;
  quantidade: number;
  status: string;
  link: string | null;
  orcamentos?: OrcamentoItem[];
}
