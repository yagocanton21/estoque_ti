import { useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

export function Estoque() {
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState(0);
  const [quantidadeMinima, setQuantidadeMinima] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const cadastrarProduto = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (salvando) return;

    setSalvando(true);
    setFeedback({ type: 'loading', text: 'Cadastrando produto...' });
    try {
      await axios.post('/api/itens/', {
        nome,
        quantidade,
        quantidade_minima: quantidadeMinima,
      });
      setNome('');
      setQuantidade(0);
      setQuantidadeMinima(0);
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
            <span>Nome do produto</span>
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

          <button type="submit" className="btn btn-primary primary-form-action" disabled={salvando}>
            {salvando ? 'Cadastrando...' : 'Cadastrar Produto'}
          </button>
        </form>
      </div>
    </div>
  );
}
