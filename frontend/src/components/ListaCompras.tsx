import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';
import { ModalOrcamento } from './ModalOrcamento';
import type { ListaComprasItem } from './lista-compras/types';
import { CardItemCompra } from './lista-compras/CardItemCompra';
import { FormAdicionarCompra } from './lista-compras/FormAdicionarCompra';
import { ModalEdicaoCompra } from './lista-compras/ModalEdicaoCompra';
import './lista-compras/ListaCompras.css';

export type { ListaComprasItem };

export interface ListaComprasProps {
  onNavigate: (tab: string) => void;
}

export function ListaCompras({ onNavigate }: ListaComprasProps) {
  const [lista, setLista] = useState<ListaComprasItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);
  const itemsPerPage = 10;

  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [itemParaOrcamento, setItemParaOrcamento] = useState<ListaComprasItem | null>(null);
  const [itemEmEdicao, setItemEmEdicao] = useState<ListaComprasItem | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregarLista = useCallback(async (pagina: number = page) => {
    setCarregando(true);
    try {
      const skip = (pagina - 1) * itemsPerPage;
      const res = await axios.get(`/api/lista-compras/pendentes/paginado?skip=${skip}&limit=${itemsPerPage}`);
      setLista(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Erro ao buscar lista de compras:', error);
      setFeedback({ type: 'error', text: 'Não foi possível carregar a lista de compras.' });
    } finally {
      setCarregando(false);
    }
  }, [page, itemsPerPage]);

  useEffect(() => {
    let ativo = true;
    const skip = (page - 1) * itemsPerPage;
    axios
      .get(`/api/lista-compras/pendentes/paginado?skip=${skip}&limit=${itemsPerPage}`)
      .then((res) => {
        if (!ativo) return;
        setLista(res.data.items);
        setTotal(res.data.total);
      })
      .catch((error) => {
        if (!ativo) return;
        console.error('Erro ao buscar lista de compras:', error);
        setFeedback({ type: 'error', text: 'Não foi possível carregar a lista de compras.' });
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [page, itemsPerPage]);

  const avancarStatus = async (item: ListaComprasItem) => {
    let finalItemId = item.item_id;
    setProcessandoId(item.id);
    const proximoStatus = item.status === 'pendente' ? 'comprado' : 'entregue';
    setFeedback({
      type: 'loading',
      text: proximoStatus === 'entregue' ? 'Registrando entrada no estoque...' : 'Marcando como comprado...',
    });

    try {
      if (!finalItemId) {
        const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
        const nomeLimpo = normalizeName(item.nome);
        const resBusca = await axios.get(`/api/itens/buscar?q=${encodeURIComponent(item.nome.trim().replace(/\s+/g, ' '))}`);
        const itemEncontrado = resBusca.data.find((i: any) => normalizeName(i.nome) === nomeLimpo);
        if (itemEncontrado) {
          finalItemId = itemEncontrado.id;
        }
      }

      if (proximoStatus === 'entregue' && finalItemId) {
        await axios.post('/api/movimentacoes/', {
          item_id: finalItemId,
          tipo: 'entrada',
          quantidade: item.quantidade,
          observacao: 'Compra Entregue (Lista de Compras)',
        });
      }

      await axios.put(`/api/lista-compras/${item.id}`, {
        nome: item.nome,
        quantidade: item.quantidade,
        item_id: finalItemId,
        status: proximoStatus,
        link: item.link,
      });

      await carregarLista();

      if (proximoStatus === 'entregue') {
        setFeedback({
          type: 'success',
          text: finalItemId
            ? `“${item.nome}” entregue e adicionado ao estoque.`
            : `“${item.nome}” foi marcado como entregue (sem cadastro no estoque).`,
        });
      } else {
        setFeedback({ type: 'success', text: `“${item.nome}” marcado como comprado. Aguardando entrega.` });
      }
    } catch (error: any) {
      console.error('Erro ao processar compra:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || error.message || 'Não foi possível concluir o processo.' });
    } finally {
      setProcessandoId(null);
    }
  };

  const excluirItem = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir da lista?')) return;
    setProcessandoId(id);
    setFeedback({ type: 'loading', text: 'Excluindo produto da lista...' });
    try {
      await axios.delete(`/api/lista-compras/${id}`);
      await carregarLista();
      setFeedback({ type: 'success', text: 'Produto excluído da lista de compras.' });
    } catch (error: any) {
      console.error('Erro ao excluir item:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || error.message || 'Não foi possível excluir o produto.' });
    } finally {
      setProcessandoId(null);
    }
  };

  const salvarEdicao = async (dados: { id: number; nome: string; quantidade: number; link: string | null }) => {
    setSalvandoEdicao(true);
    setFeedback({ type: 'loading', text: 'Salvando alterações do produto...' });
    try {
      await axios.put(`/api/lista-compras/${dados.id}`, {
        nome: dados.nome,
        quantidade: dados.quantidade,
        link: dados.link,
      });
      await carregarLista();
      setItemEmEdicao(null);
      setFeedback({ type: 'success', text: `“${dados.nome}” foi atualizado com sucesso.` });
    } catch (error: any) {
      console.error('Erro ao editar item da lista:', error);
      setFeedback({
        type: 'error',
        text: error.response?.data?.detail || 'Não foi possível salvar as alterações.',
      });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <>
      <div className="page-action-header">
        <div>
          <h1>Lista de Compras</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Gerencie pedidos de compra, acompanhe orçamentos e dê entrada rápida no estoque.
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => onNavigate('historico_compras')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 14 14"></polyline>
          </svg>
          Ver histórico de compras
        </button>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      <FormAdicionarCompra
        onAdicionado={(nome) => {
          carregarLista();
          setFeedback({ type: 'success', text: `Produto “${nome}” adicionado à lista de compras.` });
        }}
        onFeedback={(tipo, texto) => setFeedback({ type: tipo, text: texto })}
      />

      <div className="card section-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Produtos Pendentes para Compra</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {total === 1 ? '1 item aguardando' : `${total} itens aguardando`}
            </span>
          </div>
        </div>

        <div className="responsive-list">
          {carregando ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando lista de compras...</p>
          ) : lista.length === 0 ? (
            <div className="purchase-empty-state">
              <div className="purchase-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </div>
              <h3>Nenhum produto pendente</h3>
              <p>Você não possui itens pendentes no momento. Adicione um novo produto pelo formulário acima.</p>
            </div>
          ) : (
            lista.map((item) => (
              <CardItemCompra
                key={item.id}
                item={item}
                processando={processandoId === item.id}
                onAvancarStatus={avancarStatus}
                onAbrirOrcamentos={setItemParaOrcamento}
                onEditar={setItemEmEdicao}
                onExcluir={excluirItem}
                onFeedback={(tipo, texto) => setFeedback({ type: tipo, text: texto })}
              />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="inventory-pagination">
            <button
              className="btn btn-outline"
              disabled={page === 1}
              onClick={() => { setCarregando(true); setPage(page - 1); }}
            >
              Anterior
            </button>
            <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong></span>
            <button
              className="btn btn-outline"
              disabled={page === totalPages}
              onClick={() => { setCarregando(true); setPage(page + 1); }}
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {itemParaOrcamento && (
        <ModalOrcamento
          item={itemParaOrcamento}
          onClose={() => setItemParaOrcamento(null)}
          onSuccess={(msg) => setFeedback({ type: 'success', text: msg })}
          onError={(msg) => setFeedback({ type: 'error', text: msg })}
        />
      )}

      {itemEmEdicao && (
        <ModalEdicaoCompra
          item={itemEmEdicao}
          salvando={salvandoEdicao}
          onClose={() => setItemEmEdicao(null)}
          onSalvar={salvarEdicao}
        />
      )}
    </>
  );
}
