import { useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

interface EmprestimoItem {
  id: number;
  item_nome: string;
  pessoa: string;
  quantidade: number;
  data_emprestimo: string;
  devolvido: boolean;
  data_devolucao: string | null;
}

interface HistoricoDevolucoesProps {
  onNavigate: (tab: string) => void;
}

export function HistoricoDevolucoes({ onNavigate }: HistoricoDevolucoesProps) {
  const [emprestimos, setEmprestimos] = useState<EmprestimoItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const itemsPerPage = 5;

  useEffect(() => {
    const carregarHistorico = async () => {
      try {
        const resposta = await axios.get('/api/emprestimos/');
        setEmprestimos(resposta.data);
      } catch (error) {
        console.error('Erro ao buscar histórico de devoluções:', error);
        setFeedback({ type: 'error', text: 'Não foi possível carregar o histórico de devoluções.' });
      } finally {
        setCarregando(false);
      }
    };

    carregarHistorico();
  }, []);

  const historico = emprestimos.filter((emprestimo) => emprestimo.devolvido);
  const totalPages = Math.ceil(historico.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginaAtual = historico.slice(startIndex, startIndex + itemsPerPage);

  const formatarData = (data: string | null) => {
    if (!data) return 'N/A';
    return new Date(`${data}Z`).toLocaleString('pt-BR');
  };

  return (
    <>
      <div className="page-action-header">
        <h1>Histórico de Devoluções</h1>
        <button
          className="btn btn-outline"
          onClick={() => onNavigate('emprestimos')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Voltar para Empréstimos
        </button>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="card section-card">
        <h2>Produtos e Equipamentos Devolvidos</h2>
        <div className="responsive-list compact-list">
          {carregando ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando histórico...</p>
          ) : historico.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma devolução foi registrada ainda.</p>
          ) : (
            paginaAtual.map((emprestimo) => (
              <div key={emprestimo.id} className="responsive-list-row returned-list-row">
                <div className="responsive-list-main">
                  <h4 style={{ fontSize: '1.1rem' }}>{emprestimo.item_nome}</h4>
                  <div className="responsive-list-meta">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Pessoa: {emprestimo.pessoa}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Qtde: {emprestimo.quantidade}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Retirado em: {formatarData(emprestimo.data_emprestimo)}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Devolvido em: {formatarData(emprestimo.data_devolucao)}</p>
                  </div>
                </div>
                <span className="badge badge-success">Devolvido</span>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="inventory-pagination">
            <button
              className="btn btn-outline"
              onClick={() => setCurrentPage((pagina) => Math.max(pagina - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: '0.5rem 1rem' }}
            >
              Anterior
            </button>
            <span style={{ color: 'var(--text-muted)' }}>Página {currentPage} de {totalPages}</span>
            <button
              className="btn btn-outline"
              onClick={() => setCurrentPage((pagina) => Math.min(pagina + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ padding: '0.5rem 1rem' }}
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </>
  );
}
