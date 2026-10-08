import type { EstatisticasIps } from './types';

interface KpisMaquinasProps {
  estatisticas: EstatisticasIps | null;
}

export function KpisMaquinas({ estatisticas }: KpisMaquinasProps) {
  if (!estatisticas) return null;

  return (
    <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
      <div className="card kpi-card">
        <div
          className="kpi-icon-wrap"
          style={{ background: 'rgba(0, 85, 255, 0.15)', color: 'var(--accent-secondary)' }}
        >
          💻
        </div>
        <div>
          <span className="kpi-label">Total de Máquinas</span>
          <strong className="kpi-value">{estatisticas.total_maquinas}</strong>
        </div>
      </div>

      <div className="card kpi-card">
        <div
          className="kpi-icon-wrap"
          style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)' }}
        >
          🌐
        </div>
        <div>
          <span className="kpi-label">IPs Atribuídos</span>
          <strong className="kpi-value">{estatisticas.total_com_ip}</strong>
        </div>
      </div>

      <div className="card kpi-card">
        <div
          className="kpi-icon-wrap"
          style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)' }}
        >
          👤
        </div>
        <div>
          <span className="kpi-label">Usuários no AD</span>
          <strong className="kpi-value">{estatisticas.total_com_ad}</strong>
        </div>
      </div>

      <div className="card kpi-card">
        <div
          className="kpi-icon-wrap"
          style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}
        >
          🏢
        </div>
        <div>
          <span className="kpi-label">Setores Mapeados</span>
          <strong className="kpi-value">{estatisticas.total_setores}</strong>
        </div>
      </div>
    </div>
  );
}
