import { useEffect, useState } from 'react';
import axios from 'axios';
import type { ItemParaOrcamento, Orcamento } from './orcamento/types';
import { FormCotacao } from './orcamento/FormCotacao';
import { FormDadosPdf } from './orcamento/FormDadosPdf';
import { ListaComparativaCotacoes } from './orcamento/ListaComparativaCotacoes';
import { gerarESalvarPdfOrcamento } from './orcamento/geradorPdfOrcamento';
import './orcamento/ModalOrcamento.css';

interface ModalOrcamentoProps {
  item: ItemParaOrcamento;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

async function buscarOrcamentos(itemId: number): Promise<Orcamento[]> {
  const resposta = await axios.get(`/api/lista-compras/${itemId}`);
  return resposta.data.orcamentos || [];
}

export function ModalOrcamento({ item, onClose, onSuccess, onError }: ModalOrcamentoProps) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [carregando, setCarregando] = useState(true);
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

    return () => {
      ativo = false;
    };
  }, [item.id, onError]);

  const handleAdicionarCotacao = async (dados: {
    fornecedor: string;
    preco_unitario: number;
    frete: number;
    link: string | null;
  }) => {
    setSalvando(true);
    try {
      await axios.post(`/api/lista-compras/${item.id}/orcamentos`, dados);
      onSuccess(`Orçamento de ${dados.fornecedor} adicionado.`);
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
      await gerarESalvarPdfOrcamento({
        item,
        orcamentos,
        cidade,
        solicitante,
        destinatario,
        assinatura,
      });
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
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        {carregando ? (
          <p className="inventory-empty">Carregando orçamentos...</p>
        ) : orcamentos.length === 0 ? (
          <p className="inventory-empty">Nenhum orçamento cadastrado para este item.</p>
        ) : (
          <ListaComparativaCotacoes
            orcamentos={orcamentos}
            item={item}
            processandoId={processandoId}
            onSelecionar={selecionarOrcamento}
            onDeletar={deletarOrcamento}
          />
        )}

        <FormCotacao
          salvando={salvando}
          onAdicionar={handleAdicionarCotacao}
          onError={onError}
        />

        <FormDadosPdf
          cidade={cidade}
          setCidade={setCidade}
          solicitante={solicitante}
          setSolicitante={setSolicitante}
          destinatario={destinatario}
          setDestinatario={setDestinatario}
          assinatura={assinatura}
          setAssinatura={setAssinatura}
        />

        <div className="edit-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportarPDF}
            disabled={orcamentos.length === 0 || exportandoPdf}
          >
            {exportandoPdf ? 'Salvando PDF...' : 'Salvar e baixar PDF'}
          </button>
        </div>
      </section>
    </div>
  );
}
