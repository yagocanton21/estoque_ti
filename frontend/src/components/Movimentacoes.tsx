import { useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

interface Produto {
  id: number;
  nome: string;
  quantidade: number;
}

type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste';

export function Movimentacoes() {
  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [tipo, setTipo] = useState<TipoMovimentacao>('saida');
  const [quantidade, setQuantidade] = useState(1);
  const [novaQuantidade, setNovaQuantidade] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (busca.length <= 1 || produtoSelecionado) return;

    const timeout = window.setTimeout(() => {
      axios.get(`/api/itens/buscar?q=${encodeURIComponent(busca)}`)
        .then((resposta) => setSugestoes(resposta.data))
        .catch((error) => {
          console.error('Erro ao procurar produtos:', error);
          setFeedback({ type: 'error', text: 'Não foi possível procurar produtos. Tente novamente.' });
        });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [busca, produtoSelecionado]);

  const registrarMovimentacao = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!produtoSelecionado) {
      setFeedback({ type: 'error', text: 'Digite o nome e selecione um produto na lista de resultados.' });
      return;
    }

    if (tipo === 'ajuste') {
      if (motivo.trim().length < 3) {
        setFeedback({ type: 'error', text: 'Explique o motivo do ajuste com pelo menos 3 caracteres.' });
        return;
      }
      if (novaQuantidade === produtoSelecionado.quantidade) {
        setFeedback({ type: 'error', text: 'A nova quantidade é igual ao saldo atual. Nenhum ajuste é necessário.' });
        return;
      }
      const confirmado = window.confirm(
        `Confirmar ajuste de “${produtoSelecionado.nome}” de ${produtoSelecionado.quantidade} para ${novaQuantidade}?`,
      );
      if (!confirmado) return;
    }

    setSalvando(true);
    setFeedback({ type: 'loading', text: tipo === 'ajuste' ? 'Registrando ajuste...' : 'Registrando movimentação...' });
    try {
      if (tipo === 'ajuste') {
        await axios.post('/api/movimentacoes/ajuste', {
          item_id: produtoSelecionado.id,
          nova_quantidade: novaQuantidade,
          motivo,
        });
        setFeedback({
          type: 'success',
          text: `Estoque de “${produtoSelecionado.nome}” ajustado de ${produtoSelecionado.quantidade} para ${novaQuantidade}.`,
        });
      } else {
        await axios.post('/api/movimentacoes/', {
          item_id: produtoSelecionado.id,
          tipo,
          quantidade,
        });
        setFeedback({
          type: 'success',
          text: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${quantidade} unidade(s) de “${produtoSelecionado.nome}” registrada com sucesso.`,
        });
      }
      setProdutoSelecionado(null);
      setBusca('');
      setSugestoes([]);
      setQuantidade(1);
      setNovaQuantidade(0);
      setMotivo('');
    } catch (error: any) {
      console.error('Erro ao registrar movimentação:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || 'Não foi possível registrar. Confira os dados e tente novamente.' });
    } finally {
      setSalvando(false);
    }
  };

  const selecionarProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setNovaQuantidade(produto.quantidade);
    setBusca(produto.nome);
    setSugestoes([]);
    setFeedback(null);
  };

  const trocarProduto = () => {
    setProdutoSelecionado(null);
    setBusca('');
    setSugestoes([]);
    setNovaQuantidade(0);
  };

  return (
    <div className="centered-form-page">
      <div className="page-introduction">
        <h1>Movimentar Estoque</h1>
        <p>Registre entradas, saídas ou corrija o saldo após uma contagem física.</p>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="card">
        <form onSubmit={registrarMovimentacao} className="simple-form">
          <div className="product-picker">
            <label className="form-field" htmlFor="movimento-produto">
              <span>Produto</span>
              <small>Digite pelo menos duas letras e selecione o produto na lista.</small>
              <div className="product-picker-input">
                <input
                  id="movimento-produto"
                  type="text"
                  value={busca}
                  onChange={(evento) => {
                    const valor = evento.target.value;
                    setBusca(valor);
                    if (valor.length <= 1) setSugestoes([]);
                  }}
                  disabled={produtoSelecionado !== null}
                  placeholder="Ex: Mouse"
                  required
                  autoComplete="off"
                />
                {produtoSelecionado && (
                  <button type="button" onClick={trocarProduto} className="btn btn-outline">Trocar produto</button>
                )}
              </div>
            </label>

            {sugestoes.length > 0 && (
              <div className="product-suggestions" role="listbox" aria-label="Produtos encontrados">
                {sugestoes.map((produto) => (
                  <button key={produto.id} type="button" role="option" onClick={() => selecionarProduto(produto)}>
                    <strong>{produto.nome}</strong>
                    <span>{produto.quantidade} unidade(s) no estoque</span>
                  </button>
                ))}
              </div>
            )}

            {produtoSelecionado && (
              <div className="selected-product" role="status">
                <span aria-hidden="true">✓</span>
                <span><strong>Produto selecionado:</strong> {produtoSelecionado.nome} · Estoque atual: {produtoSelecionado.quantidade}</span>
              </div>
            )}
          </div>

          <label className="form-field" htmlFor="movimento-tipo">
            <span>O que aconteceu?</span>
            <select id="movimento-tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoMovimentacao)}>
              <option value="saida">Saída — produtos foram retirados</option>
              <option value="entrada">Entrada — produtos chegaram</option>
              <option value="ajuste">Ajuste — a contagem real está diferente</option>
            </select>
          </label>

          {tipo === 'ajuste' ? (
            <>
              <label className="form-field" htmlFor="movimento-nova-quantidade">
                <span>Quantidade encontrada na contagem</span>
                <input
                  id="movimento-nova-quantidade"
                  type="number"
                  value={novaQuantidade}
                  onChange={(evento) => setNovaQuantidade(Number(evento.target.value))}
                  required
                  min="0"
                />
                <small>Informe o total que existe fisicamente agora.</small>
              </label>

              <label className="form-field" htmlFor="movimento-motivo">
                <span>Motivo do ajuste</span>
                <textarea
                  id="movimento-motivo"
                  value={motivo}
                  onChange={(evento) => setMotivo(evento.target.value)}
                  placeholder="Ex: Diferença encontrada no inventário mensal"
                  required
                  minLength={3}
                  maxLength={300}
                  rows={3}
                />
                <small>Obrigatório. Esse texto ficará salvo no histórico.</small>
              </label>

              {produtoSelecionado && (
                <div className="adjustment-preview" aria-live="polite">
                  <span>Saldo após o ajuste</span>
                  <strong>{produtoSelecionado.quantidade} → {novaQuantidade}</strong>
                </div>
              )}
            </>
          ) : (
            <label className="form-field" htmlFor="movimento-quantidade">
              <span>Quantidade</span>
              <input
                id="movimento-quantidade"
                type="number"
                value={quantidade}
                onChange={(evento) => setQuantidade(Number(evento.target.value))}
                required
                min="1"
              />
            </label>
          )}

          <button type="submit" className="btn btn-primary primary-form-action" disabled={salvando}>
            {salvando ? 'Registrando...' : tipo === 'ajuste' ? 'Confirmar Ajuste de Estoque' : `Registrar ${tipo === 'entrada' ? 'Entrada' : 'Saída'}`}
          </button>
        </form>
      </div>
    </div>
  );
}

