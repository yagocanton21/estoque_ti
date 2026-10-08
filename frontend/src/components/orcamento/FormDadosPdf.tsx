interface FormDadosPdfProps {
  cidade: string;
  setCidade: (v: string) => void;
  solicitante: string;
  setSolicitante: (v: string) => void;
  destinatario: string;
  setDestinatario: (v: string) => void;
  assinatura: string;
  setAssinatura: (v: string) => void;
}

export function FormDadosPdf({
  cidade,
  setCidade,
  solicitante,
  setSolicitante,
  destinatario,
  setDestinatario,
  assinatura,
  setAssinatura,
}: FormDadosPdfProps) {
  return (
    <details className="budget-section budget-collapsible">
      <summary>
        <span>
          <strong>Dados do PDF</strong>
          <small>Cidade, destinatário e assinatura</small>
        </span>
        <span className="budget-collapsible-icon" aria-hidden="true">⌄</span>
      </summary>
      <div className="budget-collapsible-content">
        <div className="edit-form-grid">
          <label className="form-field form-field-wide">
            <span>Cidade</span>
            <input value={cidade} onChange={(evento) => setCidade(evento.target.value)} />
          </label>
          <label className="form-field">
            <span>De</span>
            <input value={solicitante} onChange={(evento) => setSolicitante(evento.target.value)} />
          </label>
          <label className="form-field">
            <span>Para</span>
            <input value={destinatario} onChange={(evento) => setDestinatario(evento.target.value)} />
          </label>
          <label className="form-field form-field-wide">
            <span>Assinatura</span>
            <input value={assinatura} onChange={(evento) => setAssinatura(evento.target.value)} />
          </label>
        </div>
      </div>
    </details>
  );
}
