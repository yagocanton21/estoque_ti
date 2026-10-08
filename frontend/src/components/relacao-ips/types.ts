export interface Maquina {
  id: number;
  usuario: string | null;
  nome_maquina: string;
  usuario_ad: string | null;
  ip: string | null;
  sistema_operacional: string | null;
  office: string | null;
  setor: string | null;
  antivirus: string | null;
  observacoes: string | null;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

export interface EstatisticasIps {
  total_maquinas: number;
  total_com_ip: number;
  total_com_ad: number;
  total_setores: number;
}

export interface MaquinaFormDados {
  usuario: string;
  nome_maquina: string;
  usuario_ad: string;
  ip: string;
  sistema_operacional: string;
  office: string;
  setor: string;
  antivirus: string;
  observacoes: string;
  ativo: boolean;
}

export interface TipoEquipamento {
  id: number;
  nome: string;
  total: number;
}

export interface Equipamento {
  id: number;
  tipo_id: number;
  nome: string;
  ip: string | null;
  mac: string | null;
  modelo: string | null;
  local: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface EquipamentoFormDados {
  tipo_id: number;
  nome: string;
  ip: string;
  mac: string;
  modelo: string;
  local: string;
  observacoes: string;
  ativo: boolean;
}
