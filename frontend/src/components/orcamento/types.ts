export interface Orcamento {
  id: number;
  fornecedor: string;
  preco_unitario: number;
  frete: number;
  link: string | null;
  selecionado: boolean;
}

export interface ItemParaOrcamento {
  id: number;
  nome: string;
  quantidade: number;
}

export function converterMoeda(valor: string): number {
  const texto = valor.trim().replace(/\s/g, '');
  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  return Number(normalizado);
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
