import type { ListaComprasItem } from './types';
import './CardItemCompra.css';

interface CardItemCompraProps {
  item: ListaComprasItem;
  processando: boolean;
  onAvancarStatus: (item: ListaComprasItem) => void;
  onAbrirOrcamentos: (item: ListaComprasItem) => void;
  onEditar: (item: ListaComprasItem) => void;
  onExcluir: (id: number) => void;
  onFeedback?: (tipo: 'success' | 'error', mensagem: string) => void;
}

export function CardItemCompra({
  item,
  processando,
  onAvancarStatus,
  onAbrirOrcamentos,
  onEditar,
  onExcluir,
}: CardItemCompraProps) {
  const isComprado = item.status === 'comprado';
  const orcamentos = item.orcamentos || [];
  const orcamentosQtd = orcamentos.length;

  return (
    <div className={`purchase-item-card ${isComprado ? 'is-bought' : 'is-pending'}`}>
      <div className="purchase-item-content">
        {/* Linha 1: Título e Status */}
        <div className="purchase-item-title-row">
          <h3 className="purchase-item-title">{item.nome}</h3>
          <span className={`status-pill ${isComprado ? 'pill-bought' : 'pill-pending'}`}>
            <span className="status-dot"></span>
            {isComprado ? 'A caminho' : 'Pendente'}
          </span>
        </div>

        {/* Linha 2: Quantidade limpa e direta */}
        <div className="purchase-item-meta-row">
          <span className="meta-label">Quantidade:</span>
          <span className="meta-value">{item.quantidade} un.</span>
        </div>
      </div>

      {/* Bloco de Ações: Botões principais empilhados + Ícones de editar e excluir */}
      <div className="purchase-item-actions">
        <div className="purchase-buttons-stack">
          <button
            type="button"
            className="btn-quote-manage"
            onClick={() => onAbrirOrcamentos(item)}
            title="Ver cotações"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Orçamentos</span>
            {orcamentosQtd > 0 && (
              <span className="quote-count-badge">{orcamentosQtd}</span>
            )}
          </button>

          <button
            type="button"
            className={`btn-purchase-status ${isComprado ? 'btn-receive' : 'btn-buy'}`}
            onClick={() => onAvancarStatus(item)}
            disabled={processando}
            title={isComprado ? 'Dar Entrada' : 'Marcar Comprado'}
          >
            {processando ? (
              <span>Processando...</span>
            ) : isComprado ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <span>Dar Entrada</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Marcar Comprado</span>
              </>
            )}
          </button>
        </div>

        {/* Ícones de Editar e Excluir */}
        <div className="purchase-icons-stack">
          <button
            type="button"
            className="quick-icon-btn"
            onClick={() => onEditar(item)}
            disabled={processando}
            title="Editar item"
            aria-label="Editar produto"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>

          <button
            type="button"
            className="quick-icon-btn delete"
            onClick={() => onExcluir(item.id)}
            disabled={processando}
            title="Excluir item"
            aria-label="Excluir produto"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
