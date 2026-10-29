import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Dashboard } from './components/Dashboard';
import { Estoque } from './components/Estoque';
import { ConsultaEstoque } from './components/ConsultaEstoque';
import { ListaCompras } from './components/ListaCompras';
import { HistoricoCompras } from './components/HistoricoCompras';
import { Emprestimos } from './components/Emprestimos';
import { HistoricoDevolucoes } from './components/HistoricoDevolucoes';
import { Movimentacoes } from './components/Movimentacoes';
import { EstoqueCritico } from './components/EstoqueCritico';
import { Historicos } from './components/Historicos';
import { HistoricoAjustes } from './components/HistoricoAjustes';
import { HistoricoMovimentacoes } from './components/HistoricoMovimentacoes';
import { RelacaoIps } from './components/RelacaoIps';
import { Backups } from './components/painel-backups/Backups';
import { Login } from './components/Login';
import type { ResumoBackups } from './components/painel-backups/types';
import {
  configurarAuthInterceptor,
  obterToken,
  obterUsuario,
  limparSessao,
  verificarSessaoApi,
} from './services/auth';
import './components/AppShell.css';

type Tab =
  | 'dashboard'
  | 'consulta_estoque'
  | 'estoque_critico'
  | 'cadastro_estoque'
  | 'movimentacoes'
  | 'compras'
  | 'historicos'
  | 'historico_movimentacoes'
  | 'historico_compras'
  | 'historico_ajustes'
  | 'emprestimos'
  | 'historico_devolucoes'
  | 'relacao_ips'
  | 'backups';

const INTERVALO_RESUMO_BACKUPS_MS = 60_000;

function App() {
  const [autenticado, setAutenticado] = useState<boolean>(() => !!obterToken());
  const [carregandoAuth, setCarregandoAuth] = useState<boolean>(() => !!obterToken());
  const [usuarioLogado, setUsuarioLogado] = useState<string | null>(() => obterUsuario());

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resumoBackups, setResumoBackups] = useState<ResumoBackups | null>(null);
  const [erroBackups, setErroBackups] = useState(false);

  // Logout
  const handleLogout = useCallback(() => {
    limparSessao();
    setAutenticado(false);
    setUsuarioLogado(null);
    setResumoBackups(null);
  }, []);

  // Configura interceptor Axios uma única vez
  useEffect(() => {
    configurarAuthInterceptor(() => {
      handleLogout();
    });
  }, [handleLogout]);

  // Validação inicial do token com a API
  useEffect(() => {
    const token = obterToken();
    if (!token) {
      setCarregandoAuth(false);
      return;
    }

    verificarSessaoApi()
      .then((info) => {
        setAutenticado(true);
        setUsuarioLogado(info.username);
      })
      .catch(() => {
        limparSessao();
        setAutenticado(false);
        setUsuarioLogado(null);
      })
      .finally(() => {
        setCarregandoAuth(false);
      });
  }, []);

  // Resumo dos backups fica no App: alimenta a Visão Geral e o contador do menu
  const carregarResumoBackups = useCallback(async () => {
    if (!autenticado) return;
    try {
      const res = await axios.get<ResumoBackups>('/api/backups/resumo');
      setResumoBackups(res.data);
      setErroBackups(false);
    } catch (error) {
      console.error('Erro ao consultar o resumo dos backups:', error);
      setErroBackups(true);
    }
  }, [autenticado]);

  useEffect(() => {
    if (!autenticado) return;
    carregarResumoBackups();
    const timer = setInterval(carregarResumoBackups, INTERVALO_RESUMO_BACKUPS_MS);
    return () => clearInterval(timer);
  }, [autenticado, carregarResumoBackups]);

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', closeMenus);
    return () => window.removeEventListener('keydown', closeMenus);
  }, []);

  const navigateTo = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setSettingsOpen(false);
  };

  const handleLoginSuccess = (usuario: string) => {
    setUsuarioLogado(usuario);
    setAutenticado(true);
  };

  if (carregandoAuth) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner"></div>
        <p>Verificando acesso...</p>
      </div>
    );
  }

  if (!autenticado) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={(t) => setActiveTab(t as Tab)}
            resumoBackups={resumoBackups}
            erroBackups={erroBackups}
          />
        );
      case 'consulta_estoque':
        return <ConsultaEstoque />;
      case 'estoque_critico':
        return <EstoqueCritico onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'cadastro_estoque':
        return <Estoque />;
      case 'movimentacoes':
        return <Movimentacoes />;
      case 'emprestimos':
        return <Emprestimos onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'historico_devolucoes':
        return <HistoricoDevolucoes onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'compras':
        return <ListaCompras onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'relacao_ips':
        return <RelacaoIps />;
      case 'backups':
        return <Backups onAtualizado={carregarResumoBackups} />;
      case 'historico_compras':
        return <HistoricoCompras onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'historico_ajustes':
        return <HistoricoAjustes onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'historico_movimentacoes':
        return <HistoricoMovimentacoes onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'historicos':
        return <Historicos onNavigate={(t) => setActiveTab(t as Tab)} />;
      default:
        return (
          <Dashboard
            onNavigate={(t) => setActiveTab(t as Tab)}
            resumoBackups={resumoBackups}
            erroBackups={erroBackups}
          />
        );
    }
  };

  return (
    <>
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menu de navegação"
          aria-expanded={mobileMenuOpen}
          aria-controls="main-navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <img src="/logo.png" alt="" className="mobile-logo-image" />
        <span>Estoque TI</span>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleLogout}
          title="Sair do sistema"
          style={{ marginLeft: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
        >
          Sair
        </button>
      </header>

      <div className="history-shortcuts">
        <div className="topbar-user-badge">
          <span>👤</span>
          <span>{usuarioLogado || 'admin'}</span>
        </div>

        <button
          className="btn btn-topbar-logout"
          onClick={handleLogout}
          title="Sair do sistema"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sair</span>
        </button>

        <button
          className="btn btn-outline btn-settings"
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-expanded={settingsOpen}
          aria-controls="history-shortcuts-menu"
          title="Abrir atalhos de históricos"
          aria-label="Abrir atalhos de históricos"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>

        {settingsOpen && (
          <div id="history-shortcuts-menu" className="history-shortcuts-menu">
            <h3>Históricos</h3>
            <button
              className="btn btn-outline"
              onClick={() => navigateTo('historico_movimentacoes')}
            >
              <span style={{ marginRight: '8px' }}>↕</span> Entradas e Saídas
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigateTo('historico_compras')}
            >
              <span style={{ marginRight: '8px' }}>📜</span> Histórico de Compras
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigateTo('historico_devolucoes')}
            >
              <span style={{ marginRight: '8px' }}>↩️</span> Histórico de Devoluções
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigateTo('historico_ajustes')}
            >
              <span style={{ marginRight: '8px' }}>±</span> Histórico de Ajustes
            </button>
            <hr style={{ borderColor: 'var(--glass-border)', margin: '0.4rem 0' }} />
            <button
              className="btn btn-outline"
              onClick={handleLogout}
              style={{ color: '#fca5a5' }}
            >
              <span style={{ marginRight: '8px' }}>🚪</span> Sair da Conta
            </button>
          </div>
        )}
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          className="navigation-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fechar menu de navegação"
        />
      )}

      <aside id="main-navigation" className={`sidebar${mobileMenuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src="/logo.png" alt="Logo Arthi" className="sidebar-logo-image" />
            <span>Estoque TI</span>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu de navegação"
          >
            ×
          </button>
        </div>

        <nav>
          <button
            className={activeTab === 'dashboard' ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => navigateTo('dashboard')}
          >
            Visão Geral
          </button>
          <button
            className={activeTab === 'consulta_estoque' ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => navigateTo('consulta_estoque')}
          >
            Consultar Produtos
          </button>
          <button
            className={activeTab === 'cadastro_estoque' ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => navigateTo('cadastro_estoque')}
          >
            Cadastrar Produto
          </button>
          <button
            className={activeTab === 'movimentacoes' ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => navigateTo('movimentacoes')}
          >
            Entrada / Saída
          </button>
          <button
            className={activeTab === 'emprestimos' ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => navigateTo('emprestimos')}
          >
            Empréstimos
          </button>
          <button
            className={activeTab === 'compras' ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => navigateTo('compras')}
          >
            Lista de Compras
          </button>
          <button
            className={activeTab === 'relacao_ips' ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => navigateTo('relacao_ips')}
          >
            Relação de IPs
          </button>
          <button
            className={activeTab === 'backups' ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => navigateTo('backups')}
          >
            Backups
            {resumoBackups && resumoBackups.problemas > 0 && (
              <span className="nav-problem-count" title="Backups com problema">
                {resumoBackups.problemas}
              </span>
            )}
          </button>
          <button
            className={
              activeTab === 'historicos' ||
              activeTab === 'historico_movimentacoes' ||
              activeTab === 'historico_compras' ||
              activeTab === 'historico_devolucoes' ||
              activeTab === 'historico_ajustes'
                ? 'btn btn-primary'
                : 'btn btn-outline'
            }
            onClick={() => navigateTo('historicos')}
          >
            Históricos
          </button>
        </nav>
      </aside>

      <main className="container">{renderTab()}</main>
    </>
  );
}

export default App;
