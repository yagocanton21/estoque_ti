import { useState, useEffect } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

interface ListaComprasItem {
  id: number;
  item_id: number | null;
  nome: string;
  quantidade: number;
  comprado: boolean;
  link: string | null;
  data_compra: string | null;
  tem_pdf: boolean;
  pdf_nome: string | null;
  pdf_atualizado_em: string | null;
  orcamentos: Array<{
    id: number;
    fornecedor: string;
    preco_unitario: number;
    frete: number;
    selecionado: boolean;
  }>;
}

interface HistoricoComprasProps {
  onNavigate: (tab: string) => void;
}

export function HistoricoCompras({ onNavigate }: HistoricoComprasProps) {
  const [lista, setLista] = useState<ListaComprasItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busca, setBusca] = useState('');
  const itemsPerPage = 5;

  useEffect(() => {
    axios.get('/api/lista-compras/')
      .then((resposta) => setLista(resposta.data))
      .catch((error) => {
        console.error('Erro ao buscar histórico de compras:', error);
        setFeedback({ type: 'error', text: 'Não foi possível carregar o histórico de compras.' });
      })
      .finally(() => setCarregando(false));
  }, []);

  const carregarLista = async () => {
    setCarregando(true);
    try {
      const res = await axios.get('/api/lista-compras/');
      const dados: ListaComprasItem[] = res.data;
      setLista(dados);
      const totalConcluidos = dados.filter(item => item.comprado).length;
      const ultimaPaginaValida = Math.max(1, Math.ceil(totalConcluidos / itemsPerPage));
      setCurrentPage(paginaAtual => Math.min(paginaAtual, ultimaPaginaValida));
    } catch (error) {
      console.error('Erro ao buscar lista de compras:', error);
      setFeedback({ type: 'error', text: 'Não foi possível atualizar o histórico de compras.' });
    } finally {
      setCarregando(false);
    }
  };

  const excluirItem = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir da lista?')) return;
    setExcluindoId(id);
    setFeedback({ type: 'loading', text: 'Excluindo registro do histórico...' });
    try {
      await axios.delete(`/api/lista-compras/${id}`);
      await carregarLista();
      setFeedback({ type: 'success', text: 'Registro excluído do histórico.' });
    } catch (error: any) {
      console.error('Erro ao excluir item:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || error.message || 'Não foi possível excluir o registro.' });
    } finally {
      setExcluindoId(null);
    }
  };

  const concluidos = lista.filter(i => i.comprado);

  // Apply search filter
  const termoBusca = busca.trim().toLowerCase();
  const concluidosFiltrados = termoBusca
    ? concluidos.filter(item => {
        const orcSelecionado = item.orcamentos.find(o => o.selecionado);
        return (
          item.nome.toLowerCase().includes(termoBusca) ||
          (orcSelecionado?.fornecedor || '').toLowerCase().includes(termoBusca)
        );
      })
    : concluidos;

  const totalPages = Math.ceil(concluidosFiltrados.length / itemsPerPage);
  
  // Apply pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConcluidos = concluidosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  const nextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return 'Data desconhecida';
    const possuiFuso = /(?:Z|[+-]\d{2}:\d{2})$/.test(dataStr);
    const data = new Date(possuiFuso ? dataStr : `${dataStr}Z`);
    return data.toLocaleString('pt-BR');
  };

  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
        <h1>Histórico de Compras</h1>
        <button 
          className="btn btn-outline" 
          onClick={() => onNavigate('compras')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Voltar para Lista
        </button>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="card purchase-history-section" style={{ marginTop: '2rem' }}>
        <div className="purchase-history-heading">
          <div>
            <h2>Compras Concluídas</h2>
            <p>Consulte os dados da compra e o PDF do orçamento utilizado.</p>
          </div>
          <span>{concluidosFiltrados.length} {concluidosFiltrados.length === 1 ? 'registro' : 'registros'}</span>
        </div>

        <div className="inventory-search" style={{ marginTop: '1.25rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="search"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Pesquisar por nome do item ou fornecedor..."
            aria-label="Pesquisar no histórico de compras"
          />
          {busca && (
            <button type="button" onClick={() => { setBusca(''); setCurrentPage(1); }}>
              Limpar
            </button>
          )}
        </div>
        <div className="purchase-history-list">
          {carregando ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando histórico...</p>
          ) : concluidosFiltrados.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>{busca ? 'Nenhuma compra encontrada para essa pesquisa.' : 'Nenhuma compra foi concluída ainda.'}</p>
          ) : (
            paginatedConcluidos.map(item => {
              const orcamentoSelecionado = item.orcamentos.find(orcamento => orcamento.selecionado);
              const totalSelecionado = orcamentoSelecionado
                ? (orcamentoSelecionado.preco_unitario * item.quantidade) + orcamentoSelecionado.frete
                : null;

              return (
                <article key={item.id} className="purchase-history-card">
                  <div className="purchase-history-main">
                    <div className="purchase-history-title">
                      <span className="purchase-history-icon" aria-hidden="true">✓</span>
                      <div>
                        <h3>{item.nome}</h3>
                        <span>Compra concluída em {formatarData(item.data_compra)}</span>
                      </div>
                    </div>

                    <div className="purchase-history-details">
                      <div>
                        <span>Quantidade</span>
                        <strong>{item.quantidade}</strong>
                      </div>
                      <div>
                        <span>Fornecedor escolhido</span>
                        <strong>{orcamentoSelecionado?.fornecedor || 'Não informado'}</strong>
                      </div>
                      <div>
                        <span>Valor do orçamento</span>
                        <strong>{totalSelecionado === null ? 'Não informado' : formatarMoeda(totalSelecionado)}</strong>
                      </div>
                      <div>
                        <span>Documento</span>
                        <strong className={item.tem_pdf ? 'pdf-available' : 'pdf-missing'}>
                          {item.tem_pdf ? 'PDF disponível' : 'PDF não salvo'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="purchase-history-actions">
                    {item.tem_pdf && (
                      <a
                        className="btn btn-primary"
                        href={`/api/lista-compras/${item.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        title={item.pdf_nome || 'Abrir PDF do orçamento'}
                      >
                        Ver PDF
                      </a>
                    )}
                    {item.link && (
                      <a className="btn btn-outline" href={item.link} target="_blank" rel="noreferrer">
                        Abrir loja
                      </a>
                    )}
                    <button
                      className="btn btn-outline purchase-history-delete purchase-history-delete-icon"
                      onClick={() => excluirItem(item.id)}
                      disabled={excluindoId === item.id}
                      aria-label={`Excluir registro de ${item.nome}`}
                      title="Excluir registro"
                    >
                      {excluindoId === item.id ? (
                        <span className="loading-spinner" aria-hidden="true"></span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-1 14H6L5 6"></path>
                          <path d="M10 11v6M14 11v6"></path>
                          <path d="M9 6V4h6v2"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
        
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-outline" onClick={prevPage} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem' }}>
              Anterior
            </button>
            <span style={{ color: 'var(--text-muted)' }}>Página {currentPage} de {totalPages}</span>
            <button className="btn btn-outline" onClick={nextPage} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem' }}>
              Próxima
            </button>
          </div>
        )}
      </div>
    </>
  );
}
