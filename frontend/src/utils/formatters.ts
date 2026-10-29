/**
 * Utilitários compartilhados de formatação para o Frontend.
 * Centraliza regras de fuso horário, formatação de datas e moeda.
 */

/**
 * Formata uma data/hora no padrão brasileiro (DD/MM/AAAA HH:mm:ss ou HH:mm).
 * Corrige strings ISO que chegam sem indicação de fuso (UTC) do banco.
 */
export function formatarData(valor?: string | null, fallback = 'Data desconhecida'): string {
  if (!valor) return fallback;

  try {
    const possuiFuso = /(?:Z|[+-]\d{2}:\d{2})$/.test(valor);
    const data = new Date(possuiFuso ? valor : `${valor}Z`);
    if (isNaN(data.getTime())) return fallback;

    return data.toLocaleString('pt-BR');
  } catch {
    return fallback;
  }
}

/**
 * Formata apenas a data no padrão brasileiro (DD/MM/AAAA).
 */
export function formatarDataCurta(valor?: string | null, fallback = '-'): string {
  if (!valor) return fallback;

  try {
    const possuiFuso = /(?:Z|[+-]\d{2}:\d{2})$/.test(valor);
    const data = new Date(possuiFuso ? valor : `${valor}Z`);
    if (isNaN(data.getTime())) return fallback;

    return data.toLocaleDateString('pt-BR');
  } catch {
    return fallback;
  }
}

/**
 * Formata valores numéricos como moeda brasileira (ex: R$ 1.250,50).
 */
export function formatarMoeda(valor?: number | null, fallback = 'R$ 0,00'): string {
  if (valor === undefined || valor === null || isNaN(valor)) {
    return fallback;
  }

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
