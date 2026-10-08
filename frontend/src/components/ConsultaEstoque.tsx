import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FeedbackMessage, type Feedback } from './FeedbackMessage';
import type { Item, EdicaoItem, FiltroEstoque } from './estoque/types';
import { CardProduto } from './estoque/CardProduto';
import { ModalEdicaoEstoque } from './estoque/ModalEdicaoEstoque';
import { ModalFichaProduto } from './estoque/ModalFichaProduto';
import './estoque/ConsultaEstoque.css';

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
  const [itemParaFicha, setItemParaFicha] = useState<Item | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const itemsPerPage = 6;

  const carregarPagina = useCallback(async (pagina: number = page, termoBusca = busca, filtroStatus = filtro) => {
    setCarregando(true);
    try {
      const skip = (pagina - 1) * itemsPerPage;
      const parametros = new URLSearchParams({
        skip: String(skip),
        limit: String(itemsPerPage),
      });
      if (termoBusca.trim()) parametros.set('q', termoBusca.trim());
      if (filtroStatus !== 'todos') parametros.set('status', filtroStatus);

      const resposta = await axios.get(`/api/itens/paginado?${parametros}`);
      setItens(resposta.data.items);
      setTotal(resposta.data.total);
    } catch (error) {
      console.error('Erro ao buscar itens paginados:', error);
      setFeedback({ type: 'error', text: 'Não foi possível carregar os produtos. Tente novamente.' });
    } finally {
      setCarregando(false);
    }
  }, [page, busca, filtro, itemsPerPage]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      carregarPagina(page, busca, filtro);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [page, busca, filtro, carregarPagina]);

  const abrirEdicao = (item: Item) => {
    setEdicao({
      id: item.id,
      nome: item.nome,
      marca: item.marca ?? '',
      modelo: item.modelo ?? '',
      quantidade: item.quantidade,
      quantidade_minima: item.quantidade_minima ?? 0,
      foto_url: item.foto_url,
    });
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edicao) return;

    setSalvando(true);
    try {
      await axios.put(`/api/itens/${edicao.id}`, {
        nome: edicao.nome,
        marca: edicao.marca || null,
        modelo: edicao.modelo || null,
        quantidade: edicao.quantidade,
        quantidade_minima: edicao.quantidade_minima,
        foto_url: edicao.foto_url,
      });

      if (edicao.foto_arquivo) {
        const formData = new FormData();
        formData.append('file', edicao.foto_arquivo);
        await axios.post(`/api/itens/${edicao.id}/foto`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

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

  const deletarItem = async (id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR o produto "${nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setSalvando(true);
    setFeedback({ type: 'loading', text: `Excluindo “${nome}”...` });
    try {
      await axios.delete(`/api/itens/${id}`);
      setFeedback({ type: 'success', text: `Produto “${nome}” excluído com sucesso.` });
      setEdicao(null);
      setItemParaFicha(null);
      await carregarPagina(page);
    } catch (error: any) {
      console.error('Erro ao deletar item:', error);
      setFeedback({
        type: 'error',
        text: error.response?.data?.detail || 'Não foi possível excluir o produto.',
      });
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
            }}
            placeholder="Pesquisar por nome, marca ou modelo..."
            aria-label="Pesquisar produtos no estoque"
          />
          {busca && (
            <button type="button" onClick={() => { setBusca(''); setPage(1); }}>
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
          {itens.map((item) => (
            <CardProduto
              key={item.id}
              item={item}
              onAbrirFicha={setItemParaFicha}
              onAbrirEdicao={abrirEdicao}
              onExcluir={deletarItem}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="inventory-pagination">
          <button
            className="btn btn-outline"
            disabled={page === 1}
            onClick={() => setPage((paginaAtual) => Math.max(1, paginaAtual - 1))}
          >
            Anterior
          </button>
          <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong></span>
          <button
            className="btn btn-outline"
            disabled={page === totalPages}
            onClick={() => setPage((paginaAtual) => Math.min(totalPages, paginaAtual + 1))}
          >
            Próxima
          </button>
        </div>
      )}

      {edicao && (
        <ModalEdicaoEstoque
          edicao={edicao}
          salvando={salvando}
          onClose={() => setEdicao(null)}
          onChange={setEdicao}
          onSalvar={salvarEdicao}
          onExcluir={deletarItem}
        />
      )}

      {itemParaFicha && (
        <ModalFichaProduto
          itemId={itemParaFicha.id}
          onClose={() => setItemParaFicha(null)}
          onEditar={(item) => abrirEdicao(item)}
          onExcluir={(item) => deletarItem(item.id, item.nome)}
        />
      )}
    </>
  );
}
