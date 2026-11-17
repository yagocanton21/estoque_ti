import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';
import { ModalOrcamento } from './ModalOrcamento';
import type { ListaComprasItem } from './lista-compras/types';
import { CardItemCompra } from './lista-compras/CardItemCompra';
import { FormAdicionarCompra } from './lista-compras/FormAdicionarCompra';
import { ModalEdicaoCompra } from './lista-compras/ModalEdicaoCompra';
import { HistoricoPrecosItem } from './orcamento/HistoricoPrecosItem';
import { formatarMoeda } from '../utils/formatters';
import './lista-compras/ListaCompras.css';

export type { ListaComprasItem };

interface ListaComprasProps {
  onNavigate: (tab: string) => void;
}

interface MetricasCompras {
  total_pendentes: number;
  total_comprados: number;
  total_entregues: number;
  valor_total_estimado: number;
}

export function ListaCompras({ onNavigate }: ListaComprasProps) {
  const [abaPrincipal, setAbaPrincipal] = useState<'itens' | 'comparador'>('itens');
  const [lista, setLista] = useState<ListaComprasItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [metricas, setMetricas] = useState<MetricasCompras | null>(null);

  // Filtros na lista de compras
  const [buscaLista, setBuscaLista] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'comprado'>('todos');

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

  const carregarMetricas = useCallback(async () => {
    try {
      const res = await axios.get<MetricasCompras>('/api/lista-compras/metricas');
      setMetricas(res.data);
    } catch (err) {
      console.warn('Erro ao carregar métricas da lista de compras:', err);
    }
  }, []);

  const carregarLista = useCallback(async (pagina: number = page) => {
    setCarregando(true);
    try {
      const skip = (pagina - 1) * itemsPerPage;
      const res = await axios.get(`/api/lista-compras/pendentes/paginado?skip=${skip}&limit=${itemsPerPage}`);
      setLista(res.data.items);
      setTotal(res.data.total);
      carregarMetricas();
    } catch (error) {
      console.error('Erro ao buscar lista de compras:', error);
      setFeedback({ type: 'error', text: 'Não foi possível carregar a lista de compras.' });
    } finally {
      setCarregando(false);
    }
  }, [page, itemsPerPage, carregarMetricas]);

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

    carregarMetricas();

    return () => {
      ativo = false;
    };
  }, [page, itemsPerPage, carregarMetricas]);

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

  // Filtragem dos itens exibidos
  const itensFiltrados = lista.filter((item) => {
    if (filtroStatus !== 'todos' && item.status !== filtroStatus) {
      return false;
    }
    if (buscaLista.trim()) {
      const termo = buscaLista.toLowerCase();
      const bateNome = item.nome.toLowerCase().includes(termo);
      const bateFornecedor = item.orcamentos?.some((o) =>
        o.fornecedor.toLowerCase().includes(termo)
      );
      return bateNome || bateFornecedor;
    }
    return true;
  });

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <>
      <div className="page-action-header">
        <div>
          <h1>Lista de Compras & Orçamentos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Acompanhe pedidos, compare preços históricos e gerencie cotações de forma inteligente.
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
          Histórico de compras entregues
        </button>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Cards de Métricas no Topo */}
      {metricas && (
        <div className="purchase-metrics-grid">
          <div className="purchase-metric-card">
            <div className="metric-icon-wrap pending">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 14 14"></polyline>
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-label">Pendentes para Cotar / Comprar</span>
              <strong className="metric-number">{metricas.total_pendentes}</strong>
            </div>
          </div>

          <div className="purchase-metric-card">
            <div className="metric-icon-wrap bought">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-label">Aguardando Entrega</span>
              <strong className="metric-number">{metricas.total_comprados}</strong>
            </div>
          </div>

          <div className="purchase-metric-card">
            <div className="metric-icon-wrap estimated">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-label">Valor Total Estimado</span>
              <strong className="metric-number">{formatarMoeda(metricas.valor_total_estimado)}</strong>
            </div>
          </div>

          <div className="purchase-metric-card">
            <div className="metric-icon-wrap delivered">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-label">Total Já Entregues</span>
              <strong className="metric-number">{metricas.total_entregues}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Abas de Navegação */}
      <div className="purchase-nav-tabs">
        <button
          type="button"
          className={`purchase-nav-tab ${abaPrincipal === 'itens' ? 'active' : ''}`}
          onClick={() => setAbaPrincipal('itens')}
        >
          <span>Itens para Compra</span>
          {total > 0 && <span className="purchase-tab-badge">{total}</span>}
        </button>

        <button
          type="button"
          className={`purchase-nav-tab ${abaPrincipal === 'comparador' ? 'active' : ''}`}
          onClick={() => setAbaPrincipal('comparador')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"></path>
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
          </svg>
          <span>Histórico & Comparador de Preços</span>
        </button>
      </div>

      {abaPrincipal === 'itens' ? (
        <>
          <FormAdicionarCompra
            onAdicionado={(nome) => {
              carregarLista();
              setFeedback({ type: 'success', text: `Produto “${nome}” adicionado à lista de compras.` });
            }}
            onFeedback={(tipo, texto) => setFeedback({ type: tipo, text: texto })}
          />

          <div className="card section-card">
            {/* Toolbar com Pesquisa e Filtros */}
            <div className="purchase-toolbar">
              <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
                <input
                  type="text"
                  value={buscaLista}
                  onChange={(e) => setBuscaLista(e.target.value)}
                  placeholder="Filtrar por produto ou fornecedor..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(0,0,0,0.2)',
                    color: 'white',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div className="purchase-filter-group">
                <button
                  type="button"
                  className={`status-filter-pill ${filtroStatus === 'todos' ? 'active' : ''}`}
                  onClick={() => setFiltroStatus('todos')}
                >
                  Todos ({total})
                </button>
                <button
                  type="button"
                  className={`status-filter-pill ${filtroStatus === 'pendente' ? 'active' : ''}`}
                  onClick={() => setFiltroStatus('pendente')}
                >
                  Pendentes ({metricas?.total_pendentes ?? 0})
                </button>
                <button
                  type="button"
                  className={`status-filter-pill ${filtroStatus === 'comprado' ? 'active' : ''}`}
                  onClick={() => setFiltroStatus('comprado')}
                >
                  A caminho ({metricas?.total_comprados ?? 0})
                </button>
              </div>
            </div>

            <div className="responsive-list">
              {carregando ? (
                <p style={{ color: 'var(--text-muted)' }}>Carregando lista de compras...</p>
              ) : itensFiltrados.length === 0 ? (
                <div className="purchase-empty-state">
                  <div className="purchase-empty-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                  </div>
                  <h3>
                    {buscaLista.trim() || filtroStatus !== 'todos'
                      ? 'Nenhum item encontrado para os filtros selecionados'
                      : 'Nenhum produto pendente'}
                  </h3>
                  <p>
                    {buscaLista.trim() || filtroStatus !== 'todos'
                      ? 'Tente ajustar os termos da pesquisa ou alterar o filtro de status.'
                      : 'Você não possui itens pendentes no momento. Adicione um novo produto pelo formulário acima.'}
                  </p>
                </div>
              ) : (
                itensFiltrados.map((item) => (
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

            {totalPages > 1 && !buscaLista && filtroStatus === 'todos' && (
              <div className="inventory-pagination">
                <button
                  className="btn btn-outline"
                  disabled={page === 1}
                  onClick={() => { setCarregando(true); setPage(page - 1); }}
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {totalPages}
                </span>
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
        </>
      ) : (
        <div className="card section-card">
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0 }}>Histórico de Preços & Cotações</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              Consulte e compare preços praticados em compras anteriores para qualquer item, com ou sem cadastro no estoque.
            </p>
          </div>
          <HistoricoPrecosItem mostrarBusca={true} compacto={false} />
        </div>
      )}

      {itemParaOrcamento && (
        <ModalOrcamento
          item={itemParaOrcamento}
          onClose={() => setItemParaOrcamento(null)}
          onSuccess={(msg) => {
            setFeedback({ type: 'success', text: msg });
            carregarLista();
          }}
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
