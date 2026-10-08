import type { Equipamento } from './types';

interface CardEquipamentoProps {
  equipamento: Equipamento;
  ipCopiadoId: number | null;
  onCopiarIp: (ip: string, id: number) => void;
  onEditar: (eq: Equipamento) => void;
  onExcluir: (eq: Equipamento) => void;
}

export function CardEquipamento({
  equipamento: eq,
  ipCopiadoId,
  onCopiarIp,
  onEditar,
  onExcluir,
}: CardEquipamentoProps) {
  return (
    <div className="machine-list-row">
      <div className="ml-cell ml-machine">
        <strong className="ml-hostname">{eq.nome}</strong>
        {eq.ip ? (
          <button
            type="button"
            className="ip-badge-button"
            onClick={() => onCopiarIp(eq.ip!, eq.id)}
            title="Clique para copiar o IP"
          >
            <code>{eq.ip}</code>
            <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
              {ipCopiadoId === eq.id ? '✓ copiado' : '📋'}
            </span>
          </button>
        ) : (
          <span className="ml-muted">Sem IP</span>
        )}
      </div>

      <div className="ml-cell ml-software">
        <div>
          <em>Modelo</em>
          <span>{eq.modelo || '—'}</span>
        </div>
        <div>
          <em>MAC</em>
          <span style={{ fontFamily: 'monospace' }}>{eq.mac || '—'}</span>
        </div>
      </div>

      <div className="ml-cell ml-setor">
        {eq.local ? (
          <span
            className="badge badge-info"
            style={{
              background: 'rgba(0, 85, 255, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(0, 85, 255, 0.25)',
            }}
          >
            {eq.local}
          </span>
        ) : (
          <span className="ml-muted">—</span>
        )}
      </div>

      <div className="ml-cell">
        <span className="ml-user-name" style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
          {eq.observacoes || '—'}
        </span>
      </div>

      <div className="ml-cell ml-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          onClick={() => onEditar(eq)}
        >
          Editar
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm danger-outline-button"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          onClick={() => onExcluir(eq)}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}
