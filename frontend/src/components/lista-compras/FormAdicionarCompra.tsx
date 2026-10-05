import { useEffect, useState } from 'react';
import axios from 'axios';

interface FormAdicionarCompraProps {
  onAdicionado: (nome: string) => void;
  onFeedback: (tipo: 'loading' | 'success' | 'error', texto: string) => void;
}

export function FormAdicionarCompra({ onAdicionado, onFeedback }: FormAdicionarCompraProps) {
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [sugestoes, setSugestoes] = useState<{ id: number; nome: string }[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [itemIdSelecionado, setItemIdSelecionado] = useState<number | null>(null);

  // Debounce e busca de sugestões
  useEffect(() => {
    const textoLimpo = nome.trim();
    if (!textoLimpo || itemIdSelecionado) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(textoLimpo.replace(/\s+/g, ' '));
        const res = await axios.get(`/api/itens/buscar?q=${query}&limit=5`);
        setSugestoes(res.data);
        setMostrarSugestoes(res.data.length > 0);
      } catch (err) {
        console.error('Erro ao buscar sugestões', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [nome, itemIdSelecionado]);

  const handleNomeChange = (valor: string) => {
    setNome(valor);
    if (itemIdSelecionado) setItemIdSelecionado(null);
    if (!valor.trim()) {
      setSugestoes([]);
      setMostrarSugestoes(false);
    }
  };

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    onFeedback('loading', 'Adicionando produto à lista...');
    try {
      await axios.post('/api/lista-compras/', {
        nome: nome.trim().replace(/\s+/g, ' '),
        quantidade,
        item_id: itemIdSelecionado,
        link: link.trim() || null,
      });
      const nomeSalvo = nome;
      setNome('');
      setQuantidade(1);
      setItemIdSelecionado(null);
      setLink('');
      setSugestoes([]);
      setMostrarSugestoes(false);
      onAdicionado(nomeSalvo);
    } catch (error: any) {
      console.error('Erro ao adicionar item avulso:', error);
      onFeedback('error', error.response?.data?.detail || error.message || 'Não foi possível adicionar o produto.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="card section-card" style={{ zIndex: 50, position: 'relative' }}>
      <h2>Adicionar Produto à Lista</h2>
      <form onSubmit={handleAdicionar} className="responsive-inline-form">
        <div className="responsive-field" style={{ position: 'relative' }}>
          <label htmlFor="compra-produto" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            Nome do produto
          </label>
          <input
            id="compra-produto"
            type="text"
            value={nome}
            onChange={(e) => handleNomeChange(e.target.value)}
            onFocus={() => { if (sugestoes.length > 0) setMostrarSugestoes(true); }}
            onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
            placeholder="Ex: Teclado Mecânico"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(0,0,0,0.2)',
              color: 'white',
            }}
            required
          />
          {mostrarSugestoes && (
            <ul
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--bg-dark)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                marginTop: '4px',
                listStyle: 'none',
                padding: '0.5rem 0',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 9999,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {sugestoes.map((s) => (
                <li
                  key={s.id}
                  onClick={() => {
                    setNome(s.nome);
                    setItemIdSelecionado(s.id);
                    setMostrarSugestoes(false);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    color: 'white',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {s.nome}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="responsive-field">
          <label htmlFor="compra-link" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            Link da loja (opcional)
          </label>
          <input
            id="compra-link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://loja..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(0,0,0,0.2)',
              color: 'white',
            }}
          />
        </div>

        <div className="responsive-field responsive-field-quantity">
          <label htmlFor="compra-quantidade" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            Quantidade
          </label>
          <input
            id="compra-quantidade"
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(0,0,0,0.2)',
              color: 'white',
            }}
            required
            min="1"
          />
        </div>

        <button type="submit" className="btn btn-primary responsive-form-submit" disabled={salvando}>
          {salvando ? 'Adicionando...' : 'Adicionar à Lista'}
        </button>
      </form>
    </div>
  );
}
