import { useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

interface EmprestimoItem {
  id: number;
  item_nome: string;
  pessoa: string;
  quantidade: number;
  data_emprestimo: string;
  devolvido: boolean;
}

interface EmprestimosProps {
  onNavigate: (tab: string) => void;
}

export function Emprestimos({ onNavigate }: EmprestimosProps) {
  const [emprestimos, setEmprestimos] = useState<EmprestimoItem[]>([]);
  const [itemNome, setItemNome] = useState('');
  const [pessoa, setPessoa] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [devolvendoId, setDevolvendoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const itemsPerPage = 5;

  async function carregarDados(pagina = page, termoBusca = busca) {
    setCarregando(true);
    try {
      const parametros = new URLSearchParams({
        skip: String((pagina - 1) * itemsPerPage),
        limit: String(itemsPerPage),
      });
      if (termoBusca.trim()) parametros.set('q', termoBusca.trim());

      const resposta = await axios.get(`http://localhost:8000/emprestimos/ativos/paginado?${parametros}`);
      const novoTotal = resposta.data.total;
      const ultimaPagina = Math.max(1, Math.ceil(novoTotal / itemsPerPage));

      setTotal(novoTotal);
      if (pagina > ultimaPagina) {
        setPage(ultimaPagina);
      } else {
        setEmprestimos(resposta.data.items);
      }
    } catch (error) {
      console.error('Erro ao buscar empréstimos:', error);
      setFeedback({ type: 'error', text: 'Não foi possível carregar os empréstimos. Tente novamente.' });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const parametros = new URLSearchParams({
        skip: String((page - 1) * itemsPerPage),
        limit: String(itemsPerPage),
      });
      if (busca.trim()) parametros.set('q', busca.trim());

      axios.get(`http://localhost:8000/emprestimos/ativos/paginado?${parametros}`)
        .then((resposta) => {
          setEmprestimos(resposta.data.items);
          setTotal(resposta.data.total);
        })
        .catch((error) => {
          console.error('Erro ao buscar empréstimos:', error);
          setFeedback({ type: 'error', text: 'Não foi possível carregar os empréstimos. Tente novamente.' });
        })
        .finally(() => setCarregando(false));
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [page, busca]);

  const registrarEmprestimo = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!itemNome.trim()) {
      setFeedback({ type: 'error', text: 'Digite o nome do produto ou equipamento.' });
      return;
    }

    setSalvando(true);
    setFeedback({ type: 'loading', text: 'Registrando empréstimo...' });
    try {
      await axios.post('http://localhost:8000/emprestimos/', {
        item_nome: itemNome,
        pessoa,
        quantidade,
      });
      setPessoa('');
      setQuantidade(1);
      setItemNome('');
      setPage(1);
      carregarDados(1);
      setFeedback({ type: 'success', text: `Empréstimo de “${itemNome}” para ${pessoa} registrado com sucesso.` });
    } catch (error: any) {
      console.error('Erro ao registrar empréstimo:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || 'Não foi possível registrar o empréstimo.' });
    } finally {
      setSalvando(false);
    }
  };

  const devolverEmprestimo = async (id: number) => {
    if (!confirm('Confirmar a devolução deste produto ou equipamento?')) return;

    setDevolvendoId(id);
    setFeedback({ type: 'loading', text: 'Registrando devolução...' });
    try {
      await axios.put(`http://localhost:8000/emprestimos/${id}/devolver`);
      carregarDados();
      setFeedback({ type: 'success', text: 'Devolução registrada com sucesso.' });
    } catch (error: any) {
      console.error('Erro ao registrar devolução:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || 'Não foi possível registrar a devolução.' });
    } finally {
      setDevolvendoId(null);
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  const formatarData = (data: string) => {
    return new Date(`${data}Z`).toLocaleString('pt-BR');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', gap: '1rem' }}>
        <h1>Controle de Empréstimos</h1>
        <button
          className="btn btn-outline"
          onClick={() => onNavigate('historico_devolucoes')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Ver histórico de devoluções
        </button>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>Registrar Novo Empréstimo</h2>
        <form onSubmit={registrarEmprestimo} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label htmlFor="emprestimo-produto" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Produto ou equipamento</label>
            <input
              id="emprestimo-produto"
              type="text"
              value={itemNome}
              onChange={(evento) => setItemNome(evento.target.value)}
              placeholder="Ex: Fone de Ouvido"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              required
            />
            <small className="field-help">Pode informar algo que ainda não esteja cadastrado no estoque.</small>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label htmlFor="emprestimo-pessoa" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nome da pessoa</label>
            <input
              id="emprestimo-pessoa"
              type="text"
              value={pessoa}
              onChange={(evento) => setPessoa(evento.target.value)}
              placeholder="Ex: João da Silva"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              required
            />
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label htmlFor="emprestimo-quantidade" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Quantidade</label>
            <input
              id="emprestimo-quantidade"
              type="number"
              value={quantidade}
              onChange={(evento) => setQuantidade(Number(evento.target.value))}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              required
              min="1"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={salvando}>
            {salvando ? 'Registrando...' : 'Registrar Empréstimo'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="loans-section-header">
          <div>
            <h2>Empréstimos Ativos</h2>
            <span>{total} {total === 1 ? 'empréstimo ativo' : 'empréstimos ativos'}</span>
          </div>
          <div className="inventory-search loans-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="search"
              value={busca}
              onChange={(evento) => {
                setBusca(evento.target.value);
                setPage(1);
                setCarregando(true);
              }}
              placeholder="Buscar por produto, equipamento ou pessoa..."
              aria-label="Buscar empréstimos ativos"
            />
            {busca && (
              <button type="button" onClick={() => { setBusca(''); setPage(1); setCarregando(true); }}>Limpar</button>
            )}
          </div>
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {carregando ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando empréstimos...</p>
          ) : emprestimos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>
              {busca.trim() ? `Nenhum empréstimo encontrado para “${busca.trim()}”.` : 'Nenhum empréstimo ativo no momento.'}
            </p>
          ) : (
            emprestimos.map((emprestimo) => (
              <div key={emprestimo.id} className="flex justify-between items-center" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid var(--accent-warning)' }}>
                <div>
                  <h4 style={{ fontSize: '1.2rem', color: 'var(--accent-warning)' }}>{emprestimo.item_nome}</h4>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '6px', flexWrap: 'wrap' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}><strong>Pessoa:</strong> {emprestimo.pessoa}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}><strong>Qtde:</strong> {emprestimo.quantidade}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}><strong>Retirado em:</strong> {formatarData(emprestimo.data_emprestimo)}</p>
                  </div>
                </div>
                <button
                  className="btn btn-outline"
                  style={{ borderColor: 'var(--accent-success)', color: 'var(--accent-success)', padding: '0.5rem 1rem' }}
                  onClick={() => devolverEmprestimo(emprestimo.id)}
                  disabled={devolvendoId === emprestimo.id}
                >
                  {devolvendoId === emprestimo.id ? 'Registrando...' : 'Registrar Devolução'}
                </button>
              </div>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="inventory-pagination">
            <button className="btn btn-outline" disabled={page === 1} onClick={() => { setCarregando(true); setPage((pagina) => pagina - 1); }}>
              Anterior
            </button>
            <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong></span>
            <button className="btn btn-outline" disabled={page === totalPages} onClick={() => { setCarregando(true); setPage((pagina) => pagina + 1); }}>
              Próxima
            </button>
          </div>
        )}
      </div>
    </>
  );
}
