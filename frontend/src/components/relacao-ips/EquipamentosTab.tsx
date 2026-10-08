import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from '../FeedbackMessage';
import type { Equipamento, EquipamentoFormDados, TipoEquipamento } from './types';
import { ModalEquipamento } from './ModalEquipamento';
import { CardEquipamento } from './CardEquipamento';
import './CardMaquina.css';

interface EquipamentosTabProps {
  tipo: TipoEquipamento;
  onAlterado: () => void;
}

export function EquipamentosTab({ tipo, onAlterado }: EquipamentosTabProps) {
  const [itens, setItens] = useState<Equipamento[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 25;

  const [busca, setBusca] = useState('');
  const [localSelecionado, setLocalSelecionado] = useState('');
  const [locais, setLocais] = useState<string[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [ipCopiadoId, setIpCopiadoId] = useState<number | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Equipamento | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Troca de categoria: zera filtros e paginação
  useEffect(() => {
    setBusca('');
    setLocalSelecionado('');
    setPage(1);
    setFeedback(null);
  }, [tipo.id]);

  const carregarLocais = useCallback(async () => {
    try {
      const res = await axios.get(`/api/equipamentos/locais?tipo_id=${tipo.id}`);
      setLocais(res.data);
    } catch (err) {
      console.error('Erro ao carregar locais:', err);
    }
  }, [tipo.id]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      params.append('tipo_id', String(tipo.id));
      params.append('skip', String((page - 1) * limit));
      params.append('limit', String(limit));
      if (busca.trim()) params.append('q', busca.trim());
      if (localSelecionado) params.append('local', localSelecionado);
      const res = await axios.get(`/api/equipamentos/?${params.toString()}`);
      setItens(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_paginas);
    } catch (err) {
      console.error('Erro ao listar equipamentos:', err);
      setFeedback({ type: 'error', text: 'Não foi possível carregar os equipamentos.' });
    } finally {
      setCarregando(false);
    }
  }, [tipo.id, page, busca, localSelecionado]);

  useEffect(() => {
    carregarLocais();
  }, [carregarLocais]);

  useEffect(() => {
    const t = window.setTimeout(carregar, 250);
    return () => window.clearTimeout(t);
  }, [carregar]);

  const abrirNovo = () => {
    setEmEdicao(null);
    setModalAberto(true);
  };

  const abrirEdicao = (eq: Equipamento) => {
    setEmEdicao(eq);
    setModalAberto(true);
  };

  const salvar = async (dados: EquipamentoFormDados, id?: number) => {
    setSalvando(true);
    try {
      if (id) {
        await axios.put(`/api/equipamentos/${id}`, dados);
        setFeedback({ type: 'success', text: `“${dados.nome}” atualizado com sucesso.` });
      } else {
        await axios.post('/api/equipamentos/', dados);
        setFeedback({ type: 'success', text: `“${dados.nome}” cadastrado com sucesso.` });
      }
      setModalAberto(false);
      await Promise.all([carregar(), carregarLocais()]);
      onAlterado();
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (eq: Equipamento) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${eq.nome}"?`)) return;
    try {
      await axios.delete(`/api/equipamentos/${eq.id}`);
      setFeedback({ type: 'success', text: `"${eq.nome}" excluído com sucesso.` });
      await Promise.all([carregar(), carregarLocais()]);
      onAlterado();
    } catch (err) {
      console.error('Erro ao excluir equipamento:', err);
      setFeedback({ type: 'error', text: 'Não foi possível excluir o equipamento.' });
    }
  };

  const copiarIp = (ip: string, id: number) => {
    navigator.clipboard.writeText(ip);
    setIpCopiadoId(id);
    setTimeout(() => setIpCopiadoId(null), 2000);
  };

  const temFiltro = Boolean(busca.trim()) || Boolean(localSelecionado);

  return (
    <div className="relacao-ips-page">
      <div className="inventory-page-header">
        <div>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{tipo.nome}</h2>
          <p>Equipamentos de rede cadastrados nesta categoria.</p>
        </div>
        <div className="inventory-total">
          <strong>{total}</strong>
          <span>{temFiltro ? 'resultados encontrados' : 'cadastrados'}</span>
        </div>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="inventory-toolbar" style={{ gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div className="inventory-search" style={{ flex: '1', minWidth: '260px' }}>
          <input
            type="text"
            placeholder="Pesquisar nome, IP, MAC, modelo, local..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(1);
            }}
          />
          {busca && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setBusca('');
                setPage(1);
              }}
              title="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        {locais.length > 0 && (
          <select
            className="btn btn-outline"
            style={{ minWidth: '170px', background: 'rgba(0,0,0,0.2)' }}
            value={localSelecionado}
            onChange={(e) => {
              setLocalSelecionado(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por local"
          >
            <option value="">Todos os locais</option>
            {locais.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        )}

        <button type="button" className="btn btn-primary" onClick={abrirNovo}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Novo equipamento</span>
        </button>
      </div>

      {carregando ? (
        <div className="card loading-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        </div>
      ) : itens.length === 0 ? (
        <div className="card empty-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {temFiltro
              ? 'Nenhum equipamento encontrado para os filtros aplicados.'
              : `Nenhum item cadastrado em ${tipo.nome} ainda.`}
          </p>
          {temFiltro ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setBusca('');
                setLocalSelecionado('');
              }}
            >
              Limpar Filtros
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={abrirNovo}>
              Cadastrar primeiro equipamento
            </button>
          )}
        </div>
      ) : (
        <div className="machine-list equip-list">
          <div className="machine-list-header">
            <span>Nome / IP</span>
            <span>Modelo / MAC</span>
            <span>Local</span>
            <span>Observações</span>
            <span className="ml-actions-head">Ações</span>
          </div>

          {itens.map((eq) => (
            <CardEquipamento
              key={eq.id}
              equipamento={eq}
              ipCopiadoId={ipCopiadoId}
              onCopiarIp={copiarIp}
              onEditar={abrirEdicao}
              onExcluir={excluir}
            />
          ))}
        </div>
      )}

      {total > 0 && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Anterior
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Página {page} de {totalPages}
          </span>
          <button type="button" className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Próxima →
          </button>
        </div>
      )}

      <ModalEquipamento
        aberto={modalAberto}
        tipo={tipo}
        emEdicao={emEdicao}
        locais={locais}
        salvando={salvando}
        onClose={() => setModalAberto(false)}
        onSalvar={salvar}
      />
    </div>
  );
}
