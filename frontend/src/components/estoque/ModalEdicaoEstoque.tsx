import type { EdicaoItem } from './types';
import { formatarUrlFoto } from './utils';

interface ModalEdicaoEstoqueProps {
  edicao: EdicaoItem;
  salvando: boolean;
  onClose: () => void;
  onChange: (edicao: EdicaoItem) => void;
  onSalvar: (e: React.FormEvent) => void;
  onExcluir: (id: number, nome: string) => void;
}

export function ModalEdicaoEstoque({
  edicao,
  salvando,
  onClose,
  onChange,
  onSalvar,
  onExcluir,
}: ModalEdicaoEstoqueProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-item-title"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className="edit-modal-header">
          <div>
            <span>Editando produto #{edicao.id}</span>
            <h2 id="edit-item-title">Editar produto</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar edição">
            ×
          </button>
        </div>

        <form onSubmit={onSalvar} className="simple-form">
          <label className="form-field" htmlFor="editar-nome">
            <span>Nome do produto</span>
            <input
              id="editar-nome"
              type="text"
              value={edicao.nome}
              onChange={(evento) => onChange({ ...edicao, nome: evento.target.value })}
              required
              autoFocus
            />
          </label>

          <div className="edit-form-grid">
            <label className="form-field" htmlFor="editar-marca">
              <span>Marca</span>
              <input
                id="editar-marca"
                type="text"
                value={edicao.marca}
                onChange={(evento) => onChange({ ...edicao, marca: evento.target.value })}
              />
            </label>

            <label className="form-field" htmlFor="editar-modelo">
              <span>Modelo</span>
              <input
                id="editar-modelo"
                type="text"
                value={edicao.modelo}
                onChange={(evento) => onChange({ ...edicao, modelo: evento.target.value })}
              />
            </label>

            <label className="form-field" htmlFor="editar-quantidade">
              <span>Quantidade em estoque</span>
              <input
                id="editar-quantidade"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={edicao.quantidade}
                disabled
                title="Para alterar a quantidade, use a aba Movimentações ou Ajuste"
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Para alterar a quantidade, registre uma movimentação ou ajuste com justificativa.
              </small>
            </label>

            <label className="form-field" htmlFor="editar-minimo">
              <span>Estoque mínimo</span>
              <input
                id="editar-minimo"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={edicao.quantidade_minima}
                onChange={(evento) =>
                  onChange({ ...edicao, quantidade_minima: Number(evento.target.value) })
                }
              />
            </label>

            <label className="form-field form-field-wide" htmlFor="editar-foto">
              <span>Foto do produto</span>
              {edicao.foto_url && !edicao.foto_arquivo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.6rem' }}>
                  <img
                    src={formatarUrlFoto(edicao.foto_url)}
                    alt="Foto atual"
                    style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '4px' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Foto atual cadastrada. Selecione um novo arquivo abaixo apenas se desejar substituí-la.
                  </small>
                </div>
              )}
              <input
                id="editar-foto"
                type="file"
                accept="image/*"
                onChange={(evento) => {
                  const arquivo = evento.target.files?.[0];
                  if (arquivo) onChange({ ...edicao, foto_arquivo: arquivo });
                }}
              />
            </label>
          </div>

          <div className="edit-modal-actions edit-modal-actions-split">
            <button
              type="button"
              className="btn btn-outline danger-outline-button"
              onClick={() => onExcluir(edicao.id, edicao.nome)}
              disabled={salvando}
            >
              Excluir produto
            </button>
            <div className="edit-modal-primary-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
