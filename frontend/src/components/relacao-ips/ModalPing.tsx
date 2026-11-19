import { useEffect, useRef, useState } from 'react';
import { obterToken } from '../../services/auth';
import './ModalPing.css';

interface ModalPingProps {
  nome: string;
  ip: string;
  onClose: () => void;
}

interface LinhaTerminal {
  texto: string;
  tipo: 'cmd' | 'success' | 'timeout' | 'error' | 'info';
}

export function ModalPing({ nome, ip, onClose }: ModalPingProps) {
  const [linhas, setLinhas] = useState<LinhaTerminal[]>([]);
  const [executando, setExecutando] = useState(false);
  const [statusConexao, setStatusConexao] = useState<'iniciando' | 'respondendo' | 'sem-resposta' | 'concluido' | 'parado' | 'erro'>('iniciando');
  const [enviados, setEnviados] = useState(0);
  const [recebidos, setRecebidos] = useState(0);
  const [copiado, setCopiado] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll para a última linha do terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [linhas]);

  const classificarLinha = (texto: string): LinhaTerminal['tipo'] => {
    const t = texto.toLowerCase();
    if (t.startsWith('c:\\') || t.startsWith('$') || t.startsWith('disparando') || t.startsWith('microsoft') || t.startsWith('(c)')) {
      return 'cmd';
    }
    if (
      t.includes('resposta de') ||
      t.includes('tempo=') ||
      t.includes('tempo<') ||
      t.includes('bytes=') ||
      t.includes('time=') ||
      t.includes('ttl=')
    ) {
      if (t.includes('inacess') || t.includes('esgotado') || t.includes('unreachable') || t.includes('falha')) {
        return 'timeout';
      }
      return 'success';
    }
    if (
      t.includes('esgotado') ||
      t.includes('unreachable') ||
      t.includes('inacess') ||
      t.includes('timeout') ||
      t.includes('100% packet loss') ||
      t.includes('100% de perda') ||
      t.includes('falha')
    ) {
      return 'timeout';
    }
    if (t.includes('erro') || t.includes('inválido')) {
      return 'error';
    }
    return 'info';
  };

  const iniciarPing = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setExecutando(true);
    setStatusConexao('iniciando');
    setLinhas([
      { texto: `Microsoft Windows [versão 10.0.19045.5486]\n(c) Microsoft Corporation. Todos os direitos reservados.\n\nC:\\Users\\Suporte>ping ${ip} -t\n`, tipo: 'cmd' },
    ]);
    setEnviados(0);
    setRecebidos(0);

    const token = obterToken();

    try {
      const response = await fetch(
        `/api/diagnostico/ping?ip=${encodeURIComponent(ip)}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const msg = errJson?.detail || `Erro HTTP ${response.status}`;
        setLinhas((prev) => [...prev, { texto: `Erro ao iniciar ping: ${msg}`, tipo: 'error' }]);
        setStatusConexao('erro');
        setExecutando(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setLinhas((prev) => [...prev, { texto: 'Falha ao ler resposta em tempo real.', tipo: 'error' }]);
        setStatusConexao('erro');
        setExecutando(false);
        return;
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const mensagens = buffer.split('\n\n');
        buffer = mensagens.pop() || '';

        for (const msg of mensagens) {
          const partes = msg.split('\n');
          for (const parte of partes) {
            if (parte.startsWith('data: ')) {
              try {
                const dados = JSON.parse(parte.slice(6));
                const textoLinha = dados.linha;
                const tipo = classificarLinha(textoLinha);

                setLinhas((prev) => {
                  const novas = [...prev, { texto: textoLinha, tipo }];
                  return novas.length > 300 ? novas.slice(novas.length - 300) : novas;
                });

                if (tipo === 'success') {
                  setStatusConexao('respondendo');
                  setRecebidos((r) => r + 1);
                  setEnviados((e) => e + 1);
                } else if (tipo === 'timeout') {
                  setStatusConexao('sem-resposta');
                  setEnviados((e) => e + 1);
                }

                if (dados.status === 'concluido') {
                  setStatusConexao((curr) => (curr === 'respondendo' ? 'concluido' : 'sem-resposta'));
                }
              } catch {
                // Linha de texto simples
                setLinhas((prev) => [...prev, { texto: parte.slice(6), tipo: 'info' }]);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setLinhas((prev) => [...prev, { texto: '^C (Interrompido pelo usuário)', tipo: 'cmd' }]);
        setStatusConexao('parado');
      } else {
        setLinhas((prev) => [...prev, { texto: `Erro de conexão: ${err.message}`, tipo: 'error' }]);
        setStatusConexao('erro');
      }
    } finally {
      setExecutando(false);
    }
  };

  const pararPing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setExecutando(false);
    setStatusConexao('parado');
  };

  const copiarComandoCmd = () => {
    navigator.clipboard.writeText(`ping ${ip} -t`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  useEffect(() => {
    iniciarPing();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [ip]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const perdaPct = enviados > 0 ? Math.round(((enviados - recebidos) / enviados) * 100) : 0;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="edit-modal ping-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-ping-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ping-modal-header">
          <div className="ping-modal-title-group">
            <h2 id="modal-ping-title" className="ping-modal-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: '#38bdf8' }}
              >
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
              Ping — {nome}
            </h2>
            <div className="ping-modal-subtitle">
              <span>IP: <code style={{ color: '#60a5fa' }}>{ip}</code></span>
              <span>•</span>
              <span className={`ping-status-badge ${statusConexao}`}>
                {executando && <span className="ping-pulse-dot"></span>}
                {statusConexao === 'iniciando' && 'Conectando...'}
                {statusConexao === 'respondendo' && '🟢 Online / Respondendo'}
                {statusConexao === 'sem-resposta' && '🔴 Sem Resposta'}
                {statusConexao === 'concluido' && '✓ Concluído'}
                {statusConexao === 'parado' && '⏹️ Parado'}
                {statusConexao === 'erro' && '⚠️ Falha'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ padding: '0.3rem 0.6rem', border: 'none', fontSize: '1.2rem', color: '#94a3b8' }}
            onClick={onClose}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        <div className="ping-stats-bar">
          <div className="ping-stat-item">
            <span>Enviados:</span>
            <strong>{enviados}</strong>
          </div>
          <div className="ping-stat-item">
            <span>Recebidos:</span>
            <strong style={{ color: recebidos > 0 ? '#4ade80' : 'inherit' }}>{recebidos}</strong>
          </div>
          <div className="ping-stat-item">
            <span>Perda:</span>
            <strong style={{ color: perdaPct > 0 ? '#f87171' : '#4ade80' }}>{perdaPct}%</strong>
          </div>
        </div>

        <div className="ping-terminal-container">
          <div className="ping-terminal-header">
            <div className="ping-terminal-dots">
              <span className="dot-red"></span>
              <span className="dot-yellow"></span>
              <span className="dot-green"></span>
            </div>
            <span>CMD / Terminal — ping {ip} -t (contínuo)</span>
            <span style={{ opacity: 0.6 }}>{executando ? 'Ativo' : 'Pronto'}</span>
          </div>
          <div className="ping-terminal-body">
            {linhas.map((l, idx) => (
              <div key={idx} className={`terminal-line ${l.tipo}`}>
                {l.texto}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>

        <div className="ping-modal-footer">
          <div className="ping-footer-actions-left">
            <button
              type="button"
              className="btn-terminal-copy"
              onClick={copiarComandoCmd}
              title="Copia comando 'ping ip -t' para colar no seu CMD local"
            >
              {copiado ? '✓ Comando Copiado!' : '📋 Copiar comando CMD (ping -t)'}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}
              onClick={() => setLinhas([])}
              title="Limpar tela do terminal"
            >
              Limpar
            </button>
          </div>

          <div className="ping-footer-actions-right">
            {executando ? (
              <button
                type="button"
                className="btn-terminal-stop"
                onClick={pararPing}
              >
                ⏹ Parar Ping
              </button>
            ) : (
              <button
                type="button"
                className="btn-terminal-start"
                onClick={iniciarPing}
              >
                ▶ Reiniciar Ping
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.82rem', padding: '0.42rem 0.9rem' }}
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
