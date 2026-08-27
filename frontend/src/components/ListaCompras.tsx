import { useState, useEffect } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

interface ListaComprasItem {
  id: number;
  item_id: number | null;
  nome: string;
  quantidade: number;
  comprado: boolean;
  link: string | null;
}

export interface ListaComprasProps {
  onNavigate: (tab: string) => void;
}

export function ListaCompras({ onNavigate }: ListaComprasProps) {
  const [lista, setLista] = useState<ListaComprasItem[]>([]);
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    axios.get('/api/lista-compras/')
      .then((resposta) => setLista(resposta.data))
      .catch((error) => {
        console.error('Erro ao buscar lista de compras:', error);
        setFeedback({ type: 'error', text: 'Não foi possível carregar a lista de compras.' });
      })
      .finally(() => setCarregando(false));
  }, []);

  const carregarLista = async () => {
    setCarregando(true);
    try {
      const res = await axios.get('/api/lista-compras/');
      setLista(res.data);
    } catch (error) {
      console.error('Erro ao buscar lista de compras:', error);
      setFeedback({ type: 'error', text: 'Não foi possível atualizar a lista de compras.' });
    } finally {
      setCarregando(false);
    }
  };

  const adicionarAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setFeedback({ type: 'loading', text: 'Adicionando produto à lista...' });
    try {
      await axios.post('/api/lista-compras/', {
        nome,
        quantidade,
        item_id: null,
        link: link || null
      });
      setNome('');
      setQuantidade(1);
      setLink('');
      await carregarLista();
      setFeedback({ type: 'success', text: `Produto “${nome}” adicionado à lista de compras.` });
    } catch (error: any) {
      console.error('Erro ao adicionar item avulso:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || error.message || 'Não foi possível adicionar o produto.' });
    } finally {
      setSalvando(false);
    }
  };

  const marcarComprado = async (item: ListaComprasItem) => {
    setProcessandoId(item.id);
    setFeedback({ type: 'loading', text: 'Marcando produto como comprado...' });
    try {
      await axios.put(`/api/lista-compras/${item.id}`, {
        nome: item.nome,
        quantidade: item.quantidade,
        item_id: item.item_id,
        comprado: true,
        link: item.link
      });
      await carregarLista();
      setFeedback({ type: 'success', text: `“${item.nome}” foi marcado como comprado.` });
    } catch (error: any) {
      console.error('Erro ao marcar como comprado:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || error.message || 'Não foi possível atualizar o produto.' });
    } finally {
      setProcessandoId(null);
    }
  };

  const excluirItem = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir da lista?')) return;
    setProcessandoId(id);
    setFeedback({ type: 'loading', text: 'Excluindo produto da lista...' });
    try {
      await axios.delete(`/api/lista-compras/${id}`);
      await carregarLista();
      setFeedback({ type: 'success', text: 'Produto excluído da lista de compras.' });
    } catch (error: any) {
      console.error('Erro ao excluir item:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || error.message || 'Não foi possível excluir o produto.' });
    } finally {
      setProcessandoId(null);
    }
  };

  const pendentes = lista.filter(i => !i.comprado);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', gap: '1rem' }}>
        <h1>Lista de Compras</h1>
        <button
          className="btn btn-outline"
          onClick={() => onNavigate('historico_compras')}
        >
          Ver histórico de compras
        </button>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Formulário Superior (Horizontal) */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>Adicionar Produto à Lista</h2>
        <form onSubmit={adicionarAvulso} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label htmlFor="compra-produto" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nome do produto</label>
            <input 
              id="compra-produto"
              type="text" 
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Teclado Mecânico"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              required
            />
          </div>
          <div style={{ flex: 2 }}>
            <label htmlFor="compra-link" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Link da loja (opcional)</label>
            <input 
              id="compra-link"
              type="url" 
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://loja..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="compra-quantidade" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Quantidade</label>
            <input 
              id="compra-quantidade"
              type="number" 
              value={quantidade}
              onChange={e => setQuantidade(Number(e.target.value))}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              required min="1"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={salvando}>
            {salvando ? 'Adicionando...' : 'Adicionar à Lista'}
          </button>
        </form>
      </div>

      {/* Lista Principal */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>Produtos Pendentes para Compra</h2>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {carregando ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando lista de compras...</p>
          ) : pendentes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Você não tem produtos pendentes de compra no momento.</p>
          ) : (
            pendentes.map(item => (
              <div key={item.id} className="flex justify-between items-center" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '1.2rem' }}>{item.nome}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>Quantidade solicitada: {item.quantidade}</p>
                  {item.item_id && <span className="badge badge-danger" style={{ display: 'inline-block', marginTop: '8px' }}>Gerado Automaticamente por Falta de Estoque</span>}
                </div>
                <div className="flex items-center gap-4">
                  {item.link && (
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.5rem 1rem', borderColor: 'var(--glass-border)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
                      onClick={() => {
                        navigator.clipboard.writeText(item.link!);
                        setFeedback({ type: 'success', text: 'Link copiado.' });
                      }}
                      title="Copiar Link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Copiar Link
                    </button>
                  )}
                  <button className="btn btn-outline" style={{ borderColor: 'var(--accent-success)', color: 'var(--accent-success)', padding: '0.5rem 1rem' }} onClick={() => marcarComprado(item)} disabled={processandoId === item.id}>
                    {processandoId === item.id ? 'Processando...' : 'Marcar como Comprado'}
                  </button>
                  <button className="btn btn-outline" style={{ borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }} onClick={() => excluirItem(item.id)} disabled={processandoId === item.id}>
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
      </div>
      </div>
    </>
  );
}

