import { useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';
import './EstoqueCadastro.css';

export function Estoque() {
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [quantidade, setQuantidade] = useState(0);
  const [quantidadeMinima, setQuantidadeMinima] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const cadastrarProduto = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (salvando) return;

    setSalvando(true);
    setFeedback({ type: 'loading', text: 'Cadastrando produto...' });
    try {
      await axios.post('/api/itens/', {
        nome: nome.trim(),
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        quantidade,
        quantidade_minima: quantidadeMinima,
        foto_url: fotoUrl.trim() || null,
      });
      setNome('');
      setMarca('');
      setModelo('');
      setFotoUrl('');
      setQuantidade(0);
      setQuantidadeMinima(0);
      setPreviewError(false);
      setFeedback({ type: 'success', text: `Produto “${nome}” cadastrado com sucesso.` });
    } catch (error: any) {
      console.error('Erro ao cadastrar produto:', error);
      setFeedback({
        type: 'error',
        text: error.response?.data?.detail || 'Não foi possível cadastrar o produto. Confira os dados e tente novamente.',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="centered-form-page registration-page">
      <div className="page-introduction">
        <h1>Cadastrar Novo Produto</h1>
        <p>Informe os dados abaixo para adicionar um produto ao estoque.</p>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="card registration-card">
        <form onSubmit={cadastrarProduto} className="simple-form registration-form">
          <label className="form-field" htmlFor="produto-nome">
            <span>Nome do produto *</span>
            <input
              id="produto-nome"
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Ex: Teclado sem fio"
              required
              autoFocus
              autoComplete="off"
            />
          </label>

          <div className="grid grid-cols-2">
            <label className="form-field" htmlFor="produto-marca">
              <span>Marca</span>
              <input
                id="produto-marca"
                type="text"
                value={marca}
                onChange={(evento) => setMarca(evento.target.value)}
                placeholder="Ex: Logitech, Dell, HP"
                autoComplete="off"
              />
            </label>

            <label className="form-field" htmlFor="produto-modelo">
              <span>Modelo</span>
              <input
                id="produto-modelo"
                type="text"
                value={modelo}
                onChange={(evento) => setModelo(evento.target.value)}
                placeholder="Ex: MX Keys, G15"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="grid grid-cols-2">
            <label className="form-field" htmlFor="produto-quantidade">
              <span>Quantidade inicial</span>
              <input
                id="produto-quantidade"
                type="number"
                value={quantidade}
                onChange={(evento) => setQuantidade(Number(evento.target.value))}
                required
                min="0"
                step="1"
                inputMode="numeric"
              />
              <small>Quantas unidades existem agora.</small>
            </label>

            <label className="form-field" htmlFor="produto-minimo">
              <span>Quantidade mínima para alerta</span>
              <input
                id="produto-minimo"
                type="number"
                value={quantidadeMinima}
                onChange={(evento) => setQuantidadeMinima(Number(evento.target.value))}
                required
                min="0"
                step="1"
                inputMode="numeric"
              />
              <small>O sistema avisará quando chegar neste número.</small>
            </label>
          </div>

          <div className="form-field photo-url-registration-field">
            <label htmlFor="produto-foto-url">
              <span>Foto do produto (Link / URL da web)</span>
            </label>
            <input
              id="produto-foto-url"
              type="url"
              value={fotoUrl}
              onChange={(evento) => {
                setFotoUrl(evento.target.value);
                setPreviewError(false);
              }}
              placeholder="https://exemplo.com/imagem-do-produto.jpg"
              autoComplete="off"
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Opcional. Cole a URL direta de uma imagem na internet para ilustrar o card do produto.
            </small>

            {fotoUrl.trim() && (
              <div className="photo-preview-container" style={{ marginTop: '0.75rem' }}>
                <div className="photo-preview-thumb-wrap">
                  {!previewError ? (
                    <img
                      src={fotoUrl.trim()}
                      alt="Preview"
                      className="photo-preview-thumb"
                      referrerPolicy="no-referrer"
                      onError={() => setPreviewError(true)}
                    />
                  ) : (
                    <div className="photo-preview-error-box">
                      <span>⚠️ Imagem inacessível</span>
                    </div>
                  )}
                </div>
                <div className="photo-preview-details">
                  <div className="photo-preview-origin">
                    <span>🌐 Preview da imagem</span>
                  </div>
                  {previewError ? (
                    <small className="photo-preview-status error">
                      Não foi possível carregar a imagem deste link. Verifique se o endereço está correto.
                    </small>
                  ) : (
                    <small className="photo-preview-status success">
                      Imagem carregada com sucesso!
                    </small>
                  )}
                  <button
                    type="button"
                    className="photo-remove-btn"
                    onClick={() => {
                      setFotoUrl('');
                      setPreviewError(false);
                    }}
                  >
                    Remover URL
                  </button>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary primary-form-action" disabled={salvando}>
            {salvando ? 'Cadastrando...' : 'Cadastrar Produto'}
          </button>
        </form>
      </div>
    </div>
  );
}
