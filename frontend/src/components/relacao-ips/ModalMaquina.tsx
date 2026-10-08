import { useState, useEffect } from 'react';
import type { Maquina, MaquinaFormDados } from './types';
import { formatarUsuarioAd } from './CardMaquina';

interface ModalMaquinaProps {
  maquinaParaEditar?: Maquina | null;
  setoresDisponiveis: string[];
  salvando: boolean;
  onClose: () => void;
  onSalvar: (dados: MaquinaFormDados, id?: number) => Promise<void>;
}

export function ModalMaquina({
  maquinaParaEditar,
  setoresDisponiveis,
  salvando,
  onClose,
  onSalvar,
}: ModalMaquinaProps) {
  const [formData, setFormData] = useState<MaquinaFormDados>({
    nome_maquina: '',
    ip: '',
    usuario: '',
    usuario_ad: '',
    setor: '',
    sistema_operacional: 'Windows 11 Pro',
    office: '',
    antivirus: 'Windows Defender',
    observacoes: '',
    ativo: true,
  });
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (maquinaParaEditar) {
      setFormData({
        nome_maquina: maquinaParaEditar.nome_maquina || '',
        ip: maquinaParaEditar.ip || '',
        usuario: maquinaParaEditar.usuario || '',
        usuario_ad: formatarUsuarioAd(maquinaParaEditar.usuario_ad),
        setor: maquinaParaEditar.setor || '',
        sistema_operacional: maquinaParaEditar.sistema_operacional || '',
        office: maquinaParaEditar.office || '',
        antivirus: maquinaParaEditar.antivirus || '',
        observacoes: maquinaParaEditar.observacoes || '',
        ativo: maquinaParaEditar.ativo,
      });
    } else {
      setFormData({
        nome_maquina: '',
        ip: '',
        usuario: '',
        usuario_ad: '',
        setor: '',
        sistema_operacional: 'Windows 11 Pro',
        office: '',
        antivirus: 'Windows Defender',
        observacoes: '',
        ativo: true,
      });
    }
  }, [maquinaParaEditar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeLimpo = formData.nome_maquina.trim();
    if (!nomeLimpo) {
      setErro('O nome da máquina ou hostname é obrigatório.');
      return;
    }

    try {
      await onSalvar(
        {
          ...formData,
          nome_maquina: nomeLimpo,
          ip: formData.ip.trim(),
          usuario: formData.usuario.trim(),
          usuario_ad: formatarUsuarioAd(formData.usuario_ad),
          setor: formData.setor.trim(),
          sistema_operacional: formData.sistema_operacional.trim(),
          office: formData.office.trim(),
          antivirus: formData.antivirus.trim(),
          observacoes: formData.observacoes.trim(),
        },
        maquinaParaEditar?.id
      );
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao salvar informações da máquina.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="edit-modal machine-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-maquina-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="edit-modal-header">
          <div>
            <span>{maquinaParaEditar ? `ID #${maquinaParaEditar.id}` : 'Cadastro de Dispositivo'}</span>
            <h2 id="modal-maquina-title">
              {maquinaParaEditar ? 'Editar Máquina / IP' : 'Cadastrar Nova Máquina'}
            </h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        {erro && (
          <div className="modal-error-alert" style={{ marginBottom: '1rem' }}>
            <span>⚠️ {erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="simple-form">
          <div className="edit-form-grid">
            <label className="form-field" htmlFor="form-nome-maquina">
              <span>Nome da Máquina / Hostname *</span>
              <input
                id="form-nome-maquina"
                type="text"
                placeholder="Ex: TI-DESK01, NOTE-FIN02"
                value={formData.nome_maquina}
                onChange={(e) => setFormData({ ...formData, nome_maquina: e.target.value })}
                required
                autoFocus
                autoComplete="off"
              />
              <small>Identificação da máquina na rede.</small>
            </label>

            <label className="form-field" htmlFor="form-ip">
              <span>Endereço IP</span>
              <input
                id="form-ip"
                type="text"
                placeholder="Ex: 192.168.1.150"
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                autoComplete="off"
              />
              <small>IP estático ou atribuído pelo DHCP.</small>
            </label>

            <label className="form-field" htmlFor="form-usuario">
              <span>Usuário / Colaborador</span>
              <input
                id="form-usuario"
                type="text"
                placeholder="Ex: Carlos Alberto Silva"
                value={formData.usuario}
                onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                autoComplete="off"
              />
              <small>Pessoa responsável pelo uso.</small>
            </label>

            <label className="form-field" htmlFor="form-usuario-ad">
              <span>Usuário do AD (Active Directory)</span>
              <input
                id="form-usuario-ad"
                type="text"
                placeholder="Ex: carlos.silva"
                value={formData.usuario_ad}
                onChange={(e) => setFormData({ ...formData, usuario_ad: e.target.value })}
                autoComplete="off"
              />
              <small>Login de domínio corporativo.</small>
            </label>

            <label className="form-field" htmlFor="form-setor">
              <span>Setor / Departamento</span>
              <input
                id="form-setor"
                type="text"
                placeholder="Ex: Financeiro, TI, RH"
                list="setores-datalist"
                value={formData.setor}
                onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                autoComplete="off"
              />
              <datalist id="setores-datalist">
                {setoresDisponiveis.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>

            <label className="form-field" htmlFor="form-so">
              <span>Sistema Operacional</span>
              <input
                id="form-so"
                type="text"
                placeholder="Ex: Windows 11 Pro, Windows 10"
                list="so-datalist"
                value={formData.sistema_operacional}
                onChange={(e) => setFormData({ ...formData, sistema_operacional: e.target.value })}
                autoComplete="off"
              />
              <datalist id="so-datalist">
                <option value="Windows 11 Pro" />
                <option value="Windows 10 Pro" />
                <option value="Windows 11 Home" />
                <option value="Windows 10 Home" />
                <option value="Windows Server 2022" />
                <option value="Windows Server 2019" />
                <option value="Linux Ubuntu" />
              </datalist>
            </label>

            <label className="form-field" htmlFor="form-office">
              <span>Versão do Office / Licença</span>
              <input
                id="form-office"
                type="text"
                placeholder="Ex: Microsoft 365, Office 2021, 2019"
                list="office-datalist"
                value={formData.office}
                onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                autoComplete="off"
              />
              <datalist id="office-datalist">
                <option value="Microsoft 365" />
                <option value="Office 2021" />
                <option value="Office 2019" />
                <option value="Office 2016" />
                <option value="Office 2013" />
                <option value="Office 2010" />
                <option value="Office 2007" />
                <option value="Office 2003" />
                <option value="Sem Office" />
              </datalist>
            </label>

            <label className="form-field" htmlFor="form-antivirus">
              <span>Antivírus / Proteção</span>
              <input
                id="form-antivirus"
                type="text"
                placeholder="Ex: Windows Defender, Kaspersky"
                list="av-datalist"
                value={formData.antivirus}
                onChange={(e) => setFormData({ ...formData, antivirus: e.target.value })}
                autoComplete="off"
              />
              <datalist id="av-datalist">
                <option value="Windows Defender" />
                <option value="Kaspersky Endpoint" />
                <option value="Bitdefender GravityZone" />
                <option value="CrowdStrike Falcon" />
                <option value="Trend Micro" />
                <option value="Sophos" />
              </datalist>
            </label>

            <label className="form-field form-field-wide" htmlFor="form-observacoes">
              <span>Observações / Detalhes</span>
              <textarea
                id="form-observacoes"
                rows={2}
                placeholder="Informações adicionais, histórico de troca, notas..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  color: 'var(--text-main)',
                  resize: 'vertical',
                }}
              />
            </label>
          </div>

          <div className="edit-modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : maquinaParaEditar ? 'Salvar Alterações' : 'Cadastrar Máquina'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
