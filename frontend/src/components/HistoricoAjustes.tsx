import { useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

interface Ajuste {
  id: number;
  item_nome: string;
  quantidade_anterior: number;
  quantidade_resultante: number;
  motivo: string;
  data: string;
}

interface HistoricoAjustesProps {
  onNavigate: (tab: string) => void;
}

const ITENS_POR_PAGINA = 5;

export function HistoricoAjustes({ onNavigate }: HistoricoAjustesProps) {
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const parametros = new URLSearchParams({
        skip: String((pagina - 1) * ITENS_POR_PAGINA),
        limit: String(ITENS_POR_PAGINA),
        tipo: 'ajuste',
      });
      if (busca.trim()) parametros.set('q', busca.trim());

      axios.get(`/api/movimentacoes/historico/paginado?${parametros}`)
        .then((resposta) => {
          setAjustes(resposta.data.items);
          setTotal(resposta.data.total);
        })
        .catch((error) => {
          console.error('Erro ao carregar histórico de ajustes:', error);
          setFeedback({ type: 'error', text: 'Não foi possível carregar o histórico de ajustes.' });
        })
        .finally(() => setCarregando(false));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [pagina, busca]);

  const totalPaginas = Math.ceil(total / ITENS_POR_PAGINA);
  const formatarData = (valor: string) => {
    const possuiFuso = valor.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(valor);
    return new Date(possuiFuso ? valor : `${valor}Z`).toLocaleString('pt-BR');
  };

  return (
    <div className="movement-history-page">
      <div className="inventory-page-header">
        <div>
          <h1>Histórico de Ajustes</h1>
          <p>Confira todas as correções de saldo e suas justificativas.</p>
        </div>
        <button className="btn btn-outline" onClick={() => onNavigate('movimentacoes')}>
          Fazer novo ajuste
        </button>
      </div>

      <div className="inventory-search loans-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={busca}
          onChange={(evento) => { setCarregando(true); setBusca(evento.target.value); setPagina(1); }}
          placeholder="Buscar produto ou motivo..."
          aria-label="Buscar no histórico de ajustes"
        />
        {busca && <button type="button" onClick={() => { setCarregando(true); setBusca(''); setPagina(1); }}>Limpar</button>}
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      {carregando ? (
        <div className="card inventory-empty"><p>Carregando ajustes...</p></div>
      ) : ajustes.length === 0 ? (
        <div className="card inventory-empty">
          <p>{busca ? 'Nenhum ajuste encontrado para essa busca.' : 'Nenhum ajuste de estoque foi registrado ainda.'}</p>
        </div>
      ) : (
        <div className="movement-history-list">
          {ajustes.map((ajuste) => {
            const aumentou = ajuste.quantidade_resultante > ajuste.quantidade_anterior;
            return (
              <article key={ajuste.id} className="movement-history-row">
                <div className="movement-history-product">
                  <strong>{ajuste.item_nome}</strong>
                  <span>{formatarData(ajuste.data)}</span>
                </div>
                <div className="movement-history-balance">
                  <span>Saldo</span>
                  <strong>{ajuste.quantidade_anterior} → {ajuste.quantidade_resultante}</strong>
                </div>
                <span className={aumentou ? 'badge badge-success' : 'badge badge-danger'}>
                  {aumentou ? 'Aumentou' : 'Diminuiu'}
                </span>
                <div className="movement-history-reason">
                  <span>Motivo</span>
                  <p>{ajuste.motivo}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="inventory-pagination">
          <button className="btn btn-outline" disabled={pagina === 1} onClick={() => { setCarregando(true); setPagina((valor) => valor - 1); }}>Anterior</button>
          <span>Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong></span>
          <button className="btn btn-outline" disabled={pagina === totalPaginas} onClick={() => { setCarregando(true); setPagina((valor) => valor + 1); }}>Próxima</button>
        </div>
      )}
    </div>
  );
}
