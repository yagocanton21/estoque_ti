import axios from 'axios';
import type { ItemParaOrcamento, Orcamento } from './types';

interface GerarPdfOrcamentoParams {
  item: ItemParaOrcamento;
  orcamentos?: Orcamento[];
  cidade: string;
  solicitante: string;
  destinatario: string;
  assinatura: string;
}

export async function gerarESalvarPdfOrcamento({
  item,
  cidade,
  solicitante,
  destinatario,
  assinatura,
}: GerarPdfOrcamentoParams): Promise<void> {
  const resposta = await axios.post(
    `/api/lista-compras/${item.id}/gerar-pdf`,
    {
      cidade,
      solicitante,
      destinatario,
      assinatura,
    },
    {
      responseType: 'blob',
    }
  );

  // Extrai nome do arquivo dos headers ou fallback para nome seguro
  const contentDisposition = (resposta.headers && resposta.headers['content-disposition']) || '';
  const match = contentDisposition.match(/filename="?([^"]+)"?/);
  const nomeArquivo = match
    ? match[1]
    : ((resposta.headers && resposta.headers['x-pdf-filename']) || `Orcamento_${item.id}.pdf`);

  // Dispara o download nativo do PDF gerado e auditado pelo servidor
  const blob = new Blob([resposta.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
