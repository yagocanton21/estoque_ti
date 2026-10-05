import type { Item } from './types';

interface CardProdutoProps {
  item: Item;
  onAbrirFicha: (item: Item) => void;
  onAbrirEdicao: (item: Item) => void;
  onExcluir: (id: number, nome: string) => void;
}

export function CardProduto({ item, onAbrirFicha, onAbrirEdicao, onExcluir }: CardProdutoProps) {
  const minimo = item.quantidade_minima ?? 0;
  const isCritico = item.quantidade < minimo;
  const isLimite = item.quantidade === minimo && minimo > 0;

  return (
    <article className="card product-card">
      <div className="product-card-header">
        <div className="product-card-media" onClick={() => onAbrirFicha(item)} style={{ cursor: 'pointer' }}>
          {item.foto_url ? (
            <img src={item.foto_url} alt={item.nome} className="product-image" />
          ) : (
            <div className="product-placeholder">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
          )}
        </div>

        <span
          className={`badge ${
            isCritico
              ? 'badge-danger'
              : isLimite
              ? 'badge-warning'
              : 'badge-success'
          }`}
        >
          {isCritico
            ? 'Abaixo do mínimo'
            : isLimite
            ? 'No limite mínimo'
            : 'Estoque normal'}
        </span>
      </div>

      <div className="product-card-body" onClick={() => onAbrirFicha(item)} style={{ cursor: 'pointer' }}>
        <h2>{item.nome}</h2>
        <p className="product-description">
          {[item.marca, item.modelo].filter(Boolean).join(' • ') || 'Sem especificações'}
        </p>

        <div className="product-stock">
          <div>
            <span>Quantidade</span>
            <strong>{item.quantidade} un.</strong>
          </div>
          <div>
            <span>Estoque mínimo</span>
            <strong>{minimo} un.</strong>
          </div>
        </div>
      </div>

      <div className="product-card-actions">
        <button
          type="button"
          className="btn btn-outline product-btn-sheet"
          onClick={() => onAbrirFicha(item)}
          title="Ver ficha completa e histórico de movimentações"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 14 14"></polyline>
          </svg>
          <span>Ficha / Histórico</span>
        </button>

        <button
          type="button"
          className="btn btn-primary product-edit-button"
          onClick={() => onAbrirEdicao(item)}
          title="Editar produto"
        >
          Editar
        </button>

        <button
          type="button"
          className="product-btn-delete"
          onClick={() => onExcluir(item.id, item.nome)}
          title="Excluir produto"
          aria-label="Excluir produto"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </article>
  );
}
