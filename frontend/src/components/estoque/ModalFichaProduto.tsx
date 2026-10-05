import { useEffect, useState } from 'react';
import axios from 'axios';
import type { Item, ItemHistoricoDados } from './types';
import { formatarUrlFoto } from './utils';

interface ModalFichaProdutoProps {
  itemId: number;
  onClose: () => void;
  onEditar: (item: Item) => void;
  onExcluir: (item: Item) => void;
}

function formatarDataHora(isoString: string): string {
  try {
    const data = new Date(isoString);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function ModalFichaProduto({ itemId, onClose, onEditar, onExcluir }: ModalFichaProdutoProps) {
  const [dados, setDados] = useState<ItemHistoricoDados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida' | 'ajuste'>('todos');
  const [erro, setErro] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let ativo = true;
    axios
      .get(`/api/itens/${itemId}/historico`)
      .then((res) => {
        if (ativo) setDados(res.data);
      })
      .catch((err) => {
        if (ativo) setErro(err.response?.data?.detail || 'Erro ao carregar histórico do produto.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [itemId]);

  const item = dados?.item;
  const movimentacoes = dados?.movimentacoes || [];
  const movimentacoesFiltradas =
    filtroTipo === 'todos' ? movimentacoes : movimentacoes.filter((m) => m.tipo === filtroTipo);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="edit-modal product-sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-sheet-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="edit-modal-header product-sheet-header">
          <div>
            <span>Ficha Detalhada do Produto #{itemId}</span>
            <h2 id="product-sheet-title">{item ? item.nome : 'Carregando detalhes...'}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar ficha">
            ×
          </button>
        </div>

        {carregando ? (
          <div className="product-sheet-loading">
            <p style={{ color: 'var(--text-muted)' }}>Carregando dados e histórico...</p>
          </div>
        ) : erro || !item || !dados ? (
          <div className="product-sheet-error">
            <p style={{ color: '#f87171' }}>{erro || 'Não foi possível carregar a ficha do produto.'}</p>
          </div>
        ) : (
          <div className="product-sheet-body">
            {/* Topo do Produto com Foto e Métricas */}
            <div className="product-sheet-top">
              <div className="product-sheet-media">
                {formatarUrlFoto(item.foto_url) && !imgError ? (
                  <img
                    src={formatarUrlFoto(item.foto_url)}
                    alt={item.nome}
                    className="product-sheet-photo"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="product-sheet-photo-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                )}
              </div>

              <div className="product-sheet-info">
                <div className="product-sheet-tags">
                  {item.marca && <span className="product-tag">{item.marca}</span>}
                  {item.modelo && <span className="product-tag">{item.modelo}</span>}
                  <span className={`badge ${item.quantidade <= (item.quantidade_minima || 0) ? 'badge-danger' : 'badge-success'}`}>
                    {item.quantidade <= (item.quantidade_minima || 0) ? 'Estoque Crítico' : 'Estoque Normal'}
                  </span>
                </div>

                <div className="product-metrics-grid">
                  <div className="product-metric-card">
                    <span>Estoque Atual</span>
                    <strong>{item.quantidade} un.</strong>
                    <small>Mínimo: {item.quantidade_minima ?? 0} un.</small>
                  </div>
                  <div className="product-metric-card metric-entry">
                    <span>Total Entradas</span>
                    <strong>+{dados.total_entradas} un.</strong>
                  </div>
                  <div className="product-metric-card metric-exit">
                    <span>Total Saídas</span>
                    <strong>-{dados.total_saidas} un.</strong>
                  </div>
                  <div className="product-metric-card metric-adjust">
                    <span>Ajustes</span>
                    <strong>{dados.total_ajustes}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha do Tempo de Movimentações */}
            <div className="product-timeline-section">
              <div className="product-timeline-header">
                <h3>Linha do Tempo de Movimentações ({movimentacoesFiltradas.length})</h3>
                <div className="timeline-filter-buttons">
                  <button
                    type="button"
                    className={`timeline-filter-btn ${filtroTipo === 'todos' ? 'active' : ''}`}
                    onClick={() => setFiltroTipo('todos')}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`timeline-filter-btn ${filtroTipo === 'entrada' ? 'active' : ''}`}
                    onClick={() => setFiltroTipo('entrada')}
                  >
                    Entradas
                  </button>
                  <button
                    type="button"
                    className={`timeline-filter-btn ${filtroTipo === 'saida' ? 'active' : ''}`}
                    onClick={() => setFiltroTipo('saida')}
                  >
                    Saídas
                  </button>
                  <button
                    type="button"
                    className={`timeline-filter-btn ${filtroTipo === 'ajuste' ? 'active' : ''}`}
                    onClick={() => setFiltroTipo('ajuste')}
                  >
                    Ajustes
                  </button>
                </div>
              </div>

              {movimentacoesFiltradas.length === 0 ? (
                <div className="timeline-empty">
                  <p style={{ color: 'var(--text-muted)' }}>
                    Nenhuma movimentação encontrada {filtroTipo !== 'todos' ? `para o filtro "${filtroTipo}"` : 'para este produto'}.
                  </p>
                </div>
              ) : (
                <div className="timeline-list">
                  {movimentacoesFiltradas.map((mov) => (
                    <div key={mov.id} className={`timeline-card timeline-type-${mov.tipo}`}>
                      <div className="timeline-badge-icon">
                        {mov.tipo === 'entrada' ? '📥' : mov.tipo === 'saida' ? '📤' : '🔄'}
                      </div>
                      <div className="timeline-card-content">
                        <div className="timeline-card-top">
                          <span className={`timeline-type-pill pill-${mov.tipo}`}>
                            {mov.tipo === 'entrada'
                              ? `+${mov.quantidade} un. (Entrada)`
                              : mov.tipo === 'saida'
                              ? `-${mov.quantidade} un. (Saída)`
                              : `Ajuste (${mov.quantidade_anterior ?? '?'} → ${mov.quantidade_resultante ?? mov.quantidade} un.)`}
                          </span>
                          <span className="timeline-date">{formatarDataHora(mov.data)}</span>
                        </div>

                        {mov.entregue_para && (
                          <p className="timeline-detail">
                            <strong>Entregue para:</strong> {mov.entregue_para}
                          </p>
                        )}
                        {mov.motivo && (
                          <p className="timeline-detail">
                            <strong>Motivo:</strong> {mov.motivo}
                          </p>
                        )}
                        {mov.observacao && (
                          <p className="timeline-detail">
                            <strong>Obs:</strong> {mov.observacao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ações da Ficha */}
            <div className="product-sheet-footer">
              <button
                type="button"
                className="btn btn-outline danger-outline-button"
                onClick={() => onExcluir(item)}
              >
                Excluir produto
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={onClose}>
                  Fechar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    onEditar(item);
                  }}
                >
                  Editar Produto
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
