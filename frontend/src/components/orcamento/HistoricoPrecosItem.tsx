import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import type { HistoricoOrcamentosResponse, PedidoHistoricoOrcamento } from './types';
import { formatarMoeda } from './types';
import { formatarData } from '../../utils/formatters';
import { obterToken } from '../../services/auth';
import './HistoricoPrecosItem.css';

interface HistoricoPrecosItemProps {
  termoInicial?: string;
  itemId?: number | null;
  onReaproveitar?: (fornecedor: string, link: string | null) => void;
  mostrarBusca?: boolean;
  compacto?: boolean;
}

export function HistoricoPrecosItem({
  termoInicial = '',
  itemId = null,
  onReaproveitar,
  mostrarBusca = true,
  compacto = false,
}: HistoricoPrecosItemProps) {
  const [busca, setBusca] = useState(termoInicial);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<HistoricoOrcamentosResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  
  // Controla quais pedidos estão expandidos (por ID de pedido)
  const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<number, boolean>>({});

  const toggleExpandir = (pedidoId: number) => {
    setPedidosExpandidos((prev) => ({
      ...prev,
      [pedidoId]: !prev[pedidoId],
    }));
  };

  const carregarHistorico = useCallback(async (termo: string, id: number | null, pag: number = 1) => {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (termo.trim()) params.append('termo', termo.trim());
      if (id) params.append('item_id', String(id));
      params.append('pagina', String(pag));
      params.append('tamanho_pagina', '10');

      const res = await axios.get<HistoricoOrcamentosResponse>(
        `/api/lista-compras/orcamentos/historico?${params.toString()}`
      );
      setDados(res.data);
      // Se houver apenas 1 ou 2 pedidos, abre o primeiro automaticamente
      if (res.data.pedidos && res.data.pedidos.length === 1) {
        setPedidosExpandidos({ [res.data.pedidos[0].lista_compras_id]: true });
      }
    } catch (err: any) {
      console.error('Erro ao buscar histórico de orçamentos:', err);
      setErro('Não foi possível carregar o histórico de cotações.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Busca automática com debounce de 350ms ao digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagina(1);
      carregarHistorico(busca, itemId, 1);
    }, 350);

    return () => clearTimeout(timer);
  }, [busca, itemId, carregarHistorico]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    carregarHistorico(busca, itemId, 1);
  };

  const mudarPagina = (novaPagina: number) => {
    setPagina(novaPagina);
    carregarHistorico(busca, itemId, novaPagina);
  };

  const handleVisualizarPdf = async (e: React.MouseEvent, listaComprasId: number) => {
    e.preventDefault();
    try {
      const res = await axios.get(`/api/lista-compras/${listaComprasId}/pdf`, {
        responseType: 'blob',
      });
      const file = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (err) {
      console.warn('Falha no download direto por Blob, abrindo link com token:', err);
      const token = obterToken();
      const url = `/api/lista-compras/${listaComprasId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(url, '_blank');
    }
  };

  const stats = dados?.estatisticas;
  const pedidos: PedidoHistoricoOrcamento[] = dados?.pedidos || [];
  // Só considera filtro ativo se a resposta do servidor realmente foi para um termo pesquisado ou itemId
  const temFiltroAtivo = Boolean((dados?.termo && dados.termo.trim()) || dados?.item_id);

  return (
    <div className={`price-history-container ${compacto ? 'compact' : ''}`}>
      {mostrarBusca && (
        <div className="price-history-search-bar">
          <form onSubmit={handleBuscar} className="price-search-form">
            <div className="price-search-input-wrapper">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="search-icon"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar item no histórico (ex: Bateria 9v, SSD, Teclado...)"
                className="price-search-input"
              />
              {busca && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => {
                    setBusca('');
                    setPagina(1);
                    carregarHistorico('', null, 1);
                  }}
                  title="Limpar pesquisa"
                >
                  ×
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary price-search-btn">
              Pesquisar
            </button>
          </form>
        </div>
      )}

      {erro && (
        <div className="price-history-error">
          <span>{erro}</span>
        </div>
      )}

      {carregando ? (
        <div className="price-history-loading">
          <span className="spinner"></span>
          <span>Buscando histórico de orçamentos e preços...</span>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="price-history-empty">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h4>Nenhum pedido de compra encontrado</h4>
          <p>
            {busca.trim()
              ? `Não encontramos orçamentos registrados para "${busca.trim()}".`
              : 'Nenhum orçamento arquivado no momento.'}
          </p>
        </div>
      ) : (
        <>
          {/* Exibe os cards de comparação de preços apenas quando o servidor retornou dados filtrados por produto */}
          {temFiltroAtivo && stats && stats.total_cotacoes > 0 && (
            <div className="price-history-kpis">
              <div className="price-kpi-card best-price">
                <span className="kpi-title">Menor Preço Unitário</span>
                <strong className="kpi-value">
                  {stats.menor_preco_unitario != null
                    ? formatarMoeda(stats.menor_preco_unitario)
                    : '-'}
                </strong>
                <small className="kpi-sub">
                  Fornecedor: <strong>{stats.fornecedor_menor_preco || 'N/D'}</strong>
                </small>
              </div>

              <div className="price-kpi-card last-price">
                <span className="kpi-title">Última Compra / Escolhido</span>
                <strong className="kpi-value">
                  {stats.ultimo_preco_pago != null
                    ? formatarMoeda(stats.ultimo_preco_pago)
                    : '-'}
                </strong>
                <small className="kpi-sub">
                  {stats.ultimo_fornecedor_pago ? (
                    <>
                      {stats.ultimo_fornecedor_pago}
                      {stats.data_ultima_compra && (
                        <span> em {formatarData(stats.data_ultima_compra)}</span>
                      )}
                    </>
                  ) : (
                    'Nenhum item marcado como comprado'
                  )}
                </small>
              </div>

              <div className="price-kpi-card average-price">
                <span className="kpi-title">Preço Médio Histórico</span>
                <strong className="kpi-value">
                  {stats.media_preco_unitario != null
                    ? formatarMoeda(stats.media_preco_unitario)
                    : '-'}
                </strong>
                <small className="kpi-sub">
                  {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'} ({stats.total_cotacoes} cotações)
                </small>
              </div>
            </div>
          )}

          {/* Lista Consolidada de Pedidos (1 item por pedido) */}
          <div className="orders-history-list">
            <div className="orders-list-header">
              <span>{pedidos.length} {pedidos.length === 1 ? 'pedido de compra encontrado' : 'pedidos de compra encontrados'}</span>
              <small>Clique no item para ver as 3 cotações comparadas e o PDF</small>
            </div>

            {pedidos.map((pedido) => {
              const expandido = !!pedidosExpandidos[pedido.lista_compras_id];
              const isEntregue = pedido.status === 'entregue';
              const isComprado = pedido.status === 'comprado';

              return (
                <div
                  key={pedido.lista_compras_id}
                  className={`order-history-card ${expandido ? 'is-expanded' : ''}`}
                >
                  {/* Cabeçalho do Pedido - Clicável */}
                  <div
                    className="order-card-header"
                    onClick={() => toggleExpandir(pedido.lista_compras_id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpandir(pedido.lista_compras_id);
                      }
                    }}
                    title="Clique para ver as cotações detalhadas e o PDF"
                  >
                    <div className="order-main-info">
                      <div className="order-date-status">
                        <span className="order-date">
                          {formatarData(pedido.data_compra || pedido.data_registro)}
                        </span>
                        <span
                          className={`order-status-badge ${
                            isEntregue
                              ? 'status-delivered'
                              : isComprado
                              ? 'status-bought'
                              : 'status-pending'
                          }`}
                        >
                          {isEntregue ? 'Entregue' : isComprado ? 'A caminho' : 'Pendente'}
                        </span>
                      </div>

                      <div className="order-product-row">
                        <h4 className="order-product-name">{pedido.nome}</h4>
                        <span className="order-quantity-tag">
                          {pedido.quantidade} {pedido.quantidade === 1 ? 'unidade' : 'unidades'}
                        </span>
                      </div>
                    </div>

                    <div className="order-summary-side">
                      <div className="order-winner-preview">
                        <span className="winner-label">Opção Escolhida:</span>
                        <strong className="winner-supplier">
                          {pedido.fornecedor_vencedor || 'Não selecionada'}
                        </strong>
                        <span className="winner-price">
                          {pedido.preco_total_vencedor != null
                            ? formatarMoeda(pedido.preco_total_vencedor)
                            : '-'}
                        </span>
                      </div>

                      <div className="order-badges-group">
                        <span className="order-quotes-count">
                          {pedido.total_cotacoes} {pedido.total_cotacoes === 1 ? 'cotação' : 'cotações'}
                        </span>

                        {pedido.tem_pdf ? (
                          <span className="order-pdf-badge has-pdf" title="Possui PDF de orçamento salvo">
                            📄 PDF Disponível
                          </span>
                        ) : (
                          <span className="order-pdf-badge no-pdf" title="Sem PDF anexado">
                            Sem PDF
                          </span>
                        )}

                        <span className="order-chevron-icon" aria-hidden="true">
                          {expandido ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Painel Expansível: Mostra as 3 Cotações e Ações */}
                  {expandido && (
                    <div className="order-details-panel">
                      <div className="order-details-header">
                        <h5>Comparativo das Cotações deste Pedido</h5>
                        <div className="order-details-actions">
                          {pedido.tem_pdf && (
                            <a
                              href={`/api/lista-compras/${pedido.lista_compras_id}/pdf${obterToken() ? `?token=${encodeURIComponent(obterToken()!)}` : ''}`}
                              onClick={(e) => handleVisualizarPdf(e, pedido.lista_compras_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary btn-view-pdf"
                              title="Visualizar e baixar PDF oficial do orçamento"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                              </svg>
                              <span>Visualizar PDF do Orçamento</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Grid das 3 cotações lado a lado */}
                      <div className="order-quotes-grid">
                        {pedido.cotacoes.map((cot, idx) => (
                          <div
                            key={cot.id}
                            className={`quote-card-item ${cot.selecionado ? 'is-winner' : ''}`}
                          >
                            <div className="quote-card-top">
                              <span className="quote-option-num">Opção {idx + 1}</span>
                              {cot.selecionado && (
                                <span className="quote-winner-badge">✓ Vencedor</span>
                              )}
                            </div>

                            <h4 className="quote-supplier-title">{cot.fornecedor}</h4>

                            <div className="quote-values-stack">
                              <div className="quote-value-line">
                                <span>Preço Unitário:</span>
                                <strong>{formatarMoeda(cot.preco_unitario)}</strong>
                              </div>
                              <div className="quote-value-line">
                                <span>Frete:</span>
                                <span>
                                  {cot.frete === 0 ? 'Grátis' : formatarMoeda(cot.frete)}
                                </span>
                              </div>
                              <div className="quote-value-line total">
                                <span>Total ({pedido.quantidade} un.):</span>
                                <strong>{formatarMoeda(cot.preco_total)}</strong>
                              </div>
                            </div>

                            <div className="quote-card-bottom">
                              {cot.link && (
                                <a
                                  href={cot.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-store-link"
                                  title="Abrir página da loja"
                                >
                                  Abrir loja ↗
                                </a>
                              )}

                              {onReaproveitar && (
                                <button
                                  type="button"
                                  className="btn-reuse-quote"
                                  onClick={() => onReaproveitar(cot.fornecedor, cot.link)}
                                  title="Usar este fornecedor e link na nova cotação"
                                >
                                  Reaproveitar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paginação da Lista de Pedidos */}
          {dados && (dados.total_paginas ?? 1) > 1 && (
            <div className="inventory-pagination history-pagination">
              <button
                type="button"
                className="btn btn-outline"
                disabled={pagina <= 1}
                onClick={() => mudarPagina(pagina - 1)}
              >
                Anterior
              </button>
              <span className="pagination-info">
                Página {pagina} de {dados.total_paginas} ({dados.total_pedidos} {dados.total_pedidos === 1 ? 'pedido' : 'pedidos'})
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={pagina >= (dados.total_paginas ?? 1)}
                onClick={() => mudarPagina(pagina + 1)}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
