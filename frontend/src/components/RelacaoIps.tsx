import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import type { TipoEquipamento } from './relacao-ips/types';
import { MaquinasTab } from './relacao-ips/MaquinasTab';
import { EquipamentosTab } from './relacao-ips/EquipamentosTab';
import './relacao-ips/RelacaoIps.css';

const ABA_MAQUINAS = 'maquinas';

export function RelacaoIps() {
  const [tipos, setTipos] = useState<TipoEquipamento[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<string>(
    () => localStorage.getItem('relacao_ips_aba') || ABA_MAQUINAS
  );
  const [novoTipo, setNovoTipo] = useState<string | null>(null);
  const [erroTipo, setErroTipo] = useState<string | null>(null);

  const carregarTipos = useCallback(async () => {
    try {
      const res = await axios.get('/api/equipamentos/tipos');
      setTipos(res.data);
    } catch (err) {
      console.error('Erro ao carregar tipos de equipamento:', err);
    }
  }, []);

  useEffect(() => {
    carregarTipos();
  }, [carregarTipos]);

  useEffect(() => {
    localStorage.setItem('relacao_ips_aba', abaAtiva);
  }, [abaAtiva]);

  const tipoAtivo = tipos.find((t) => `tipo-${t.id}` === abaAtiva) || null;

  // Se a aba salva não existe mais, volta para Máquinas
  useEffect(() => {
    if (tipos.length > 0 && abaAtiva !== ABA_MAQUINAS && !tipoAtivo) {
      setAbaAtiva(ABA_MAQUINAS);
    }
  }, [tipos, abaAtiva, tipoAtivo]);

  const criarTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroTipo(null);
    const nome = (novoTipo || '').trim();
    if (!nome) return;
    try {
      const res = await axios.post('/api/equipamentos/tipos', { nome });
      await carregarTipos();
      setAbaAtiva(`tipo-${res.data.id}`);
      setNovoTipo(null);
    } catch (err: any) {
      setErroTipo(err.response?.data?.detail || 'Não foi possível criar o tipo.');
    }
  };

  const renomearTipo = async () => {
    if (!tipoAtivo) return;
    const nome = window.prompt('Novo nome da categoria:', tipoAtivo.nome);
    if (!nome || !nome.trim() || nome.trim() === tipoAtivo.nome) return;
    try {
      await axios.put(`/api/equipamentos/tipos/${tipoAtivo.id}`, { nome: nome.trim() });
      await carregarTipos();
    } catch (err: any) {
      window.alert(err.response?.data?.detail || 'Não foi possível renomear.');
    }
  };

  const excluirTipo = async () => {
    if (!tipoAtivo) return;
    if (!window.confirm(`Excluir a categoria "${tipoAtivo.nome}"? Só é possível se ela estiver vazia.`)) return;
    try {
      await axios.delete(`/api/equipamentos/tipos/${tipoAtivo.id}`);
      setAbaAtiva(ABA_MAQUINAS);
      await carregarTipos();
    } catch (err: any) {
      window.alert(err.response?.data?.detail || 'Não foi possível excluir a categoria.');
    }
  };

  return (
    <div className="relacao-ips-hub">
      <div className="inventory-page-header" style={{ marginBottom: '0.75rem' }}>
        <div>
          <h1>Relação de IPs</h1>
          <p>Máquinas, coletores, access points, roteadores e demais equipamentos da rede.</p>
        </div>
      </div>

      <div className="ips-tabs" role="tablist" aria-label="Categorias da Relação de IPs">
        <button
          type="button"
          role="tab"
          id="tab-maquinas"
          aria-selected={abaAtiva === ABA_MAQUINAS}
          className={`ips-tab${abaAtiva === ABA_MAQUINAS ? ' active' : ''}`}
          onClick={() => setAbaAtiva(ABA_MAQUINAS)}
        >
          💻 Máquinas
        </button>

        {tipos.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-tipo-${t.id}`}
            aria-selected={abaAtiva === `tipo-${t.id}`}
            className={`ips-tab${abaAtiva === `tipo-${t.id}` ? ' active' : ''}`}
            onClick={() => setAbaAtiva(`tipo-${t.id}`)}
          >
            {t.nome}
            <span className="ips-tab-count">{t.total}</span>
          </button>
        ))}

        {novoTipo === null ? (
          <button type="button" id="btn-novo-tipo" className="ips-tab ips-tab-add" onClick={() => setNovoTipo('')}>
            + Nova categoria
          </button>
        ) : (
          <form className="ips-tab-new" onSubmit={criarTipo}>
            <input
              autoFocus
              type="text"
              placeholder="Ex: Switches, Impressoras..."
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setNovoTipo(null);
                  setErroTipo(null);
                }
              }}
            />
            <button type="submit" className="btn btn-primary btn-sm">Criar</button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setNovoTipo(null);
                setErroTipo(null);
              }}
            >
              Cancelar
            </button>
          </form>
        )}

        {tipoAtivo && (
          <div className="ips-tab-tools">
            <button type="button" className="btn btn-outline btn-sm" onClick={renomearTipo} title="Renomear categoria">
              Renomear
            </button>
            <button type="button" className="btn btn-outline btn-sm danger-outline-button" onClick={excluirTipo} title="Excluir categoria">
              Excluir categoria
            </button>
          </div>
        )}
      </div>

      {erroTipo && (
        <div className="modal-error-alert" style={{ marginBottom: '1rem' }}>
          <span>⚠️ {erroTipo}</span>
        </div>
      )}

      {abaAtiva === ABA_MAQUINAS || !tipoAtivo ? (
        <MaquinasTab />
      ) : (
        <EquipamentosTab key={tipoAtivo.id} tipo={tipoAtivo} onAlterado={carregarTipos} />
      )}
    </div>
  );
}
