import { useState } from 'react';
import type { ListaComprasItem } from './types';

interface CardItemCompraProps {
  item: ListaComprasItem;
  processando: boolean;
  onAvancarStatus: (item: ListaComprasItem) => void;
  onAbrirOrcamentos: (item: ListaComprasItem) => void;
  onEditar: (item: ListaComprasItem) => void;
  onExcluir: (id: number) => void;
  onFeedback: (tipo: 'success' | 'error', mensagem: string) => void;
}

function extrairDominio(linkUrl: string): string {
  try {
    const url = new URL(linkUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Abrir loja';
  }
}

export function CardItemCompra({
  item,
  processando,
  onAvancarStatus,
  onAbrirOrcamentos,
  onEditar,
  onExcluir,
  onFeedback,
}: CardItemCompraProps) {
  const [copiado, setCopiado] = useState(false);

  const copiarLink = async (url: string) => {
    if (!url) return;
    let copiou = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        copiou = true;
      } catch (err) {
        console.warn('Clipboard API indisponível, usando fallback:', err);
      }
    }

    if (!copiou) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copiou = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    }

    if (copiou) {
      setCopiado(true);
      onFeedback('success', 'Link copiado para a área de transferência!');
      setTimeout(() => setCopiado(false), 2500);
    } else {
      onFeedback('error', 'Não foi possível copiar o link.');
    }
  };

  const isComprado = item.status === 'comprado';
  const orcamentosQtd = item.orcamentos?.length || 0;

  return (
    <div className={`purchase-card ${isComprado ? 'purchase-card-bought' : 'purchase-card-pending'}`}>
      <div className="purchase-card-main">
        <div className="purchase-card-header">
          <div className="purchase-card-title-group">
            <h3 className="purchase-card-title">{item.nome}</h3>
            <div className="purchase-badges-row">
              {item.item_id ? (
                <span className="purchase-badge purchase-badge-linked" title="Item vinculado ao cadastro do estoque">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  Vinculado
                </span>
              ) : (
                <span className="purchase-badge purchase-badge-unlinked" title="Item avulso (ainda não vinculado)">
                  Avulso
                </span>
              )}

              <span className={`purchase-badge ${isComprado ? 'purchase-badge-status-bought' : 'purchase-badge-status-pending'}`}>
                <span className={`purchase-status-dot ${isComprado ? 'bought' : 'pending'}`}></span>
                {isComprado ? 'Comprado • A caminho' : 'Pendente'}
              </span>
            </div>
          </div>
        </div>

        <div className="purchase-card-meta">
          <div className="purchase-meta-item purchase-qty-tag">
            <span className="purchase-meta-label">Qtd:</span>
            <strong>{item.quantidade} un.</strong>
          </div>

          {item.link && (
            <div className="purchase-meta-item purchase-link-group">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="purchase-store-link"
                title={`Abrir link: ${item.link}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span>{extrairDominio(item.link)}</span>
              </a>

              <button
                type="button"
                className={`purchase-copy-btn ${copiado ? 'is-copied' : ''}`}
                onClick={() => copiarLink(item.link!)}
                title={copiado ? 'Link copiado!' : 'Copiar link'}
              >
                {copiado ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          )}

          {orcamentosQtd > 0 && (
            <div
              className="purchase-meta-item purchase-quotes-tag"
              onClick={() => onAbrirOrcamentos(item)}
              title="Ver orçamentos cadastrados"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>{orcamentosQtd} {orcamentosQtd === 1 ? 'orçamento' : 'orçamentos'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="purchase-card-actions">
        <button
          type="button"
          className="purchase-action-btn purchase-btn-budget"
          onClick={() => onAbrirOrcamentos(item)}
          title="Gerenciar orçamentos e cotações"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>Orçamentos</span>
          {orcamentosQtd > 0 && (
            <span className="purchase-action-badge">{orcamentosQtd}</span>
          )}
        </button>

        <button
          type="button"
          className={`purchase-action-btn ${isComprado ? 'purchase-btn-status-receive' : 'purchase-btn-status-buy'}`}
          onClick={() => onAvancarStatus(item)}
          disabled={processando}
          title={isComprado ? 'Confirmar entrega (registra entrada no estoque)' : 'Marcar produto como comprado'}
        >
          {processando ? (
            <span>Processando...</span>
          ) : isComprado ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span>Dar Entrada</span>
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Marcar Comprado</span>
            </>
          )}
        </button>

        <div className="purchase-actions-secondary">
          <button
            type="button"
            className="purchase-icon-btn purchase-icon-btn-edit"
            onClick={() => onEditar(item)}
            disabled={processando}
            title="Editar produto"
            aria-label="Editar produto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>

          <button
            type="button"
            className="purchase-icon-btn purchase-icon-btn-delete"
            onClick={() => onExcluir(item.id)}
            disabled={processando}
            title="Excluir item da lista"
            aria-label="Excluir produto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
