import { useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';

interface Item {
  id: number;
  nome: string;
  marca: string | null;
  modelo: string | null;
  quantidade: number;
  quantidade_minima: number | null;
}

interface EdicaoItem {
  id: number;
  nome: string;
  marca: string;
  modelo: string;
  quantidade: number;
  quantidade_minima: number;
}

type FiltroEstoque = 'todos' | 'normal' | 'limite' | 'abaixo';

const filtros: { valor: FiltroEstoque; rotulo: string; descricao: string }[] = [
  { valor: 'todos', rotulo: 'Todos os produtos', descricao: 'Sem filtro de quantidade' },
  { valor: 'normal', rotulo: 'Estoque normal', descricao: 'Acima do mínimo configurado' },
  { valor: 'limite', rotulo: 'No limite mínimo', descricao: 'Quantidade igual ao mínimo' },
  { valor: 'abaixo', rotulo: 'Abaixo do mínimo', descricao: 'Reposição necessária' },
];

export function ConsultaEstoque() {
  const [itens, setItens] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstoque>('todos');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [edicao, setEdicao] = useState<EdicaoItem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const itemsPerPage = 10;

  const carregarPagina = async (pagina: number, termoBusca = busca) => {
    setCarregando(true);
    try {
      const skip = (pagina - 1) * itemsPerPage;
      const parametros = new URLSearchParams({
        skip: String(skip),
        limit: String(itemsPerPage),
      });
      if (termoBusca.trim()) parametros.set('q', termoBusca.trim());
      if (filtro !== 'todos') parametros.set('status', filtro);

      const resposta = await axios.get(`/api/itens/paginado?${parametros}`);
      setItens(resposta.data.items);
      setTotal(resposta.data.total);
    } catch (error) {
      console.error('Erro ao buscar itens paginados:', error);
      setFeedback({ type: 'error', text: 'Não foi possível carregar os produtos. Tente novamente.' });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const parametros = new URLSearchParams({
        skip: String((page - 1) * itemsPerPage),
        limit: String(itemsPerPage),
      });
      if (busca.trim()) parametros.set('q', busca.trim());
      if (filtro !== 'todos') parametros.set('status', filtro);

      axios.get(`/api/itens/paginado?${parametros}`)
        .then((resposta) => {
          setItens(resposta.data.items);
          setTotal(resposta.data.total);
        })
        .catch((error) => {
          console.error('Erro ao buscar itens paginados:', error);
          setFeedback({ type: 'error', text: 'Não foi possível carregar os produtos. Tente novamente.' });
        })
        .finally(() => setCarregando(false));
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [page, busca, filtro]);

  const abrirEdicao = (item: Item) => {
    setEdicao({
      id: item.id,
      nome: item.nome,
      marca: item.marca ?? '',
      modelo: item.modelo ?? '',
      quantidade: item.quantidade,
      quantidade_minima: item.quantidade_minima ?? 0,
    });
  };

  const salvarEdicao = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!edicao) return;

    setSalvando(true);
    try {
      await axios.put(`/api/itens/${edicao.id}`, {
        nome: edicao.nome,
        marca: edicao.marca || null,
        modelo: edicao.modelo || null,
        quantidade: edicao.quantidade,
        quantidade_minima: edicao.quantidade_minima,
      });
      setEdicao(null);
      await carregarPagina(page);
      setFeedback({ type: 'success', text: `Produto “${edicao.nome}” atualizado com sucesso.` });
    } catch (error: any) {
      console.error('Erro ao editar item:', error);
      setFeedback({ type: 'error', text: error.response?.data?.detail || 'Não foi possível salvar as alterações.' });
    } finally {
      setSalvando(false);
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <>
      <div className="inventory-page-header">
        <div>
          <h1>Estoque</h1>
          <p>Consulte os produtos e mantenha as informações atualizadas.</p>
        </div>
        <div className="inventory-total">
          <strong>{total}</strong>
          <span>{busca.trim() ? 'resultados encontrados' : 'produtos cadastrados'}</span>
        </div>
      </div>

      <div className="inventory-toolbar">
        <div className="inventory-search">
          <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            placeholder="Pesquisar por nome, marca ou modelo..."
            aria-label="Pesquisar produtos no estoque"
          />
          {busca && (
            <button type="button" onClick={() => { setBusca(''); setPage(1); setCarregando(true); }}>
              Limpar
            </button>
          )}
        </div>
        <div className="inventory-filter">
          <button
            type="button"
            className={`btn btn-outline inventory-filter-button ${filtro !== 'todos' ? 'inventory-filter-active' : ''}`}
            onClick={() => setFiltrosAbertos((aberto) => !aberto)}
            aria-expanded={filtrosAbertos}
            aria-haspopup="menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16"></path>
              <path d="M7 12h10"></path>
              <path d="M10 18h4"></path>
            </svg>
            {filtro === 'todos' ? 'Filtrar' : filtros.find((opcao) => opcao.valor === filtro)?.rotulo}
            {filtro !== 'todos' && <span className="filter-indicator" aria-hidden="true"></span>}
          </button>

          {filtrosAbertos && (
            <div className="inventory-filter-menu" role="menu">
              <span className="inventory-filter-menu-title">Situação do estoque</span>
              {filtros.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  role="menuitemradio"
                  aria-checked={filtro === opcao.valor}
                  className={filtro === opcao.valor ? 'selected' : ''}
                  onClick={() => {
                    setFiltro(opcao.valor);
                    setPage(1);
                    setCarregando(true);
                    setFiltrosAbertos(false);
                  }}
                >
                  <span className="filter-radio" aria-hidden="true"></span>
                  <span>
                    <strong>{opcao.rotulo}</strong>
                    <small>{opcao.descricao}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />

      {carregando ? (
        <div className="card inventory-empty"><p>Carregando produtos...</p></div>
      ) : itens.length === 0 ? (
        <div className="card inventory-empty">
          <p>{busca.trim() ? `Nenhum produto encontrado para “${busca.trim()}”.` : 'Nenhum produto encontrado.'}</p>
        </div>
      ) : (
        <div className="product-grid">
          {itens.map((item) => {
            const minimo = item.quantidade_minima ?? 0;
            const critico = item.quantidade <= minimo;

            return (
              <article key={item.id} className={`product-card ${critico ? 'product-card-critical' : ''}`}>
                <div className="product-card-header">
                  <span className="product-id">#{item.id}</span>
                  <span className={critico ? 'badge badge-danger' : 'badge badge-success'}>
                    {critico ? 'Estoque baixo' : 'Estoque normal'}
                  </span>
                </div>

                <div className="product-card-body">
                  <h2>{item.nome}</h2>
                  <p className="product-description">
                    {[item.marca, item.modelo].filter(Boolean).join(' • ') || 'Marca e modelo não informados'}
                  </p>
                </div>

                <div className="product-stock">
                  <div>
                    <strong>{item.quantidade}</strong>
                    <span>em estoque</span>
                  </div>
                  <div>
                    <strong>{minimo}</strong>
                    <span>estoque mínimo</span>
                  </div>
                </div>

                <button className="btn btn-outline product-edit-button" onClick={() => abrirEdicao(item)}>
                  Editar produto
                </button>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="inventory-pagination">
          <button
            className="btn btn-outline"
            disabled={page === 1}
            onClick={() => { setCarregando(true); setPage((pagina) => pagina - 1); }}
          >
            Anterior
          </button>
          <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong></span>
          <button
            className="btn btn-outline"
            disabled={page === totalPages}
            onClick={() => { setCarregando(true); setPage((pagina) => pagina + 1); }}
          >
            Próxima
          </button>
        </div>
      )}

      {edicao && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEdicao(null)}>
          <section className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-product-title" onMouseDown={(evento) => evento.stopPropagation()}>
            <div className="edit-modal-header">
              <div>
                <span>Editando produto #{edicao.id}</span>
                <h2 id="edit-product-title">Atualizar produto</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setEdicao(null)} aria-label="Fechar edição">×</button>
            </div>

            <form onSubmit={salvarEdicao}>
              <div className="edit-form-grid">
                <label className="form-field form-field-wide">
                  <span>Nome do produto</span>
                  <input
                    value={edicao.nome}
                    onChange={(evento) => setEdicao({ ...edicao, nome: evento.target.value })}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Marca</span>
                  <input
                    value={edicao.marca}
                    onChange={(evento) => setEdicao({ ...edicao, marca: evento.target.value })}
                    placeholder="Opcional"
                  />
                </label>
                <label className="form-field">
                  <span>Modelo</span>
                  <input
                    value={edicao.modelo}
                    onChange={(evento) => setEdicao({ ...edicao, modelo: evento.target.value })}
                    placeholder="Opcional"
                  />
                </label>
                <label className="form-field">
                  <span>Quantidade atual</span>
                  <input
                    type="number"
                    min="0"
                    value={edicao.quantidade}
                    disabled
                  />
                  <small>Para mudar o saldo, use Entrada / Saída e escolha Ajuste.</small>
                </label>
                <label className="form-field">
                  <span>Estoque mínimo</span>
                  <input
                    type="number"
                    min="0"
                    value={edicao.quantidade_minima}
                    onChange={(evento) => setEdicao({ ...edicao, quantidade_minima: Number(evento.target.value) })}
                    required
                  />
                </label>
              </div>

              <div className="edit-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEdicao(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

