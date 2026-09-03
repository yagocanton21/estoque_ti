import { useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

type TipoMovimentacao = 'entrada' | 'saida';
type FiltroMovimentacao = 'entrada_saida' | TipoMovimentacao;

interface MovimentacaoEstoque {
  id: number;
  item_nome: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  quantidade_anterior: number | null;
  quantidade_resultante: number | null;
  data: string;
  entregue_para: string | null;
  observacao: string | null;
}

interface HistoricoMovimentacoesProps {
  onNavigate: (tab: string) => void;
}

const ITENS_POR_PAGINA = 6;

export function HistoricoMovimentacoes({ onNavigate }: HistoricoMovimentacoesProps) {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroMovimentacao>('entrada_saida');
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const parametros = new URLSearchParams({
        skip: String((pagina - 1) * ITENS_POR_PAGINA),
        limit: String(ITENS_POR_PAGINA),
        tipo: filtro,
      });
      if (busca.trim()) parametros.set('q', busca.trim());

      axios.get(`/api/movimentacoes/historico/paginado?${parametros}`, { signal: controller.signal })
        .then((resposta) => {
          setMovimentacoes(resposta.data.items);
          setTotal(resposta.data.total);
        })
        .catch((error) => {
          if (axios.isCancel(error)) return;
          console.error('Erro ao carregar histórico de entradas e saídas:', error);
          setFeedback({ type: 'error', text: 'Não foi possível carregar o histórico de entradas e saídas.' });
        })
        .finally(() => {
          if (!controller.signal.aborted) setCarregando(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [pagina, busca, filtro]);

  const totalPaginas = Math.ceil(total / ITENS_POR_PAGINA);

  const formatarData = (valor: string) => {
    const possuiFuso = valor.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(valor);
    return new Date(possuiFuso ? valor : `${valor}Z`).toLocaleString('pt-BR');
  };

  const alterarFiltro = (novoFiltro: FiltroMovimentacao) => {
    setCarregando(true);
    setFiltro(novoFiltro);
    setPagina(1);
  };

  return (
    <div className="movement-history-page">
      <div className="inventory-page-header">
        <div>
          <h1>Entradas e Saídas</h1>
          <p>Acompanhe quando cada produto chegou, foi utilizado e qual saldo restou.</p>
        </div>
        <button className="btn btn-outline" onClick={() => onNavigate('movimentacoes')}>
          Registrar movimentação
        </button>
      </div>

      <div className="movement-history-toolbar">
        <div className="inventory-search loans-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => {
              setCarregando(true);
              setBusca(evento.target.value);
              setPagina(1);
            }}
            placeholder="Buscar produto..."
            aria-label="Buscar no histórico de entradas e saídas"
          />
          {busca && (
            <button type="button" onClick={() => { setCarregando(true); setBusca(''); setPagina(1); }}>
              Limpar
            </button>
          )}
        </div>

        <label className="movement-type-filter" htmlFor="filtro-tipo-movimentacao">
          <span>Tipo</span>
          <select
            id="filtro-tipo-movimentacao"
            value={filtro}
            onChange={(evento) => alterarFiltro(evento.target.value as FiltroMovimentacao)}
          >
            <option value="entrada_saida">Entradas e saídas</option>
            <option value="entrada">Somente entradas</option>
            <option value="saida">Somente saídas</option>
          </select>
        </label>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      {carregando ? (
        <div className="card inventory-empty"><p>Carregando movimentações...</p></div>
      ) : movimentacoes.length === 0 ? (
        <div className="card inventory-empty">
          <p>{busca ? 'Nenhuma movimentação encontrada para essa busca.' : 'Nenhuma entrada ou saída foi registrada ainda.'}</p>
        </div>
      ) : (
        <div className="movement-history-list">
          {movimentacoes.map((movimentacao) => {
            const entrada = movimentacao.tipo === 'entrada';
            return (
              <article key={movimentacao.id} className="movement-history-row stock-flow-history-row">
                <div className="movement-history-product">
                  <strong>{movimentacao.item_nome}</strong>
                  <span>{formatarData(movimentacao.data)}</span>
                </div>
                <div className="movement-history-balance">
                  <span>Quantidade</span>
                  <strong className={entrada ? 'movement-value-entry' : 'movement-value-exit'}>
                    {entrada ? '+' : '−'}{movimentacao.quantidade}
                  </strong>
                </div>
                <span className={entrada ? 'badge badge-success' : 'badge badge-danger'}>
                  {entrada ? 'Entrada' : 'Saída'}
                </span>
                <div className="movement-history-reason">
                  <span>Saldo do estoque</span>
                  <p>{movimentacao.quantidade_anterior ?? '—'} → {movimentacao.quantidade_resultante ?? '—'}</p>
                </div>
                {(movimentacao.entregue_para || movimentacao.observacao) && (
                  <div className="movement-history-reason" style={{ width: '100%', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexBasis: '100%' }}>
                    {movimentacao.entregue_para && (
                      <p style={{ marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Entregue para: </strong> 
                        {movimentacao.entregue_para}
                      </p>
                    )}
                    {movimentacao.observacao && (
                      <p>
                        <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Observação: </strong> 
                        {movimentacao.observacao}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="inventory-pagination">
          <button className="btn btn-outline" disabled={pagina === 1} onClick={() => { setCarregando(true); setPagina((valor) => valor - 1); }}>
            Anterior
          </button>
          <span>Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong></span>
          <button className="btn btn-outline" disabled={pagina === totalPaginas} onClick={() => { setCarregando(true); setPagina((valor) => valor + 1); }}>
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
