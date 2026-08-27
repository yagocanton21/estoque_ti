import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';
import { ModalOrcamento } from './ModalOrcamento';

interface ListaComprasItem {
  id: number;
  item_id: number | null;
  nome: string;
  quantidade: number;
  comprado: boolean;
  link: string | null;
}

export interface ListaComprasProps {
  onNavigate: (tab: string) => void;
}

export function ListaCompras({ onNavigate }: ListaComprasProps) {
  const [lista, setLista] = useState<ListaComprasItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [itemParaOrcamento, setItemParaOrcamento] = useState<ListaComprasItem | null>(null);

  const informarSucessoOrcamento = useCallback((mensagem: string) => {
    setFeedback({ type: 'success', text: mensagem });
  }, []);

  const informarErroOrcamento = useCallback((mensagem: string) => {
    setFeedback({ type: 'error', text: mensagem });
  }, []);

  const carregarLista = async (pagina: number = page) => {
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
  };

  useEffect(() => {
    const controller = new AbortController();
    const skip = (page - 1) * itemsPerPage;
    axios.get(
      `/api/lista-compras/pendentes/paginado?skip=${skip}&limit=${itemsPerPage}`,
      { signal: controller.signal },
    )
      .then((resposta) => {
        setLista(resposta.data.items);
        setTotal(resposta.data.total);
      })
      .catch((error) => {
        if (axios.isCancel(error)) return;
        console.error('Erro ao buscar lista de compras:', error);
        setFeedback({ type: 'error', text: 'Não foi possível carregar a lista de compras.' });
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, [page]);

  const adicionarAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setFeedback({ type: 'loading', text: 'Adicionando produto à lista...' });
    try {
      await axios.post('/api/lista-compras/', {
        nome,
        quantidade,
        item_id: null,
        link: link || null
      });
      setNome('');
      setQuantidade(1);
      setLink('');
      await carregarLista();
      setFeedback({ type: 'success', text: `Produto “${nome}” adicionado à lista de compras.` });
    } catch (error: any) {
      console.error('Erro ao adicionar item avulso:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || error.message || 'Não foi possível adicionar o produto.' });
    } finally {
      setSalvando(false);
    }
  };

  const marcarComprado = async (item: ListaComprasItem) => {
    setProcessandoId(item.id);
    setFeedback({ type: 'loading', text: 'Marcando produto como comprado...' });
    try {
      await axios.put(`/api/lista-compras/${item.id}`, {
        nome: item.nome,
        quantidade: item.quantidade,
        item_id: item.item_id,
        comprado: true,
        link: item.link
      });
      await carregarLista();
      setFeedback({ type: 'success', text: `“${item.nome}” foi marcado como comprado.` });
    } catch (error: any) {
      console.error('Erro ao marcar como comprado:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || error.message || 'Não foi possível atualizar o produto.' });
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

  const pendentes = lista;
  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', gap: '1rem' }}>
        <h1>Lista de Compras</h1>
        <button
          className="btn btn-outline"
          onClick={() => onNavigate('historico_compras')}
        >
          Ver histórico de compras
        </button>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Formulário Superior (Horizontal) */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>Adicionar Produto à Lista</h2>
        <form onSubmit={adicionarAvulso} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label htmlFor="compra-produto" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nome do produto</label>
            <input 
              id="compra-produto"
              type="text" 
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Teclado Mecânico"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              required
            />
          </div>
          <div style={{ flex: 2 }}>
            <label htmlFor="compra-link" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Link da loja (opcional)</label>
            <input 
              id="compra-link"
              type="url" 
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://loja..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="compra-quantidade" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Quantidade</label>
            <input 
              id="compra-quantidade"
              type="number" 
              value={quantidade}
              onChange={e => setQuantidade(Number(e.target.value))}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              required min="1"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={salvando}>
            {salvando ? 'Adicionando...' : 'Adicionar à Lista'}
          </button>
        </form>
      </div>

      {/* Lista Principal */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>Produtos Pendentes para Compra</h2>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {carregando ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando lista de compras...</p>
          ) : pendentes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Você não tem produtos pendentes de compra no momento.</p>
          ) : (
            pendentes.map(item => (
              <div key={item.id} className="purchase-item-row">
                <div className="purchase-item-info">
                  <h4 style={{ fontSize: '1.2rem' }}>{item.nome}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>Quantidade solicitada: {item.quantidade}</p>
                  {item.item_id && <span className="badge badge-danger" style={{ display: 'inline-block', marginTop: '8px' }}>Gerado Automaticamente por Falta de Estoque</span>}
                </div>
                <div className="purchase-item-actions">
                  {item.link && (
                    <button 
                      className="btn btn-outline purchase-item-action purchase-action-link" 
                      onClick={() => {
                        navigator.clipboard.writeText(item.link!);
                        setFeedback({ type: 'success', text: 'Link copiado.' });
                      }}
                      title="Copiar Link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Copiar Link
                    </button>
                  )}
                  <button className="btn btn-outline purchase-item-action purchase-action-budget" onClick={() => setItemParaOrcamento(item)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="8" y1="13" x2="16" y2="13"></line>
                      <line x1="8" y1="17" x2="16" y2="17"></line>
                    </svg>
                    Orçamentos
                  </button>
                  <button className="btn btn-outline purchase-item-action purchase-action-complete" onClick={() => marcarComprado(item)} disabled={processandoId === item.id}>
                    {processandoId === item.id ? 'Processando...' : 'Marcar Comprado'}
                  </button>
                  <button className="btn btn-outline purchase-item-action purchase-action-delete" onClick={() => excluirItem(item.id)} disabled={processandoId === item.id}>
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="inventory-pagination" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
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
          onSuccess={informarSucessoOrcamento}
          onError={informarErroOrcamento}
        />
      )}
    </>
  );
}
