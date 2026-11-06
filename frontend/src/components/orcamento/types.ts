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
