import { useState, useEffect } from 'react';
import type { EdicaoItem } from './types';
import { formatarUrlFoto } from './utils';
import './ModalEdicaoEstoque.css';

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
  const isUrlExterna = Boolean(
    edicao.foto_url &&
    (edicao.foto_url.startsWith('http://') || edicao.foto_url.startsWith('https://'))
  );

  const [modoFoto, setModoFoto] = useState<'url' | 'arquivo'>(() => {
    if (edicao.foto_arquivo) return 'arquivo';
    if (isUrlExterna) return 'url';
    if (edicao.foto_url && edicao.foto_url.startsWith('/uploads/')) return 'arquivo';
    return 'url';
  });

  const [previewError, setPreviewError] = useState(false);
  const [arquivoPreviewUrl, setArquivoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (edicao.foto_arquivo) {
      const objectUrl = URL.createObjectURL(edicao.foto_arquivo);
      setArquivoPreviewUrl(objectUrl);
      setPreviewError(false);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setArquivoPreviewUrl(null);
    }
  }, [edicao.foto_arquivo]);

  const urlFotoFormatada = formatarUrlFoto(edicao.foto_url);
  const imagemPreview = arquivoPreviewUrl || (urlFotoFormatada ? urlFotoFormatada : null);

  const handleRemoverFoto = () => {
    setPreviewError(false);
    onChange({
      ...edicao,
      foto_url: '',
      foto_arquivo: undefined,
    });
  };

  const handleUrlChange = (novaUrl: string) => {
    setPreviewError(false);
    onChange({
      ...edicao,
      foto_url: novaUrl,
      foto_arquivo: undefined,
    });
  };

  const handleArquivoChange = (arquivo?: File) => {
    setPreviewError(false);
    if (arquivo) {
      onChange({
        ...edicao,
        foto_arquivo: arquivo,
      });
    }
  };

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
                placeholder="Ex: Dell, Logitech, HP"
                value={edicao.marca}
                onChange={(evento) => onChange({ ...edicao, marca: evento.target.value })}
              />
            </label>

            <label className="form-field" htmlFor="editar-modelo">
              <span>Modelo</span>
              <input
                id="editar-modelo"
                type="text"
                placeholder="Ex: MX Master 3, G15"
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

            <div className="form-field form-field-wide photo-management-field">
              <div className="photo-field-header">
                <span>Foto do produto</span>
                <div className="photo-source-pills">
                  <button
                    type="button"
                    className={`photo-pill ${modoFoto === 'url' ? 'active' : ''}`}
                    onClick={() => setModoFoto('url')}
                  >
                    🌐 Link / URL
                  </button>
                  <button
                    type="button"
                    className={`photo-pill ${modoFoto === 'arquivo' ? 'active' : ''}`}
                    onClick={() => setModoFoto('arquivo')}
                  >
                    📁 Arquivo local
                  </button>
                </div>
              </div>

              {modoFoto === 'url' ? (
                <div className="photo-url-control">
                  <div className="photo-input-action-row">
                    <input
                      id="editar-foto-url"
                      type="url"
                      placeholder="https://exemplo.com/imagem-do-produto.jpg"
                      value={edicao.foto_url && !edicao.foto_arquivo ? edicao.foto_url : ''}
                      onChange={(evento) => handleUrlChange(evento.target.value)}
                      autoComplete="off"
                    />
                    {edicao.foto_url && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm photo-clear-btn"
                        onClick={handleRemoverFoto}
                        title="Limpar URL e remover foto"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <small className="photo-helper-text">
                    Cole o link direto da imagem na internet (ex: lojas, fabricantes, Imgur, etc.).
                  </small>
                </div>
              ) : (
                <div className="photo-file-control">
                  <input
                    id="editar-foto-arquivo"
                    type="file"
                    accept="image/*"
                    onChange={(evento) => {
                      const arquivo = evento.target.files?.[0];
                      handleArquivoChange(arquivo);
                    }}
                  />
                  <small className="photo-helper-text">
                    Selecione uma imagem do computador (JPG, PNG, WebP).
                  </small>
                </div>
              )}

              {/* Preview da foto */}
              {imagemPreview && (
                <div className="photo-preview-container">
                  <div className="photo-preview-thumb-wrap">
                    {!previewError ? (
                      <img
                        src={imagemPreview}
                        alt="Preview da foto"
                        className="photo-preview-thumb"
                        referrerPolicy="no-referrer"
                        onError={() => setPreviewError(true)}
                      />
                    ) : (
                      <div className="photo-preview-error-box">
                        <span>⚠️ Erro na imagem</span>
                      </div>
                    )}
                  </div>
                  <div className="photo-preview-details">
                    <div className="photo-preview-origin">
                      {edicao.foto_arquivo ? (
                        <span>📁 Arquivo local: <strong>{edicao.foto_arquivo.name}</strong></span>
                      ) : isUrlExterna ? (
                        <span>🌐 Link da internet</span>
                      ) : (
                        <span>💾 Foto cadastrada</span>
                      )}
                    </div>
                    {previewError ? (
                      <small className="photo-preview-status error">
                        Não foi possível carregar a imagem deste link. Verifique se o endereço está correto.
                      </small>
                    ) : (
                      <small className="photo-preview-status success">
                        Imagem carregada e pronta para salvar.
                      </small>
                    )}
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={handleRemoverFoto}
                    >
                      Remover esta foto
                    </button>
                  </div>
                </div>
              )}
            </div>
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
