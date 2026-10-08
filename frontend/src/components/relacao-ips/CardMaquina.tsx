import type { Maquina } from './types';

interface CardMaquinaProps {
  maquina: Maquina;
  ipCopiadoId: number | null;
  onCopiarIp: (ip: string, id: number) => void;
  onEditar: (m: Maquina) => void;
  onExcluir: (m: Maquina) => void;
}

export function formatarUsuarioAd(ad?: string | null): string {
  if (!ad) return '';
  let limpo = ad.trim();
  if (limpo.includes('\\')) {
    limpo = limpo.split('\\').pop() || limpo;
  }
  if (limpo.includes('/')) {
    limpo = limpo.split('/').pop() || limpo;
  }
  return limpo.replace(/^@+/, '').trim();
}

export function simplificarNomeOffice(office?: string | null): string {
  if (!office) return '';
  const limpo = office.trim();
  if (!limpo || /^(nao identificado|não identificado|falha na consulta|falha|sem office|-|—)$/i.test(limpo)) {
    return '';
  }
  if (/\b(365|o365|m365)\b/i.test(limpo)) {
    return 'Microsoft 365';
  }
  const matchAno = limpo.match(/\b(20\d\d)\b/);
  if (matchAno) {
    return `Office ${matchAno[1]}`;
  }
  return limpo;
}

export function CardMaquina({
  maquina: m,
  ipCopiadoId,
  onCopiarIp,
  onEditar,
  onExcluir,
}: CardMaquinaProps) {
  const usuarioAdLimpo = formatarUsuarioAd(m.usuario_ad);

  return (
    <div className="machine-list-row">
      <div className="ml-cell ml-machine">
        <strong className="ml-hostname" title={m.nome_maquina}>
          {m.nome_maquina}
        </strong>
        {m.ip ? (
          <button
            type="button"
            className="ip-badge-button"
            onClick={() => onCopiarIp(m.ip!, m.id)}
            title="Clique para copiar o IP"
          >
            <code>{m.ip}</code>
            <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
              {ipCopiadoId === m.id ? '✓ copiado' : '📋'}
            </span>
          </button>
        ) : (
          <span className="ml-muted">Sem IP</span>
        )}
      </div>

      <div className="ml-cell ml-user">
        <span className="ml-user-name" title={m.usuario || ''}>
          {m.usuario || <span className="ml-muted">Não informado</span>}
        </span>
        {usuarioAdLimpo && (
          <span className="ad-badge" title={`Usuário AD: ${usuarioAdLimpo}`}>
            @{usuarioAdLimpo}
          </span>
        )}
      </div>

      <div className="ml-cell ml-setor">
        {m.setor ? (
          <span
            className="badge badge-info"
            style={{
              background: 'rgba(0, 85, 255, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(0, 85, 255, 0.25)',
            }}
          >
            {m.setor}
          </span>
        ) : (
          <span className="ml-muted">—</span>
        )}
      </div>

      <div className="ml-cell ml-software">
        <div>
          <em>S.O.</em>
          <span>{m.sistema_operacional || '—'}</span>
        </div>
        <div>
          <em>Office</em>
          <span title={m.office || ''}>{simplificarNomeOffice(m.office) || '—'}</span>
        </div>
        <div>
          <em>Antivírus</em>
          <span>{m.antivirus || '—'}</span>
        </div>
      </div>

      <div className="ml-cell ml-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          onClick={() => onEditar(m)}
          title="Editar máquina"
        >
          Editar
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm danger-outline-button"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          onClick={() => onExcluir(m)}
          title="Excluir máquina"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}
