export type EstadoBackup = 'erro' | 'atrasado' | 'nunca' | 'aviso' | 'executando' | 'ok';
export type EstadoAgente = 'ok' | 'parado' | 'servico' | 'conflito' | 'aviso';
export type FonteBackup = 'cobian' | 'duplicati';

export interface DiaHistorico {
  data: string;
  estado: 'ok' | 'erro' | 'aviso' | 'sem';
  execucoes: number;
}

export interface TarefaBackup {
  fonte: FonteBackup;
  maquina: string;
  apelido: string;
  apelido_cartao: string;
  tarefa: string;
  prazo_horas: number;
  dica_agenda: string;
  dias_ignorados: number[];
  link_duplicati: string;
  historico: DiaHistorico[];
  estado: EstadoBackup;
  ultima_execucao: string | null;
  ultima_execucao_legivel: string;
  ultima_execucao_local: string;
  idade_horas: number | null;
  erros: number;
  avisos: number;
  processados: number;
  copiados: number;
  tamanho: string;
  duracao: string;
  destino: string;
  mensagem: string;
}

export interface AgenteBackup {
  maquina: string;
  apelido: string;
  fonte: FonteBackup;
  versao: string;
  ultimo_contato: string | null;
  ultimo_contato_legivel: string;
  estado: EstadoAgente;
  servico_cobian: string;
  problema: string;
  logs_lidos: number | null;
  idioma: string | null;
}

export interface AlertaBackup {
  id: number;
  criado_em: string;
  criado_em_local: string;
  nivel: string;
  fonte: string | null;
  maquina: string | null;
  tarefa: string | null;
  mensagem: string;
}

export type Contagem = Record<EstadoBackup, number>;

export interface PainelBackups {
  versao: string;
  atualizado_em: string;
  contagem: Contagem;
  problemas: number;
  tarefas: TarefaBackup[];
  agentes: AgenteBackup[];
  alertas: AlertaBackup[];
}

export interface ItemResumoBackup {
  tipo: 'backup' | 'agente';
  estado: EstadoBackup | EstadoAgente;
  fonte: FonteBackup;
  maquina: string;
  apelido: string;
  tarefa: string;
  apelido_cartao: string;
  ultima_execucao_legivel: string;
  ultima_execucao: string | null;
  erros: number;
  mensagem: string;
  prazo_horas: number | null;
}

export interface ResumoBackups {
  versao: string;
  atualizado_em: string;
  total: number;
  agentes: number;
  contagem: Contagem;
  problemas: number;
  itens: ItemResumoBackup[];
  alertas_abertos: number;
}

export const ROTULO_ESTADO: Record<string, string> = {
  ok: 'OK',
  erro: 'Erro',
  atrasado: 'Atrasado',
  nunca: 'Sem relatório',
  aviso: 'Aviso',
  executando: 'Executando',
  parado: 'Agente parado',
  servico: 'Serviço parado',
  conflito: 'Conflito',
};

export const ROTULO_FONTE: Record<FonteBackup, string> = {
  cobian: 'Cobian',
  duplicati: 'Duplicati',
};

export const ESTADOS_PROBLEMA = ['erro', 'atrasado', 'nunca', 'parado', 'servico', 'conflito'];
