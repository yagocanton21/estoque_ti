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
  const itemsPerPage = 5;

  useEffect(() => {
    axios.get('http://localhost:8000/lista-compras/')
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
      const res = await axios.get('http://localhost:8000/lista-compras/');
      setLista(res.data);
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
      await axios.delete(`http://localhost:8000/lista-compras/${id}`);
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
  const totalPages = Math.ceil(concluidos.length / itemsPerPage);
  
  // Apply pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConcluidos = concluidos.slice(startIndex, startIndex + itemsPerPage);

  const nextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return 'Data desconhecida';
    const data = new Date(dataStr + 'Z'); // Z garante que ele trate como UTC para não ter bug de fuso se já vier do backend
    return data.toLocaleString('pt-BR');
  };

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

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>Compras Concluídas</h2>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {carregando ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando histórico...</p>
          ) : concluidos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma compra foi concluída ainda.</p>
          ) : (
            paginatedConcluidos.map(item => (
              <div key={item.id} className="flex justify-between items-center" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', opacity: 0.8 }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', textDecoration: 'line-through' }}>{item.nome}</h4>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Qtde: {item.quantidade}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Comprado em: {formatarData(item.data_compra)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {item.link && (
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--glass-border)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }} 
                      onClick={() => {
                        navigator.clipboard.writeText(item.link!);
                        setFeedback({ type: 'success', text: 'Link copiado.' });
                      }}
                      title="Copiar Link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Copiar
                    </button>
                  )}
                  <span className="badge badge-success">Concluído</span>
                  <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }} onClick={() => excluirItem(item.id)} disabled={excluindoId === item.id}>
                    {excluindoId === item.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            ))
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
