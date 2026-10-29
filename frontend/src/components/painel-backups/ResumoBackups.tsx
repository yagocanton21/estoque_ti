import type { ReactNode } from 'react';
import { ROTULO_ESTADO, ROTULO_FONTE, type ResumoBackups as Resumo } from './types';
import './Backups.css';

interface ResumoBackupsProps {
  resumo: Resumo | null;
  erro: boolean;
  onVerTodos: () => void;
}

const ITENS_EM_DESTAQUE = 5;

export function ResumoBackups({ resumo, erro, onVerTodos }: ResumoBackupsProps) {
  const itens = resumo?.itens ?? [];
  const destaque = itens.slice(0, ITENS_EM_DESTAQUE);
  const semDados = resumo !== null && resumo.total === 0 && resumo.agentes === 0;

  let status: ReactNode;
  if (!resumo) {
    status = (
      <div className="dashboard-backup-status dashboard-backup-status-unknown">
        <span className="dashboard-backup-dot" aria-hidden="true" />
        <span>{erro ? 'Não foi possível consultar o painel de backups.' : 'Consultando backups...'}</span>
      </div>
    );
  } else if (semDados) {
    status = (
      <div className="dashboard-backup-status dashboard-backup-status-unknown">
        <span className="dashboard-backup-dot" aria-hidden="true" />
        <span>Nenhum servidor ou máquina enviou relatório ainda.</span>
      </div>
    );
  } else if (resumo.problemas > 0) {
    status = (
      <div className="dashboard-backup-status dashboard-backup-status-bad" role="alert">
        <span className="dashboard-backup-dot" aria-hidden="true" />
        <strong>{resumo.problemas} problema(s)</strong>
        <span>
          {resumo.contagem.ok} de {resumo.total} backups OK
        </span>
      </div>
    );
  } else {
    status = (
      <div className="dashboard-backup-status dashboard-backup-status-ok">
        <span className="dashboard-backup-dot" aria-hidden="true" />
        <strong>Todos os backups OK</strong>
        <span>
          {resumo.total} backup(s) em dia{resumo.agentes > 0 && ` · ${resumo.agentes} servidor(es) comunicando`}
        </span>
      </div>
    );
  }

  return (
    <div className="card dashboard-backup-card">
      <div className="flex justify-between items-center dashboard-card-header">
        <h2>Backups</h2>
        <button className="btn btn-primary" onClick={onVerTodos}>
          Ver Backups
        </button>
      </div>

      {status}

      {destaque.length > 0 && (
        <div className="dashboard-backup-list">
          {destaque.map((item) => {
            const nome = item.tipo === 'agente' ? `Agente ${item.apelido || item.maquina}` : item.apelido_cartao || item.tarefa;
            const ehProblema = item.tipo === 'agente' || ['erro', 'atrasado', 'nunca'].includes(item.estado);
            return (
              <div key={`${item.tipo}|${item.fonte}|${item.maquina}|${item.tarefa}`} className="dashboard-backup-item">
                <div>
                  <h4>{nome}</h4>
                  <p>
                    {item.tipo === 'backup' && `${item.apelido || item.maquina} · ${ROTULO_FONTE[item.fonte] ?? item.fonte} · `}
                    {item.tipo === 'agente' ? 'último contato' : 'última execução'} {item.ultima_execucao_legivel}
                    {item.mensagem && ` · ${item.mensagem}`}
                  </p>
                </div>
                <span className={ehProblema ? 'badge badge-danger' : 'badge badge-warning'}>
                  {ROTULO_ESTADO[item.estado] ?? item.estado}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {itens.length > ITENS_EM_DESTAQUE && (
        <p className="dashboard-backup-note">
          Mostrando {ITENS_EM_DESTAQUE} de {itens.length} itens que precisam de atenção.
        </p>
      )}
    </div>
  );
}
