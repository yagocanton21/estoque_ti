import { useState, useEffect } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

interface Item {
  id: number;
  nome: string;
  quantidade: number;
  quantidade_minima: number;
}

interface ListaComprasItem {
  id: number;
  nome: string;
  quantidade: number;
  comprado: boolean;
}

interface DashboardProps {
  onNavigate: (tab: 'compras' | 'estoque_critico' | 'consulta_estoque' | 'cadastro_estoque' | 'movimentacoes') => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [itens, setItens] = useState<Item[]>([]);
  const [listaCompras, setListaCompras] = useState<ListaComprasItem[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>({ type: 'loading', text: 'Carregando informações do estoque...' });

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const resItens = await axios.get('http://localhost:8000/itens/');
        setItens(resItens.data);

        const resLista = await axios.get('http://localhost:8000/lista-compras/');
        setListaCompras(resLista.data.filter((i: ListaComprasItem) => !i.comprado));
        setFeedback(null);
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        setFeedback({ type: 'error', text: 'Não foi possível carregar as informações. Verifique se a API está funcionando.' });
      }
    };

    carregarDados();
  }, []);

  const itensCriticos = itens
    .filter(i => i.quantidade <= i.quantidade_minima)
    .sort((a, b) => (b.quantidade_minima - b.quantidade) - (a.quantidade_minima - a.quantidade));
  const itensCriticosEmDestaque = itensCriticos.slice(0, 5);

  return (
    <>
      <div className="page-introduction">
        <h1>Painel Principal</h1>
        <p>Escolha uma ação ou consulte a situação atual do estoque.</p>
      </div>

      <section className="dashboard-quick-actions" aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title">O que você deseja fazer?</h2>
        <div>
          <button type="button" onClick={() => onNavigate('consulta_estoque')}>
            <span aria-hidden="true">1</span>
            <strong>Consultar produtos</strong>
            <small>Pesquisar, filtrar ou editar produtos</small>
          </button>
          <button type="button" onClick={() => onNavigate('cadastro_estoque')}>
            <span aria-hidden="true">2</span>
            <strong>Cadastrar produto</strong>
            <small>Adicionar um novo produto ao estoque</small>
          </button>
          <button type="button" onClick={() => onNavigate('movimentacoes')}>
            <span aria-hidden="true">3</span>
            <strong>Registrar entrada ou saída</strong>
            <small>Aumentar ou diminuir uma quantidade</small>
          </button>
        </div>
      </section>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />
      
      <div className="grid grid-cols-3">
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)' }}>Total de Produtos</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{itens.length}</p>
          <span className="badge badge-success">Sincronizado</span>
        </div>
        
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)' }}>Estoque Baixo</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{itensCriticos.length}</p>
          <span className={itensCriticos.length > 0 ? "badge badge-danger" : "badge badge-success"}>
            {itensCriticos.length > 0 ? "Requer atenção" : "Tudo normal"}
          </span>
        </div>

        <div className="card">
          <h3 style={{ color: 'var(--text-muted)' }}>Pendentes na Lista</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{listaCompras.length}</p>
          <button className="btn btn-outline" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => onNavigate('compras')}>
            Ver Lista
          </button>
        </div>
        
        <div className="card" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
          <div className="flex justify-between items-center">
            <h2>Produtos no Limite ou Abaixo do Mínimo</h2>
            <button className="btn btn-primary" onClick={() => onNavigate('estoque_critico')}>
              {itensCriticos.length > 5 ? `Ver todos os ${itensCriticos.length}` : 'Ver Estoque'}
            </button>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {itensCriticos.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum produto precisa de reposição no momento.</p>
            ) : (
              itensCriticosEmDestaque.map(item => (
                <div key={item.id} className="flex justify-between items-center" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem' }}>{item.nome}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Atual: {item.quantidade} · Mínimo ideal: {item.quantidade_minima}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="badge badge-danger">Faltam {item.quantidade_minima - item.quantidade}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {itensCriticos.length > 5 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
              Mostrando os 5 itens mais urgentes de {itensCriticos.length} produtos com estoque baixo.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
