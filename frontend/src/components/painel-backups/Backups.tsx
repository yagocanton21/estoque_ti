import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from '../FeedbackMessage';
import { CartaoBackup } from './CartaoBackup';
import {
  ROTULO_ESTADO,
  type AgenteBackup,
  type PainelBackups,
  type TarefaBackup,
} from './types';
import './Backups.css';

type Filtro = 'todos' | 'problemas' | 'cobian' | 'duplicati';

const INTERVALO_ATUALIZACAO_MS = 60_000;
const ESTADOS_COM_PROBLEMA = ['erro', 'atrasado', 'nunca', 'aviso'];

function lerFiltroSalvo(): Filtro {
  try {
    const salvo = localStorage.getItem('backups_filtro');
    if (salvo === 'problemas' || salvo === 'cobian' || salvo === 'duplicati') return salvo;
  } catch {
    // navegador sem localStorage: usa o padrão
  }
  return 'todos';
}

interface BackupsProps {
  onAtualizado?: () => void;
}

export function Backups({ onAtualizado }: BackupsProps) {
  const [painel, setPainel] = useState<PainelBackups | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>({ type: 'loading', text: 'Carregando o painel de backups...' });
  const [filtro, setFiltro] = useState<Filtro>(lerFiltroSalvo);
  const [busca, setBusca] = useState('');
  const [verificando, setVerificando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const res = await axios.get<PainelBackups>('/api/backups/painel');
      setPainel(res.data);
      setFeedback((atual) => (atual?.type === 'loading' || atual?.type === 'error' ? null : atual));
    } catch (error) {
      console.error('Erro ao carregar o painel de backups:', error);
      setFeedback({ type: 'error', text: 'Não foi possível carregar o painel de backups. Verifique se a API está funcionando.' });
    }
  }, []);

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(timer);
  }, [carregar]);

  useEffect(() => {
    try {
      localStorage.setItem('backups_filtro', filtro);
    } catch {
      // ignora: o filtro só não fica salvo
    }
  }, [filtro]);

  const recarregarTudo = async () => {
    await carregar();
    onAtualizado?.();
  };

  const editarApelidoMaquina = async (maquina: string, atual: string) => {
    const apelido = window.prompt(`Apelido para ${maquina} (deixe vazio para remover):`, atual);
    if (apelido === null) return;
    try {
      await axios.post('/api/backups/apelido', { maquina, apelido });
      await recarregarTudo();
    } catch (err: any) {
      window.alert(err.response?.data?.detail || 'Não foi possível salvar o apelido.');
    }
  };

  const editarApelidoCartao = async (tarefa: TarefaBackup) => {
    const apelido = window.prompt(`Apelido para o backup "${tarefa.tarefa}" (deixe vazio para remover):`, tarefa.apelido_cartao);
    if (apelido === null) return;
    try {
      await axios.post('/api/backups/apelido', {
        maquina: tarefa.maquina,
        fonte: tarefa.fonte,
        tarefa: tarefa.tarefa,
        apelido,
      });
      await recarregarTudo();
    } catch (err: any) {
      window.alert(err.response?.data?.detail || 'Não foi possível salvar o apelido.');
    }
  };

  const reconhecerAlertas = async (ids?: number[]) => {
    try {
      await axios.post('/api/backups/alertas/reconhecer', { ids: ids ?? null });
      await recarregarTudo();
    } catch (error) {
      console.error('Erro ao marcar alertas como vistos:', error);
      setFeedback({ type: 'error', text: 'Não foi possível marcar os alertas como vistos.' });
    }
  };

  const verificarAgora = async () => {
    setVerificando(true);
    try {
      const res = await axios.post('/api/backups/verificar');
      await recarregarTudo();
      setFeedback({
        type: 'success',
        text: res.data.criados > 0 ? `${res.data.criados} alerta(s) novo(s) de atraso ou agente parado.` : 'Verificação concluída. Nenhum alerta novo.',
      });
    } catch (error) {
      console.error('Erro ao verificar os backups:', error);
      setFeedback({ type: 'error', text: 'Não foi possível verificar os backups agora.' });
    } finally {
      setVerificando(false);
    }
  };

  const tarefasVisiveis = useMemo(() => {
    if (!painel) return [];
    const termo = busca.trim().toLowerCase();
    return painel.tarefas.filter((t) => {
      if (filtro === 'problemas' && !ESTADOS_COM_PROBLEMA.includes(t.estado)) return false;
      if ((filtro === 'cobian' || filtro === 'duplicati') && t.fonte !== filtro) return false;
      if (!termo) return true;
      return [t.tarefa, t.apelido_cartao, t.maquina, t.apelido, t.fonte].join(' ').toLowerCase().includes(termo);
    });
  }, [painel, filtro, busca]);

  const contagem = painel?.contagem;
  const totalProblemasCartoes = painel ? painel.tarefas.filter((t) => ESTADOS_COM_PROBLEMA.includes(t.estado)).length : 0;
  const filtros: { id: Filtro; rotulo: string; total?: number }[] = [
    { id: 'todos', rotulo: 'Todos', total: painel?.tarefas.length },
    { id: 'problemas', rotulo: 'Problemas', total: totalProblemasCartoes },
    { id: 'cobian', rotulo: 'Cobian', total: painel?.tarefas.filter((t) => t.fonte === 'cobian').length },
    { id: 'duplicati', rotulo: 'Duplicati', total: painel?.tarefas.filter((t) => t.fonte === 'duplicati').length },
  ];
  const enderecoAgentes = `${window.location.origin}/api/backups`;

  return (
    <div className="backups-page">
      <div className="inventory-page-header backups-header">
        <div>
          <h1>Backups</h1>
          <p>
            Cobian Reflector nos servidores e Duplicati nas máquinas
            {painel && ` · ${painel.tarefas.length} tarefa(s) · atualizado ${new Date(painel.atualizado_em).toLocaleTimeString('pt-BR')}`}
          </p>
        </div>
        <div className="backups-header-actions">
          <button type="button" className="btn btn-outline" onClick={recarregarTudo}>
            Atualizar
          </button>
          <button type="button" className="btn btn-primary" onClick={verificarAgora} disabled={verificando}>
            {verificando ? 'Verificando...' : 'Verificar atrasos agora'}
          </button>
        </div>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      {painel && (
        <>
          {painel.problemas > 0 ? (
            <div className="backups-banner backups-banner-bad" role="alert">
              <strong>{painel.problemas} problema(s)</strong> precisam de atenção. Veja os cartões em vermelho e laranja abaixo.
            </div>
          ) : (
            <div className="backups-banner backups-banner-good">
              <strong>Tudo em dia.</strong> Nenhuma falha ou atraso no momento.
            </div>
          )}

          {contagem && (
            <div className="backups-counts" aria-label="Contagem por estado">
              {(['ok', 'erro', 'atrasado', 'nunca', 'aviso', 'executando'] as const).map((estado) => (
                <span key={estado} className={`backups-count backups-count-${estado}`}>
                  <strong>{contagem[estado] ?? 0}</strong> {ROTULO_ESTADO[estado]}
                </span>
              ))}
            </div>
          )}

          {painel.alertas.length > 0 && (
            <section className="backups-alerts" aria-labelledby="backups-alerts-title">
              <div className="backups-alerts-header">
                <h2 id="backups-alerts-title">Alertas abertos ({painel.alertas.length})</h2>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => reconhecerAlertas()}>
                  Marcar todos como vistos
                </button>
              </div>
              <ul>
                {painel.alertas.slice(0, 10).map((alerta) => (
                  <li key={alerta.id}>
                    <span>
                      {alerta.mensagem} <small>({alerta.criado_em_local})</small>
                    </span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => reconhecerAlertas([alerta.id])}>
                      Visto
                    </button>
                  </li>
                ))}
              </ul>
              {painel.alertas.length > 10 && (
                <p className="backups-alerts-more">Mostrando os 10 mais recentes de {painel.alertas.length} alertas.</p>
              )}
            </section>
          )}

          <div className="backups-toolbar">
            <div className="backups-filters" role="tablist" aria-label="Filtrar backups">
              {filtros.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filtro === f.id}
                  className={`backups-filter${filtro === f.id ? ' active' : ''}`}
                  onClick={() => setFiltro(f.id)}
                >
                  {f.rotulo}
                  {f.total !== undefined && <span className="backups-filter-count">{f.total}</span>}
                </button>
              ))}
            </div>
            <input
              type="search"
              className="backups-search"
              placeholder="Buscar máquina ou tarefa"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar máquina ou tarefa"
            />
          </div>

          {painel.tarefas.length === 0 ? (
            <div className="card backups-empty">
              <h3>Nenhum relatório recebido ainda</h3>
              <p>Os cartões aparecem quando o primeiro agente Cobian ou Duplicati enviar um relatório. Veja abaixo como conectar.</p>
            </div>
          ) : tarefasVisiveis.length === 0 ? (
            <p className="backups-empty-filter">Nenhum backup corresponde ao filtro.</p>
          ) : (
            <div className="backups-grid">
              {tarefasVisiveis.map((t) => (
                <CartaoBackup key={`${t.fonte}|${t.maquina}|${t.tarefa}`} tarefa={t} onEditarApelido={editarApelidoCartao} />
              ))}
            </div>
          )}

          {painel.agentes.length > 0 && (
            <TabelaAgentes agentes={painel.agentes} onEditarApelido={editarApelidoMaquina} />
          )}

          <details className="card backups-setup">
            <summary>Como conectar servidores e máquinas</summary>
            <p>
              <strong>Agente Cobian (servidores):</strong> no instalador do agente use <code>-PanelUrl '{enderecoAgentes}'</code> e o
              token de envio. Em servidores que já têm o agente, troque só o <code>panel_url</code> em
              {' '}<code>C:\BackupMonitor\cobian-agent.config.json</code>.
            </p>
            <p>
              <strong>Duplicati (todas as máquinas):</strong> nas opções do relatório HTTP use
              {' '}<code>{`${enderecoAgentes}/api/duplicati/<TOKEN>/<NOME-DA-MAQUINA>`}</code> com formato Json.
            </p>
            <p className="backups-setup-version">Painel de backups v{painel.versao}</p>
          </details>
        </>
      )}
    </div>
  );
}

interface TabelaAgentesProps {
  agentes: AgenteBackup[];
  onEditarApelido: (maquina: string, atual: string) => void;
}

function TabelaAgentes({ agentes, onEditarApelido }: TabelaAgentesProps) {
  return (
    <section className="backups-agents" aria-labelledby="backups-agents-title">
      <h2 id="backups-agents-title">Agentes Cobian ({agentes.length})</h2>
      <div className="backups-agents-table">
        <table>
          <thead>
            <tr>
              <th>Servidor</th>
              <th>Estado</th>
              <th>Último contato</th>
              <th>Serviço Cobian</th>
              <th>Logs lidos</th>
              <th>Versão</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            {agentes.map((a) => (
              <tr key={a.maquina}>
                <td>
                  {a.apelido ? (
                    <>
                      <strong>{a.apelido}</strong> ({a.maquina})
                    </>
                  ) : (
                    a.maquina
                  )}
                  <button
                    type="button"
                    className="backup-edit-button"
                    onClick={() => onEditarApelido(a.maquina, a.apelido)}
                    title="Definir apelido do servidor"
                    aria-label={`Definir apelido do servidor ${a.maquina}`}
                  >
                    ✎
                  </button>
                </td>
                <td>
                  <span className={`backup-pill backup-pill-${a.estado}`}>{ROTULO_ESTADO[a.estado]}</span>
                </td>
                <td>{a.ultimo_contato_legivel}</td>
                <td>{a.servico_cobian || '—'}</td>
                <td>{a.logs_lidos ?? '—'}</td>
                <td>{a.versao || '—'}</td>
                <td>{a.problema}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
