import { useState } from 'react';
import type { ListaComprasItem } from './types';

interface ModalEdicaoCompraProps {
  item: ListaComprasItem;
  salvando: boolean;
  onClose: () => void;
  onSalvar: (dados: { id: number; nome: string; quantidade: number; link: string | null }) => void;
}

export function ModalEdicaoCompra({ item, salvando, onClose, onSalvar }: ModalEdicaoCompraProps) {
  const [nome, setNome] = useState(item.nome);
  const [quantidade, setQuantidade] = useState(item.quantidade);
  const [link, setLink] = useState(item.link || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    onSalvar({
      id: item.id,
      nome: nomeLimpo,
      quantidade,
      link: link.trim() || null,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="edit-modal purchase-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-purchase-item-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="edit-modal-header">
          <div>
            <span>Editando item pendente #{item.id}</span>
            <h2 id="edit-purchase-item-title">Editar produto da lista</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar edição">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="simple-form">
          <label className="form-field" htmlFor="editar-compra-produto">
            <span>Nome do produto</span>
            <input
              id="editar-compra-produto"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="form-field" htmlFor="editar-compra-quantidade">
            <span>Quantidade</span>
            <input
              id="editar-compra-quantidade"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              required
            />
          </label>

          <label className="form-field" htmlFor="editar-compra-link">
            <span>Link da loja (opcional)</span>
            <input
              id="editar-compra-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://loja..."
            />
          </label>

          <div className="edit-modal-actions purchase-edit-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
