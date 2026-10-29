import { ROTULO_ESTADO, ROTULO_FONTE, type TarefaBackup } from './types';

interface CartaoBackupProps {
  tarefa: TarefaBackup;
  onEditarApelido: (tarefa: TarefaBackup) => void;
}

const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function CartaoBackup({ tarefa, onEditarApelido }: CartaoBackupProps) {
  const titulo = tarefa.apelido_cartao || tarefa.tarefa;
  const mostrarMensagem = tarefa.mensagem && ['erro', 'aviso', 'nunca'].includes(tarefa.estado);
  const diasIgnorados = tarefa.dias_ignorados.map((d) => DIAS_SEMANA[d]).join('/');

  return (
    <article className={`backup-card backup-card-${tarefa.estado}`}>
      <header className="backup-card-top">
        <div className="backup-card-heading">
          <h3>
            {titulo}
            <button
              type="button"
              className="backup-edit-button"
              onClick={() => onEditarApelido(tarefa)}
              title="Definir apelido deste backup"
              aria-label={`Definir apelido do backup ${tarefa.tarefa}`}
            >
              ✎
            </button>
          </h3>
          <p className="backup-card-meta">
            {tarefa.apelido_cartao && <span>{tarefa.tarefa} · </span>}
            {tarefa.apelido ? (
              <>
                <strong>{tarefa.apelido}</strong> ({tarefa.maquina})
              </>
            ) : (
              tarefa.maquina
            )}
            {' · '}
            {ROTULO_FONTE[tarefa.fonte]} · prazo {tarefa.prazo_horas} h
            {diasIgnorados && ` (sem ${diasIgnorados})`}
            {tarefa.dica_agenda && ` · ${tarefa.dica_agenda}`}
            {tarefa.destino && ` · destino ${tarefa.destino}`}
            {tarefa.link_duplicati && (
              <>
                {' · '}
                <a href={tarefa.link_duplicati} target="_blank" rel="noopener noreferrer">
                  abrir Duplicati
                </a>
              </>
            )}
          </p>
        </div>
        <span className={`backup-pill backup-pill-${tarefa.estado}`}>{ROTULO_ESTADO[tarefa.estado]}</span>
      </header>

      <div className="backup-card-values">
        <div>
          <strong>{tarefa.ultima_execucao_legivel}</strong>
          <span>{tarefa.ultima_execucao ? tarefa.ultima_execucao_local : 'última execução'}</span>
        </div>
        <div>
          <strong>{tarefa.erros}</strong>
          <span>erros ({tarefa.avisos} avisos)</span>
        </div>
        <div>
          <strong>{tarefa.tamanho}</strong>
          <span>{tarefa.copiados} arq. copiados</span>
        </div>
        <div>
          <strong>{tarefa.duracao}</strong>
          <span>duração</span>
        </div>
      </div>

      <div className="backup-history" aria-label="Últimos 30 dias">
        {tarefa.historico.map((dia) => (
          <span
            key={dia.data}
            className={`backup-history-day backup-history-${dia.estado}`}
            title={`${dia.data.split('-').reverse().join('/')} · ${dia.estado === 'sem' ? 'sem execução' : dia.estado} (${dia.execucoes} exec.)`}
          />
        ))}
      </div>

      {mostrarMensagem && <p className="backup-card-message">{tarefa.mensagem}</p>}
    </article>
  );
}
