import { useEffect, useState } from 'react';
import axios from 'axios';

interface Orcamento {
  id: number;
  fornecedor: string;
  preco_unitario: number;
  frete: number;
  link: string | null;
  selecionado: boolean;
}

interface ItemParaOrcamento {
  id: number;
  nome: string;
  quantidade: number;
}

interface ModalOrcamentoProps {
  item: ItemParaOrcamento;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

function converterMoeda(valor: string): number {
  const texto = valor.trim().replace(/\s/g, '');
  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  return Number(normalizado);
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function buscarOrcamentos(itemId: number): Promise<Orcamento[]> {
  const resposta = await axios.get(`/api/lista-compras/${itemId}`);
  return resposta.data.orcamentos || [];
}

export function ModalOrcamento({ item, onClose, onSuccess, onError }: ModalOrcamentoProps) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [fornecedor, setFornecedor] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [frete, setFrete] = useState('');
  const [link, setLink] = useState('');
  const [cidade, setCidade] = useState('Bom Jesus dos Perdões');
  const [solicitante, setSolicitante] = useState('Yago');
  const [destinatario, setDestinatario] = useState('Julia / Katia');
  const [assinatura, setAssinatura] = useState('Yago Canton.');
  const [salvando, setSalvando] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [processandoId, setProcessandoId] = useState<number | null>(null);

  const atualizarOrcamentos = async () => {
    try {
      setOrcamentos(await buscarOrcamentos(item.id));
    } catch (error: any) {
      onError(error.response?.data?.detail || 'Erro ao carregar orçamentos.');
    }
  };

  useEffect(() => {
    let ativo = true;
    buscarOrcamentos(item.id)
      .then((dados) => {
        if (ativo) setOrcamentos(dados);
      })
      .catch((error: any) => {
        if (ativo) onError(error.response?.data?.detail || 'Erro ao carregar orçamentos.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => { ativo = false; };
  }, [item.id, onError]);

  const adicionarOrcamento = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const preco = converterMoeda(precoUnitario);
    const valorFrete = frete ? converterMoeda(frete) : 0;
    if (!Number.isFinite(preco) || preco <= 0) {
      onError('Informe um preço unitário válido e maior que zero.');
      return;
    }
    if (!Number.isFinite(valorFrete) || valorFrete < 0) {
      onError('Informe um frete válido ou deixe o campo vazio.');
      return;
    }

    setSalvando(true);
    try {
      await axios.post(`/api/lista-compras/${item.id}/orcamentos`, {
        fornecedor,
        preco_unitario: preco,
        frete: valorFrete,
        link: link || null,
      });
      onSuccess(`Orçamento de ${fornecedor.trim()} adicionado.`);
      setFornecedor('');
      setPrecoUnitario('');
      setFrete('');
      setLink('');
      await atualizarOrcamentos();
    } catch (error: any) {
      onError(error.response?.data?.detail || 'Erro ao adicionar orçamento.');
    } finally {
      setSalvando(false);
    }
  };

  const deletarOrcamento = async (id: number) => {
    if (!window.confirm('Deseja excluir este orçamento?')) return;
    setProcessandoId(id);
    try {
      await axios.delete(`/api/lista-compras/orcamentos/${id}`);
      onSuccess('Orçamento excluído.');
      await atualizarOrcamentos();
    } catch (error: any) {
      onError(error.response?.data?.detail || 'Erro ao excluir orçamento.');
    } finally {
      setProcessandoId(null);
    }
  };

  const selecionarOrcamento = async (id: number) => {
    setProcessandoId(id);
    try {
      await axios.put(`/api/lista-compras/orcamentos/${id}`, { selecionado: true });
      onSuccess('Orçamento vencedor atualizado.');
      await atualizarOrcamentos();
    } catch (error: any) {
      onError(error.response?.data?.detail || 'Erro ao selecionar orçamento.');
    } finally {
      setProcessandoId(null);
    }
  };

  const exportarPDF = async () => {
    if (!cidade.trim() || !solicitante.trim() || !destinatario.trim() || !assinatura.trim()) {
      onError('Preencha todos os dados do documento antes de exportar.');
      return;
    }

    setExportandoPdf(true);
    try {
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
          { align: 'right' },
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
        const total = (orcamento.preco_unitario * item.quantidade) + orcamento.frete;
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
      onSuccess('PDF salvo no histórico e baixado com sucesso.');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      onError('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="edit-modal budget-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className="edit-modal-header">
          <div>
            <span>Quantidade solicitada: {item.quantidade}</span>
            <h2 id="budget-modal-title">Orçamentos: {item.nome}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        {carregando ? (
          <p className="inventory-empty">Carregando orçamentos...</p>
        ) : orcamentos.length === 0 ? (
          <p className="inventory-empty">Nenhum orçamento cadastrado para este item.</p>
        ) : (
          <div className="budget-comparison-list">
            {orcamentos.map((orcamento, indice) => (
              <article key={orcamento.id} className={`budget-comparison-row ${orcamento.selecionado ? 'budget-comparison-selected' : ''}`}>
                <div className="budget-comparison-supplier">
                  <span>Opção {indice + 1}</span>
                  <strong>{orcamento.fornecedor}</strong>
                  {orcamento.link && <a href={orcamento.link} target="_blank" rel="noreferrer">Abrir loja ↗</a>}
                </div>
                <div className="budget-comparison-value">
                  <span>Unitário</span>
                  <strong>{formatarMoeda(orcamento.preco_unitario)}</strong>
                </div>
                <div className="budget-comparison-value">
                  <span>Frete</span>
                  <strong>{orcamento.frete === 0 ? 'Grátis' : formatarMoeda(orcamento.frete)}</strong>
                </div>
                <div className="budget-comparison-value budget-comparison-total">
                  <span>Total</span>
                  <strong>{formatarMoeda((orcamento.preco_unitario * item.quantidade) + orcamento.frete)}</strong>
                </div>
                <div className="budget-comparison-actions">
                  {orcamento.selecionado ? (
                    <span className="badge badge-success">Vencedor ✓</span>
                  ) : (
                    <button className="btn btn-outline budget-row-button budget-choose" type="button" disabled={processandoId !== null} onClick={() => selecionarOrcamento(orcamento.id)}>
                      Escolher
                    </button>
                  )}
                  <button
                    className="btn btn-outline budget-row-button budget-delete budget-delete-icon"
                    type="button"
                    disabled={processandoId !== null}
                    onClick={() => deletarOrcamento(orcamento.id)}
                    aria-label={`Excluir cotação de ${orcamento.fornecedor}`}
                    title="Excluir cotação"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-1 14H6L5 6"></path>
                      <path d="M10 11v6M14 11v6"></path>
                      <path d="M9 6V4h6v2"></path>
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <details className="budget-section budget-collapsible">
          <summary>
            <span>
              <strong>Adicionar nova cotação</strong>
              <small>Fornecedor, valores e link da loja</small>
            </span>
            <span className="budget-collapsible-icon" aria-hidden="true">⌄</span>
          </summary>
          <div className="budget-collapsible-content">
            <form onSubmit={adicionarOrcamento} className="edit-form-grid budget-form">
              <label className="form-field form-field-wide">
                <span>Fornecedor</span>
                <input value={fornecedor} onChange={(evento) => setFornecedor(evento.target.value)} required placeholder="Ex: Loja de Informática" />
              </label>
              <label className="form-field">
                <span>Preço unitário (R$)</span>
                <input value={precoUnitario} onChange={(evento) => setPrecoUnitario(evento.target.value)} required inputMode="decimal" placeholder="118,00" />
              </label>
              <label className="form-field">
                <span>Frete (R$)</span>
                <input value={frete} onChange={(evento) => setFrete(evento.target.value)} inputMode="decimal" placeholder="0,00" />
              </label>
              <label className="form-field form-field-wide">
                <span>Link da loja</span>
                <input type="url" value={link} onChange={(evento) => setLink(evento.target.value)} placeholder="https://..." />
              </label>
              <button type="submit" className="btn btn-primary form-field-wide" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Adicionar cotação'}
              </button>
            </form>
          </div>
        </details>

        <details className="budget-section budget-collapsible">
          <summary>
            <span>
              <strong>Dados do PDF</strong>
              <small>Cidade, destinatário e assinatura</small>
            </span>
            <span className="budget-collapsible-icon" aria-hidden="true">⌄</span>
          </summary>
          <div className="budget-collapsible-content">
            <div className="edit-form-grid">
              <label className="form-field form-field-wide">
                <span>Cidade</span>
                <input value={cidade} onChange={(evento) => setCidade(evento.target.value)} />
              </label>
              <label className="form-field">
                <span>De</span>
                <input value={solicitante} onChange={(evento) => setSolicitante(evento.target.value)} />
              </label>
              <label className="form-field">
                <span>Para</span>
                <input value={destinatario} onChange={(evento) => setDestinatario(evento.target.value)} />
              </label>
              <label className="form-field form-field-wide">
                <span>Assinatura</span>
                <input value={assinatura} onChange={(evento) => setAssinatura(evento.target.value)} />
              </label>
            </div>
          </div>
        </details>

        <div className="edit-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Fechar</button>
          <button type="button" className="btn btn-primary" onClick={exportarPDF} disabled={orcamentos.length === 0 || exportandoPdf}>
            {exportandoPdf ? 'Salvando PDF...' : 'Salvar e baixar PDF'}
          </button>
        </div>
      </section>
    </div>
  );
}
