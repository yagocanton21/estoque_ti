import type { ItemParaOrcamento, Orcamento } from './types';
import { formatarMoeda } from './types';

interface ListaComparativaCotacoesProps {
  orcamentos: Orcamento[];
  item: ItemParaOrcamento;
  processandoId: number | null;
  onSelecionar: (id: number) => void;
  onDeletar: (id: number) => void;
}

export function ListaComparativaCotacoes({
  orcamentos,
  item,
  processandoId,
  onSelecionar,
  onDeletar,
}: ListaComparativaCotacoesProps) {
  return (
    <div className="budget-comparison-list">
      {orcamentos.map((orcamento, indice) => (
        <article
          key={orcamento.id}
          className={`budget-comparison-row ${orcamento.selecionado ? 'budget-comparison-selected' : ''}`}
        >
          <div className="budget-comparison-supplier">
            <span>Opção {indice + 1}</span>
            <strong>{orcamento.fornecedor}</strong>
            {orcamento.link && (
              <a href={orcamento.link} target="_blank" rel="noreferrer">
                Abrir loja ↗
              </a>
            )}
          </div>
          <div className="budget-comparison-value">
            <span>Unitário</span>
            <strong>{formatarMoeda(orcamento.preco_unitario)}</strong>
          </div>
          <div className="budget-comparison-value">
            <span>Frete</span>
            <strong>{orcamento.frete === 0 ? 'Grátis' : formatarMoeda(orcamento.frete)}</strong>
          </div>
          <div className="budget-comparison-value budget-comparison-total">
            <span>Total</span>
            <strong>{formatarMoeda(orcamento.preco_unitario * item.quantidade + orcamento.frete)}</strong>
          </div>
          <div className="budget-comparison-actions">
            {orcamento.selecionado ? (
              <span className="badge badge-success">Vencedor ✓</span>
            ) : (
              <button
                className="btn btn-outline budget-row-button budget-choose"
                type="button"
                disabled={processandoId !== null}
                onClick={() => onSelecionar(orcamento.id)}
              >
                Escolher
              </button>
            )}
            <button
              className="btn btn-outline budget-row-button budget-delete budget-delete-icon"
              type="button"
              disabled={processandoId !== null}
              onClick={() => onDeletar(orcamento.id)}
              aria-label={`Excluir cotação de ${orcamento.fornecedor}`}
              title="Excluir cotação"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14H6L5 6"></path>
                <path d="M10 11v6M14 11v6"></path>
                <path d="M9 6V4h6v2"></path>
              </svg>
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
