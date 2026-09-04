import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';
import { ModalOrcamento } from './ModalOrcamento';

interface ListaComprasItem {
  id: number;
  item_id: number | null;
  nome: string;
  quantidade: number;
  status: string;
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

  // Estados para o combobox (auto-completar)
  const [sugestoes, setSugestoes] = useState<{id: number, nome: string}[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [itemIdSelecionado, setItemIdSelecionado] = useState<number | null>(null);
  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [itemParaOrcamento, setItemParaOrcamento] = useState<ListaComprasItem | null>(null);
  const [itemEmEdicao, setItemEmEdicao] = useState<ListaComprasItem | null>(null);

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

  // Debounce e busca de sugestões
  useEffect(() => {
    if (!nome.trim() || itemIdSelecionado) {
      setSugestoes([]);
      setMostrarSugestoes(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(nome.trim().replace(/\s+/g, ' '));
        const res = await axios.get(`/api/itens/buscar?q=${query}&limit=5`);
        setSugestoes(res.data);
        setMostrarSugestoes(res.data.length > 0);
      } catch (err) {
        console.error('Erro ao buscar sugestões', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [nome, itemIdSelecionado]);

  const adicionarAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setFeedback({ type: 'loading', text: 'Adicionando produto à lista...' });
    try {
      await axios.post('/api/lista-compras/', {
        nome: nome.trim().replace(/\s+/g, ' '),
        quantidade,
        item_id: itemIdSelecionado,
        link: link || null
      });
      setNome('');
      setQuantidade(1);
      setItemIdSelecionado(null);
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

  const avancarStatus = async (item: ListaComprasItem) => {
    let finalItemId = item.item_id;

    setProcessandoId(item.id);
    const proximoStatus = item.status === 'pendente' ? 'comprado' : 'entregue';
    setFeedback({ type: 'loading', text: proximoStatus === 'entregue' ? 'Registrando entrada no estoque...' : 'Marcando como comprado...' });

    try {
      if (!finalItemId) {
        // Remove espaços extras no meio e nas pontas, e deixa minúsculo
        const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
        const nomeLimpo = normalizeName(item.nome);

        // Busca com o nome já sem duplos espaços, pro backend conseguir achar a palavra
        const resBusca = await axios.get(`/api/itens/buscar?q=${encodeURIComponent(item.nome.trim().replace(/\s+/g, ' '))}`);
        
        const itemEncontrado = resBusca.data.find((i: any) => normalizeName(i.nome) === nomeLimpo);
        if (itemEncontrado) {
          finalItemId = itemEncontrado.id;
        }
      }

      // Se for marcar como entregue, adiciona a movimentação de entrada no estoque
      if (proximoStatus === 'entregue' && finalItemId) {
        await axios.post('/api/movimentacoes/', {
          item_id: finalItemId,
          tipo: 'entrada',
          quantidade: item.quantidade,
          observacao: 'Compra Entregue (Lista de Compras)'
        });
      }

      await axios.put(`/api/lista-compras/${item.id}`, {
        nome: item.nome,
        quantidade: item.quantidade,
        item_id: finalItemId,
        status: proximoStatus,
        link: item.link
      });

      await carregarLista();
      
      if (proximoStatus === 'entregue') {
        if (finalItemId) {
          setFeedback({ type: 'success', text: `“${item.nome}” entregue e adicionado ao estoque.` });
        } else {
          setFeedback({ type: 'success', text: `“${item.nome}” foi marcado como entregue (sem cadastro no estoque).` });
        }
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

  const salvarEdicao = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!itemEmEdicao || processandoId !== null) return;

    const nomeEditado = itemEmEdicao.nome.trim();
    if (!nomeEditado) {
      setFeedback({ type: 'error', text: 'Informe o nome do produto.' });
      return;
    }

    setProcessandoId(itemEmEdicao.id);
    setFeedback({ type: 'loading', text: 'Salvando alterações do produto...' });
    try {
      await axios.put(`/api/lista-compras/${itemEmEdicao.id}`, {
        nome: nomeEditado,
        quantidade: itemEmEdicao.quantidade,
        link: itemEmEdicao.link?.trim() || null,
      });
      await carregarLista();
      setItemEmEdicao(null);
      setFeedback({ type: 'success', text: `“${nomeEditado}” foi atualizado com sucesso.` });
    } catch (error: any) {
      console.error('Erro ao editar item da lista:', error);
      setFeedback({
        type: 'error',
        text: error.response?.data?.detail || 'Não foi possível salvar as alterações.',
      });
    } finally {
      setProcessandoId(null);
    }
  };

  const pendentes = lista;
  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <>
      <div className="page-action-header">
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
      <div className="card section-card" style={{ zIndex: 50, position: 'relative' }}>
        <h2>Adicionar Produto à Lista</h2>
        <form onSubmit={adicionarAvulso} className="responsive-inline-form">
          <div className="responsive-field" style={{ position: 'relative' }}>
            <label htmlFor="compra-produto" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nome do produto</label>
            <input 
              id="compra-produto"
              type="text" 
              value={nome}
              onChange={e => {
                setNome(e.target.value);
                if (itemIdSelecionado) setItemIdSelecionado(null);
              }}
              onFocus={() => { if (sugestoes.length > 0) setMostrarSugestoes(true); }}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
              placeholder="Ex: Teclado Mecânico"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              required
            />
            {mostrarSugestoes && (
              <ul style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--bg-dark)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                marginTop: '4px',
                listStyle: 'none',
                padding: '0.5rem 0',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 9999,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                {sugestoes.map(s => (
                  <li 
                    key={s.id}
                    onClick={() => {
                      setNome(s.nome);
                      setItemIdSelecionado(s.id);
                      setMostrarSugestoes(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      color: 'white',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {s.nome}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="responsive-field">
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
          <div className="responsive-field responsive-field-quantity">
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
          <button type="submit" className="btn btn-primary responsive-form-submit" disabled={salvando}>
            {salvando ? 'Adicionando...' : 'Adicionar à Lista'}
          </button>
        </form>
      </div>

      {/* Lista Principal */}
      <div className="card section-card">
        <h2>Produtos Pendentes para Compra</h2>
        <div className="responsive-list">
          {carregando ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando lista de compras...</p>
          ) : pendentes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Você não tem produtos pendentes de compra no momento.</p>
          ) : (
            pendentes.map(item => (
              <div key={item.id} className="purchase-item-row">
                <div className="purchase-item-info">
                  <div className="purchase-item-heading">
                    <h4 style={{ margin: 0, lineHeight: '1.5' }}>
                      {item.nome}
                      {item.item_id && (
                        <span
                          className="badge badge-success"
                          style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', marginLeft: '0.5rem', verticalAlign: 'middle', display: 'inline-block' }}
                          title="Este item está vinculado corretamente ao estoque"
                        >
                          Vinculado
                        </span>
                      )}
                      <span
                        className={`badge ${item.status === 'comprado' ? 'badge-primary' : 'badge-outline'}`}
                        style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', marginLeft: '0.5rem', verticalAlign: 'middle', display: 'inline-block', textTransform: 'uppercase' }}
                      >
                        {item.status}
                      </span>
                    </h4>
                  </div>
                </div>
                <div className="purchase-item-quantity" style={{ minWidth: '65px', textAlign: 'center' }}>
                  {item.quantidade} un.
                </div>
                <div className="purchase-item-actions">
                  <button
                    className="btn btn-outline purchase-item-action purchase-action-edit btn-icon"
                    onClick={() => setItemEmEdicao({ ...item })}
                    disabled={processandoId === item.id}
                    title="Editar produto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                  {item.link && (
                    <button 
                      className="btn btn-outline purchase-item-action purchase-action-link btn-icon" 
                      onClick={() => {
                        navigator.clipboard.writeText(item.link!);
                        setFeedback({ type: 'success', text: 'Link copiado.' });
                      }}
                      title="Copiar Link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  )}
                  <button className="btn btn-outline purchase-item-action purchase-action-budget btn-icon" onClick={() => setItemParaOrcamento(item)} title="Gerenciar Orçamentos">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="8" y1="13" x2="16" y2="13"></line>
                      <line x1="8" y1="17" x2="16" y2="17"></line>
                    </svg>
                  </button>
                  <button 
                    className={`btn btn-outline purchase-item-action purchase-action-complete btn-icon ${item.status === 'pendente' ? '' : 'status-entregue'}`} 
                    onClick={() => avancarStatus(item)} 
                    disabled={processandoId === item.id}
                    title={item.status === 'pendente' ? 'Marcar Comprado' : 'Marcar Entregue'}
                  >
                    {item.status === 'pendente' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    )}
                  </button>
                  <button className="btn btn-outline purchase-item-action purchase-action-delete btn-icon" onClick={() => excluirItem(item.id)} disabled={processandoId === item.id} title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>
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
          onSuccess={informarSucessoOrcamento}
          onError={informarErroOrcamento}
        />
      )}
      {itemEmEdicao && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setItemEmEdicao(null)}>
          <section
            className="edit-modal purchase-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-purchase-item-title"
            onMouseDown={(evento) => evento.stopPropagation()}
          >
            <div className="edit-modal-header">
              <div>
                <span>Editando item pendente #{itemEmEdicao.id}</span>
                <h2 id="edit-purchase-item-title">Editar produto da lista</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setItemEmEdicao(null)}
                aria-label="Fechar edição"
              >
                ×
              </button>
            </div>

            <form onSubmit={salvarEdicao} className="simple-form">
              <label className="form-field" htmlFor="editar-compra-produto">
                <span>Nome do produto</span>
                <input
                  id="editar-compra-produto"
                  type="text"
                  value={itemEmEdicao.nome}
                  onChange={(evento) => setItemEmEdicao({ ...itemEmEdicao, nome: evento.target.value })}
                  required
                  autoFocus
                />
              </label>

              <label className="form-field" htmlFor="editar-compra-quantidade">
                <span>Quantidade</span>
                <input
                  id="editar-compra-quantidade"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={itemEmEdicao.quantidade}
                  onChange={(evento) => setItemEmEdicao({ ...itemEmEdicao, quantidade: Number(evento.target.value) })}
                  required
                />
              </label>

              <label className="form-field" htmlFor="editar-compra-link">
                <span>Link da loja (opcional)</span>
                <input
                  id="editar-compra-link"
                  type="url"
                  value={itemEmEdicao.link || ''}
                  onChange={(evento) => setItemEmEdicao({ ...itemEmEdicao, link: evento.target.value })}
                  placeholder="https://loja..."
                />
              </label>

              <div className="edit-modal-actions purchase-edit-actions">
                <button type="button" className="btn btn-outline" onClick={() => setItemEmEdicao(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={processandoId === itemEmEdicao.id}>
                  {processandoId === itemEmEdicao.id ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
