import { useState } from 'react';
import type { Item } from './types';
import { formatarUrlFoto } from './utils';

interface CardProdutoProps {
  item: Item;
  onAbrirFicha: (item: Item) => void;
  onAbrirEdicao: (item: Item) => void;
  onExcluir: (id: number, nome: string) => void;
}

export function CardProduto({ item, onAbrirFicha, onAbrirEdicao, onExcluir }: CardProdutoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const minimo = item.quantidade_minima ?? 0;
  const isCritico = item.quantidade < minimo;
  const isLimite = item.quantidade === minimo && minimo > 0;
  const urlFoto = formatarUrlFoto(item.foto_url);
  const temFotoValida = Boolean(urlFoto) && failedUrl !== urlFoto;

  return (
    <article className={`product-card ${isCritico ? 'product-card-critical' : ''}`}>
      {/* Foto do produto como estava antes */}
      {temFotoValida ? (
        <img
          src={urlFoto}
          alt={item.nome}
          style={{
            width: '100%',
            height: '160px',
            objectFit: 'contain',
            borderRadius: '8px',
            backgroundColor: '#f5f5f5',
            marginBottom: '12px',
            padding: '8px',
            cursor: 'pointer',
          }}
          onClick={() => onAbrirFicha(item)}
          onError={() => setFailedUrl(urlFoto)}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '160px',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            borderRadius: '8px',
            marginBottom: '12px',
            cursor: 'pointer',
          }}
          onClick={() => onAbrirFicha(item)}
        >
          Sem foto
        </div>
      )}

      {/* Cabecalho com ID e Badge exatamente como era antes */}
      <div className="product-card-header" style={{ borderRadius: 0 }}>
        <span className="product-id">#{item.id}</span>
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
            ? 'Estoque baixo'
            : isLimite
            ? 'No limite mínimo'
            : 'Estoque normal'}
        </span>
      </div>

      <div className="product-card-body" onClick={() => onAbrirFicha(item)} style={{ cursor: 'pointer' }}>
        <h2>{item.nome}</h2>
        <p className="product-description">
          {[item.marca, item.modelo].filter(Boolean).join(' • ') || 'Marca e modelo não informados'}
        </p>
      </div>

      <div className="product-stock">
        <div>
          <strong>{item.quantidade}</strong>
          <span>em estoque</span>
        </div>
        <div>
          <strong>{minimo}</strong>
          <span>estoque mínimo</span>
        </div>
      </div>

      {/* Ações */}
      <div className="product-card-actions">
        <button
          type="button"
          className="btn btn-outline product-btn-sheet"
          onClick={() => onAbrirFicha(item)}
          title="Ver ficha completa e histórico de movimentações"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 14 14" />
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
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </article>
  );
}
