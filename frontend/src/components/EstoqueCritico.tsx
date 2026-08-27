import { useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

interface ItemCritico {
  id: number;
  nome: string;
  marca: string | null;
  modelo: string | null;
  quantidade: number;
  quantidade_minima: number | null;
}

interface EstoqueCriticoProps {
  onNavigate: (tab: string) => void;
}

export function EstoqueCritico({ onNavigate }: EstoqueCriticoProps) {
  const [itens, setItens] = useState<ItemCritico[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const skip = (page - 1) * itemsPerPage;
    axios.get(`http://localhost:8000/itens/criticos/paginado?skip=${skip}&limit=${itemsPerPage}`)
      .then((resposta) => {
        setItens(resposta.data.items);
        setTotal(resposta.data.total);
      })
      .catch((error) => {
        console.error('Erro ao buscar estoque crítico:', error);
        setFeedback({ type: 'error', text: 'Não foi possível carregar os produtos que precisam de reposição.' });
      })
      .finally(() => setCarregando(false));
  }, [page]);

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <>
      <div className="critical-page-header">
        <div>
          <h1>Estoque Crítico</h1>
          <p>Produtos que já atingiram o limite mínimo e precisam de atenção.</p>
        </div>
        <button className="btn btn-outline" onClick={() => onNavigate('consulta_estoque')}>
          Ver estoque geral
        </button>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="critical-list-title">
        <span className="badge badge-danger">{total} {total === 1 ? 'produto crítico' : 'produtos críticos'}</span>
        <span>Os casos mais urgentes aparecem primeiro.</span>
      </div>

      {carregando ? (
        <div className="card critical-empty-state"><p>Carregando produtos...</p></div>
      ) : itens.length === 0 ? (
        <div className="card critical-empty-state">
          <span className="badge badge-success">Tudo normal</span>
          <h2>Nenhum produto em estoque crítico</h2>
          <p>Todos os produtos estão acima dos limites mínimos configurados.</p>
        </div>
      ) : (
        <div className="critical-list" role="table" aria-label="Produtos em estoque crítico">
          <div className="critical-list-header" role="row">
            <span role="columnheader">Produto</span>
            <span role="columnheader">Estoque atual</span>
            <span role="columnheader">Mínimo</span>
            <span role="columnheader">Situação</span>
          </div>

          {itens.map((item) => {
            const minimo = item.quantidade_minima ?? 0;
            const noLimite = item.quantidade === minimo;
            const faltam = Math.max(0, minimo - item.quantidade);

            return (
              <div key={item.id} className="critical-list-row" role="row">
                <div className="critical-product" role="cell">
                  <span className={`critical-status-dot ${noLimite ? 'critical-status-limit' : ''}`} aria-hidden="true"></span>
                  <div>
                    <strong>{item.nome}</strong>
                    <span>{[item.marca, item.modelo].filter(Boolean).join(' • ') || `Produto #${item.id}`}</span>
                  </div>
                </div>
                <div className="critical-list-cell" role="cell" data-label="Estoque atual">
                  <strong className={noLimite ? 'critical-value-limit' : 'critical-value-danger'}>{item.quantidade}</strong>
                </div>
                <div className="critical-list-cell" role="cell" data-label="Mínimo">
                  <strong>{minimo}</strong>
                </div>
                <div className="critical-list-cell" role="cell" data-label="Situação">
                  <span className={noLimite ? 'critical-label-limit' : 'critical-label-danger'}>
                    {noLimite ? 'No limite' : `Faltam ${faltam}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="inventory-pagination">
          <button className="btn btn-outline" disabled={page === 1} onClick={() => { setCarregando(true); setPage((pagina) => pagina - 1); }}>
            Anterior
          </button>
          <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong></span>
          <button className="btn btn-outline" disabled={page === totalPages} onClick={() => { setCarregando(true); setPage((pagina) => pagina + 1); }}>
            Próxima
          </button>
        </div>
      )}
    </>
  );
}
