import { useEffect, useState } from 'react';
import { converterMoeda, normalizarUrl } from './types';

interface FormCotacaoProps {
  salvando: boolean;
  abertoInicial?: boolean;
  onAdicionar: (dados: {
    fornecedor: string;
    preco_unitario: number;
    frete: number;
    link: string | null;
  }) => Promise<void>;
  onError: (msg: string) => void;
}

export function FormCotacao({ salvando, abertoInicial = false, onAdicionar, onError }: FormCotacaoProps) {
  const [fornecedor, setFornecedor] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [frete, setFrete] = useState('');
  const [link, setLink] = useState('');
  const [isOpen, setIsOpen] = useState(abertoInicial);

  useEffect(() => {
    if (abertoInicial) {
      setIsOpen(true);
    }
  }, [abertoInicial]);

  const handleSubmit = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const preco = converterMoeda(precoUnitario);
    const valorFrete = frete ? converterMoeda(frete) : 0;
    if (!Number.isFinite(preco) || preco <= 0) {
      onError('Informe um preço unitário válido e maior que zero (ex: 150,00 ou R$ 150,00).');
      return;
    }
    if (!Number.isFinite(valorFrete) || valorFrete < 0) {
      onError('Informe um frete válido ou deixe o campo vazio.');
      return;
    }

    const linkNormalizado = normalizarUrl(link);

    await onAdicionar({
      fornecedor: fornecedor.trim(),
      preco_unitario: preco,
      frete: valorFrete,
      link: linkNormalizado,
    });

    setFornecedor('');
    setPrecoUnitario('');
    setFrete('');
    setLink('');
  };

  return (
    <details
      className="budget-section budget-collapsible"
      open={isOpen}
      onToggle={(e) => setIsOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        <span>
          <strong>Adicionar nova cotação</strong>
          <small>Fornecedor, valores e link da loja</small>
        </span>
        <span className="budget-collapsible-icon" aria-hidden="true">⌄</span>
      </summary>
      <div className="budget-collapsible-content">
        <form onSubmit={handleSubmit} className="edit-form-grid budget-form">
          <label className="form-field form-field-wide">
            <span>Fornecedor</span>
            <input
              value={fornecedor}
              onChange={(evento) => setFornecedor(evento.target.value)}
              required
              placeholder="Ex: Pichau, Terabyte, KaBuM!, Mercado Livre"
            />
          </label>
          <label className="form-field">
            <span>Preço unitário (R$)</span>
            <input
              value={precoUnitario}
              onChange={(evento) => setPrecoUnitario(evento.target.value)}
              required
              inputMode="decimal"
              placeholder="118,00 ou R$ 118,00"
            />
          </label>
          <label className="form-field">
            <span>Frete (R$)</span>
            <input
              value={frete}
              onChange={(evento) => setFrete(evento.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </label>
          <label className="form-field form-field-wide">
            <span>Link da loja (opcional)</span>
            <input
              type="text"
              value={link}
              onChange={(evento) => setLink(evento.target.value)}
              placeholder="Ex: www.pichau.com.br/... ou https://..."
            />
          </label>
          <button type="submit" className="btn btn-primary form-field-wide" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Adicionar cotação'}
          </button>
        </form>
      </div>
    </details>
  );
}
