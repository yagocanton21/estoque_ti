interface HistoricosProps {
  onNavigate: (tab: string) => void;
}

export function Historicos({ onNavigate }: HistoricosProps) {
  return (
    <div className="history-hub">
      <div className="page-introduction">
        <h1>Históricos</h1>
        <p>Escolha qual atividade anterior você deseja consultar.</p>
      </div>

      <div className="history-options">
        <button type="button" className="history-option" onClick={() => onNavigate('historico_ajustes')}>
          <span className="history-option-icon" aria-hidden="true">±</span>
          <span>
            <strong>Ajustes de estoque</strong>
            <small>Veja correções de saldo, valores anteriores e motivos.</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>

        <button type="button" className="history-option" onClick={() => onNavigate('historico_compras')}>
          <span className="history-option-icon" aria-hidden="true">✓</span>
          <span>
            <strong>Compras concluídas</strong>
            <small>Veja os produtos que já foram comprados.</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>

        <button type="button" className="history-option" onClick={() => onNavigate('historico_devolucoes')}>
          <span className="history-option-icon" aria-hidden="true">↩</span>
          <span>
            <strong>Devoluções de empréstimos</strong>
            <small>Veja os equipamentos que já foram devolvidos.</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
