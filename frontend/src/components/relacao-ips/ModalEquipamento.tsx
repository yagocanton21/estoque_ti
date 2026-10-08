import { useState, useEffect } from 'react';
import type { Equipamento, EquipamentoFormDados, TipoEquipamento } from './types';

interface ModalEquipamentoProps {
  aberto: boolean;
  tipo: TipoEquipamento;
  emEdicao: Equipamento | null;
  locais: string[];
  salvando: boolean;
  onClose: () => void;
  onSalvar: (dados: EquipamentoFormDados, id?: number) => Promise<void>;
}

export function ModalEquipamento({
  aberto,
  tipo,
  emEdicao,
  locais,
  salvando,
  onClose,
  onSalvar,
}: ModalEquipamentoProps) {
  const [form, setForm] = useState<EquipamentoFormDados>({
    tipo_id: tipo.id,
    nome: '',
    ip: '',
    mac: '',
    modelo: '',
    local: '',
    observacoes: '',
    ativo: true,
  });
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (emEdicao) {
      setForm({
        tipo_id: emEdicao.tipo_id,
        nome: emEdicao.nome || '',
        ip: emEdicao.ip || '',
        mac: emEdicao.mac || '',
        modelo: emEdicao.modelo || '',
        local: emEdicao.local || '',
        observacoes: emEdicao.observacoes || '',
        ativo: emEdicao.ativo,
      });
    } else {
      setForm({
        tipo_id: tipo.id,
        nome: '',
        ip: '',
        mac: '',
        modelo: '',
        local: '',
        observacoes: '',
        ativo: true,
      });
    }
    setErro(null);
  }, [emEdicao, tipo.id, aberto]);

  if (!aberto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!form.nome.trim()) {
      setErro('O nome é obrigatório.');
      return;
    }
    try {
      await onSalvar(
        {
          ...form,
          nome: form.nome.trim(),
          ip: form.ip.trim(),
          mac: form.mac.trim(),
          modelo: form.modelo.trim(),
          local: form.local.trim(),
          observacoes: form.observacoes.trim(),
        },
        emEdicao?.id
      );
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao salvar equipamento.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="edit-modal machine-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-equip-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="edit-modal-header">
          <div>
            <span>{emEdicao ? `ID #${emEdicao.id}` : tipo.nome}</span>
            <h2 id="modal-equip-title">{emEdicao ? 'Editar equipamento' : 'Novo equipamento'}</h2>
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
            <label className="form-field" htmlFor="eq-nome">
              <span>Nome / Identificação *</span>
              <input
                id="eq-nome"
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                autoFocus
                autoComplete="off"
              />
            </label>

            <label className="form-field" htmlFor="eq-ip">
              <span>Endereço IP</span>
              <input
                id="eq-ip"
                type="text"
                placeholder="Ex: 192.168.1.10"
                value={form.ip}
                onChange={(e) => setForm({ ...form, ip: e.target.value })}
                autoComplete="off"
              />
            </label>

            <label className="form-field" htmlFor="eq-modelo">
              <span>Modelo</span>
              <input
                id="eq-modelo"
                type="text"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                autoComplete="off"
              />
            </label>

            <label className="form-field" htmlFor="eq-mac">
              <span>MAC Address</span>
              <input
                id="eq-mac"
                type="text"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={form.mac}
                onChange={(e) => setForm({ ...form, mac: e.target.value })}
                autoComplete="off"
              />
            </label>

            <label className="form-field form-field-wide" htmlFor="eq-local">
              <span>Local / Setor</span>
              <input
                id="eq-local"
                type="text"
                list="eq-locais-datalist"
                placeholder="Ex: Almoxarifado, Expedição"
                value={form.local}
                onChange={(e) => setForm({ ...form, local: e.target.value })}
                autoComplete="off"
              />
              <datalist id="eq-locais-datalist">
                {locais.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </label>

            <label className="form-field form-field-wide" htmlFor="eq-obs">
              <span>Observações</span>
              <textarea
                id="eq-obs"
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
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
              {salvando ? 'Salvando...' : emEdicao ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
