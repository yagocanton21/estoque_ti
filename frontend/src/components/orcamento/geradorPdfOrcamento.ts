import axios from 'axios';
import type { ItemParaOrcamento, Orcamento } from './types';
import { formatarMoeda } from './types';

interface GerarPdfOrcamentoParams {
  item: ItemParaOrcamento;
  orcamentos: Orcamento[];
  cidade: string;
  solicitante: string;
  destinatario: string;
  assinatura: string;
}

export async function gerarESalvarPdfOrcamento({
  item,
  orcamentos,
  cidade,
  solicitante,
  destinatario,
  assinatura,
}: GerarPdfOrcamentoParams): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const documento = new jsPDF({ compress: true });
  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const logo = await fetch('/logo.png')
    .then(async (resposta) => {
      if (!resposta.ok) throw new Error('Logo não encontrado');
      const imagem = await createImageBitmap(await resposta.blob());
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 240;
      const contexto = canvas.getContext('2d');
      if (!contexto) throw new Error('Não foi possível preparar o logo');
      contexto.fillStyle = '#ffffff';
      contexto.fillRect(0, 0, canvas.width, canvas.height);
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      imagem.close();
      return canvas.toDataURL('image/jpeg', 0.82);
    })
    .catch(() => null);

  const larguraPagina = documento.internal.pageSize.getWidth();
  const alturaPagina = documento.internal.pageSize.getHeight();
  const totalPaginasToken = '{total_pages_count_string}';

  const desenharCabecalho = () => {
    if (logo) documento.addImage(logo, 'JPEG', 18, 10, 21, 21, undefined, 'FAST');
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(15);
    documento.setTextColor(20, 55, 140);
    documento.text('TI', logo ? 44 : 18, 22);

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(14);
    documento.setTextColor(30, 41, 59);
    documento.text('ORÇAMENTO DE COMPRA', larguraPagina - 18, 18, { align: 'right' });
    documento.setFont('helvetica', 'normal');
    documento.setFontSize(8);
    documento.setTextColor(100, 116, 139);
    documento.text('Documento para análise e aprovação', larguraPagina - 18, 24, { align: 'right' });

    documento.setDrawColor(20, 55, 140);
    documento.setLineWidth(0.7);
    documento.line(18, 35, larguraPagina - 18, 35);
  };

  const desenharRodape = () => {
    const paginaAtual = documento.getNumberOfPages();
    documento.setDrawColor(203, 213, 225);
    documento.setLineWidth(0.25);
    documento.line(18, alturaPagina - 15, larguraPagina - 18, alturaPagina - 15);
    documento.setFont('helvetica', 'normal');
    documento.setFontSize(7.5);
    documento.setTextColor(100, 116, 139);
    documento.text('Arthi · Estoque TI · Documento gerado pelo sistema', 18, alturaPagina - 9);
    documento.text(
      `Página ${paginaAtual} de ${totalPaginasToken}`,
      larguraPagina - 18,
      alturaPagina - 9,
      { align: 'right' }
    );
  };

  desenharCabecalho();
  documento.setFillColor(248, 250, 252);
  documento.setDrawColor(226, 232, 240);
  documento.setLineWidth(0.3);
  documento.roundedRect(18, 43, larguraPagina - 36, 37, 2, 2, 'FD');

  const escreverCampo = (rotulo: string, valor: string, x: number, y: number) => {
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(7);
    documento.setTextColor(100, 116, 139);
    documento.text(rotulo, x, y);
    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9.5);
    documento.setTextColor(30, 41, 59);
    documento.text(valor, x, y + 6);
  };

  escreverCampo('DE', solicitante.trim(), 23, 51);
  escreverCampo('PARA', destinatario.trim(), 92, 51);
  escreverCampo('REFERÊNCIA', 'Compra', 23, 67);
  escreverCampo('LOCAL E DATA', `${cidade.trim()}, ${dataAtual}`, 92, 67);

  documento.setFont('helvetica', 'bold');
  documento.setFontSize(7);
  documento.setTextColor(100, 116, 139);
  documento.text('ITEM SOLICITADO', 18, 91);
  documento.setFontSize(11.5);
  documento.setTextColor(30, 41, 59);
  documento.text(item.nome, 18, 98);
  documento.setFont('helvetica', 'normal');
  documento.setFontSize(8.5);
  documento.setTextColor(71, 85, 105);
  documento.text(`Quantidade: ${item.quantidade}`, larguraPagina - 18, 98, { align: 'right' });

  const linhas = orcamentos.map((orcamento, indice) => {
    const total = orcamento.preco_unitario * item.quantidade + orcamento.frete;
    return [
      indice + 1,
      formatarMoeda(orcamento.preco_unitario),
      item.quantidade,
      orcamento.frete === 0 ? 'Grátis' : formatarMoeda(orcamento.frete),
      formatarMoeda(total),
      orcamento.fornecedor,
    ];
  });

  autoTable(documento, {
    startY: 104,
    head: [['', 'Preço unitário', 'Qtde', 'Frete', 'Preço total', 'Site']],
    body: linhas,
    theme: 'grid',
    tableWidth: larguraPagina - 36,
    margin: { top: 43, right: 18, bottom: 27, left: 18 },
    styles: {
      halign: 'center',
      valign: 'middle',
      fontSize: 8.2,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [232, 238, 252],
      textColor: [20, 55, 140],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 31 },
      2: { cellWidth: 16 },
      3: { cellWidth: 28 },
      4: { cellWidth: 32 },
      5: { cellWidth: 57 },
    },
    didDrawPage: () => {
      desenharCabecalho();
      desenharRodape();
    },
  });

  let finalY = (documento as any).lastAutoTable.finalY || 120;
  let assinaturaY = Math.max(finalY + 16, 175);
  if (assinaturaY > 202) {
    documento.addPage();
    desenharCabecalho();
    desenharRodape();
    assinaturaY = 68;
  }

  documento.setFont('helvetica', 'normal');
  documento.setFontSize(9);
  documento.setTextColor(71, 85, 105);
  documento.text('Atenciosamente,', 18, assinaturaY);
  documento.setFont('helvetica', 'bold');
  documento.setFontSize(10);
  documento.setTextColor(30, 41, 59);
  documento.text(assinatura.trim(), 18, assinaturaY + 7);

  const aprovacaoY = assinaturaY + 23;
  documento.setFont('helvetica', 'bold');
  documento.setFontSize(8);
  documento.setTextColor(20, 55, 140);
  documento.text('APROVAÇÃO DO RESPONSÁVEL', 18, aprovacaoY);
  documento.setDrawColor(148, 163, 184);
  documento.setLineWidth(0.3);
  documento.roundedRect(18, aprovacaoY + 5, larguraPagina - 36, 42, 2, 2, 'S');
  documento.setFont('helvetica', 'normal');
  documento.setFontSize(7.5);
  documento.setTextColor(100, 116, 139);
  documento.text('Parecer / observações:', 23, aprovacaoY + 13);
  documento.line(23, aprovacaoY + 25, larguraPagina - 23, aprovacaoY + 25);
  documento.text('Visto / assinatura:', 23, aprovacaoY + 35);
  documento.line(50, aprovacaoY + 36, 132, aprovacaoY + 36);
  documento.text('Data:', 142, aprovacaoY + 35);
  documento.line(151, aprovacaoY + 36, larguraPagina - 23, aprovacaoY + 36);

  documento.putTotalPages(totalPaginasToken);
  const nomeSeguro = item.nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  const nomeArquivo = `Orcamento_${nomeSeguro}.pdf`;
  const arquivoPdf = documento.output('blob');

  await axios.put(`/api/lista-compras/${item.id}/pdf`, arquivoPdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'X-PDF-Filename': nomeArquivo,
    },
  });

  documento.save(nomeArquivo);
}
