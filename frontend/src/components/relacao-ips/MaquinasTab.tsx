import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from '../FeedbackMessage';
import type { Maquina, EstatisticasIps, MaquinaFormDados } from './types';
import { ModalMaquina } from './ModalMaquina';
import { ModalImportarPlanilha } from './ModalImportarPlanilha';
import { KpisMaquinas } from './KpisMaquinas';
import { FiltrosMaquinas } from './FiltrosMaquinas';
import { CardMaquina } from './CardMaquina';
import './KpisMaquinas.css';
import './FiltrosMaquinas.css';
import './CardMaquina.css';

export function MaquinasTab() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(25);

  const [busca, setBusca] = useState('');
  const [setorSelecionado, setSetorSelecionado] = useState('');
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<string[]>([]);
  const [soSelecionado, setSoSelecionado] = useState('');
  const [officeSelecionado, setOfficeSelecionado] = useState('');
  const [antivirusSelecionado, setAntivirusSelecionado] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [opcoesFiltro, setOpcoesFiltro] = useState<{
    sistemas_operacionais: string[];
    offices: string[];
    antivirus: string[];
  }>({
    sistemas_operacionais: [],
    offices: [],
    antivirus: [],
  });
  const [estatisticas, setEstatisticas] = useState<EstatisticasIps | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [modalAberta, setModalAberta] = useState(false);
  const [maquinaEmEdicao, setMaquinaEmEdicao] = useState<Maquina | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [modalImportarAberta, setModalImportarAberta] = useState(false);
  const [ipCopiadoId, setIpCopiadoId] = useState<number | null>(null);

  const carregarMetadados = useCallback(async () => {
    try {
      const [resSetores, resStats, resFiltros] = await Promise.all([
        axios.get('/api/relacao-ips/setores'),
        axios.get('/api/relacao-ips/estatisticas'),
        axios.get('/api/relacao-ips/filtros'),
      ]);
      setSetoresDisponiveis(resSetores.data);
      setEstatisticas(resStats.data);
      setOpcoesFiltro(resFiltros.data);
    } catch (err) {
      console.error('Erro ao carregar metadados de IPs:', err);
    }
  }, []);

  const carregarMaquinas = useCallback(
    async (
      pagina: number = page,
      termoBusca: string = busca,
      setor: string = setorSelecionado,
      itensPorPagina: number = limit
    ) => {
      setCarregando(true);
      try {
        const skip = (pagina - 1) * itensPorPagina;
        const params = new URLSearchParams();
        params.append('skip', String(skip));
        params.append('limit', String(itensPorPagina));
        if (termoBusca.trim()) params.append('q', termoBusca.trim());
        if (setor.trim()) params.append('setor', setor.trim());
        if (soSelecionado) params.append('sistema_operacional', soSelecionado);
        if (officeSelecionado) params.append('office', officeSelecionado);
        if (antivirusSelecionado) params.append('antivirus', antivirusSelecionado);

        const res = await axios.get(`/api/relacao-ips/?${params.toString()}`);
        setMaquinas(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.total_paginas);
      } catch (err) {
        console.error('Erro ao listar máquinas:', err);
        setFeedback({ type: 'error', text: 'Não foi possível carregar a relação de IPs e máquinas.' });
      } finally {
        setCarregando(false);
      }
    },
    [page, busca, setorSelecionado, soSelecionado, officeSelecionado, antivirusSelecionado, limit]
  );

  useEffect(() => {
    carregarMetadados();
  }, [carregarMetadados]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      carregarMaquinas(page, busca, setorSelecionado);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [page, busca, setorSelecionado, soSelecionado, officeSelecionado, antivirusSelecionado, carregarMaquinas]);

  const handleSalvarMaquina = async (dados: MaquinaFormDados, id?: number) => {
    setSalvando(true);
    try {
      if (id) {
        await axios.put(`/api/relacao-ips/${id}`, dados);
        setFeedback({ type: 'success', text: `Máquina “${dados.nome_maquina}” atualizada com sucesso.` });
      } else {
        await axios.post('/api/relacao-ips/', dados);
        setFeedback({ type: 'success', text: `Máquina “${dados.nome_maquina}” cadastrada com sucesso.` });
      }
      setModalAberta(false);
      setMaquinaEmEdicao(null);
      await Promise.all([carregarMaquinas(page), carregarMetadados()]);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirMaquina = async (maquina: Maquina) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro da máquina "${maquina.nome_maquina}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/relacao-ips/${maquina.id}`);
      setFeedback({ type: 'success', text: `Máquina "${maquina.nome_maquina}" excluída com sucesso.` });
      await Promise.all([carregarMaquinas(page), carregarMetadados()]);
    } catch (err) {
      console.error('Erro ao excluir máquina:', err);
      setFeedback({ type: 'error', text: 'Não foi possível excluir a máquina.' });
    }
  };

  const handleCopiarIp = (ip: string, id: number) => {
    navigator.clipboard.writeText(ip);
    setIpCopiadoId(id);
    setTimeout(() => {
      setIpCopiadoId(null);
    }, 2000);
  };

  const filtrosAtivos = [setorSelecionado, soSelecionado, officeSelecionado, antivirusSelecionado].filter(Boolean).length;
  const temFiltro = Boolean(busca.trim()) || filtrosAtivos > 0;

  const limparFiltros = () => {
    setBusca('');
    setSetorSelecionado('');
    setSoSelecionado('');
    setOfficeSelecionado('');
    setAntivirusSelecionado('');
    setPage(1);
  };

  const handleExportarExcel = () => {
    window.open('/api/relacao-ips/exportar', '_blank');
  };

  return (
    <div className="relacao-ips-page">
      <div className="inventory-page-header">
        <div>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Máquinas</h2>
          <p>Mapeamento de usuários, máquinas, logins de rede do AD e endereços IP.</p>
        </div>
        <div className="inventory-total">
          <strong>{total}</strong>
          <span>{temFiltro ? 'resultados encontrados' : 'máquinas cadastradas'}</span>
        </div>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      <KpisMaquinas estatisticas={estatisticas} />

      <FiltrosMaquinas
        busca={busca}
        setBusca={setBusca}
        filtrosAbertos={filtrosAbertos}
        setFiltrosAbertos={setFiltrosAbertos}
        filtrosAtivos={filtrosAtivos}
        setoresDisponiveis={setoresDisponiveis}
        setorSelecionado={setorSelecionado}
        setSetorSelecionado={setSetorSelecionado}
        opcoesFiltro={opcoesFiltro}
        soSelecionado={soSelecionado}
        setSoSelecionado={setSoSelecionado}
        officeSelecionado={officeSelecionado}
        setOfficeSelecionado={setOfficeSelecionado}
        antivirusSelecionado={antivirusSelecionado}
        setAntivirusSelecionado={setAntivirusSelecionado}
        onLimparFiltros={limparFiltros}
        onAbrirImportar={() => setModalImportarAberta(true)}
        onExportar={handleExportarExcel}
        onNovaMaquina={() => {
          setMaquinaEmEdicao(null);
          setModalAberta(true);
        }}
        onResetPagina={() => setPage(1)}
      />

      {carregando ? (
        <div className="card loading-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Carregando dados da rede e máquinas...</p>
        </div>
      ) : maquinas.length === 0 ? (
        <div className="card empty-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {temFiltro
              ? 'Nenhuma máquina encontrada para os filtros aplicados.'
              : 'Nenhuma máquina cadastrada ainda na Relação de IPs.'}
          </p>
          {temFiltro ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={limparFiltros}
            >
              Limpar Filtros
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setModalImportarAberta(true)}
              >
                Importar Planilha Existente
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setMaquinaEmEdicao(null);
                  setModalAberta(true);
                }}
              >
                Cadastrar Primeira Máquina
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="machine-list">
          <div className="machine-list-header">
            <span>Máquina / IP</span>
            <span>Usuário / AD</span>
            <span>Setor</span>
            <span>Software</span>
            <span className="ml-actions-head">Ações</span>
          </div>

          {maquinas.map((m) => (
            <CardMaquina
              key={m.id}
              maquina={m}
              ipCopiadoId={ipCopiadoId}
              onCopiarIp={handleCopiarIp}
              onEditar={(item) => {
                setMaquinaEmEdicao(item);
                setModalAberta(true);
              }}
              onExcluir={handleExcluirMaquina}
            />
          ))}
        </div>
      )}

      {total > 0 && (
        <div
          className="inventory-pagination"
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Itens por página:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                color: 'var(--text-main)',
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← Anterior
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0.5rem' }}>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {modalAberta && (
        <ModalMaquina
          maquinaParaEditar={maquinaEmEdicao}
          setoresDisponiveis={setoresDisponiveis}
          salvando={salvando}
          onClose={() => {
            setModalAberta(false);
            setMaquinaEmEdicao(null);
          }}
          onSalvar={handleSalvarMaquina}
        />
      )}

      {modalImportarAberta && (
        <ModalImportarPlanilha
          onClose={() => setModalImportarAberta(false)}
          onImportadoSucesso={() => {
            carregarMaquinas(1);
            carregarMetadados();
          }}
        />
      )}
    </div>
  );
}
