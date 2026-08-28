import { useEffect, useState } from 'react';
import './App.css';
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

type Tab = 'dashboard' | 'consulta_estoque' | 'estoque_critico' | 'cadastro_estoque' | 'movimentacoes' | 'compras' | 'historicos' | 'historico_compras' | 'historico_ajustes' | 'emprestimos' | 'historico_devolucoes';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const renderTab = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'consulta_estoque': return <ConsultaEstoque />;
      case 'estoque_critico': return <EstoqueCritico onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'cadastro_estoque': return <Estoque />;
      case 'movimentacoes': return <Movimentacoes />;
      case 'emprestimos': return <Emprestimos onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'historico_devolucoes': return <HistoricoDevolucoes onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'compras': return <ListaCompras onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'historico_compras': return <HistoricoCompras onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'historico_ajustes': return <HistoricoAjustes onNavigate={(t) => setActiveTab(t as Tab)} />;
      case 'historicos': return <Historicos onNavigate={(t) => setActiveTab(t as Tab)} />;
      default: return <Dashboard onNavigate={(t) => setActiveTab(t as Tab)} />;
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
      </header>

      <div className="history-shortcuts">
        <button 
          className="btn btn-outline"
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-expanded={settingsOpen}
          aria-controls="history-shortcuts-menu"
          title="Abrir atalhos de históricos"
          aria-label="Abrir atalhos de históricos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        
        {settingsOpen && (
          <div id="history-shortcuts-menu" className="history-shortcuts-menu">
            <h3>Históricos</h3>
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
            <img
              src="/logo.png"
              alt="Logo Arthi"
              className="sidebar-logo-image"
            />
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
            className={activeTab === 'historicos' || activeTab === 'historico_compras' || activeTab === 'historico_devolucoes' || activeTab === 'historico_ajustes' ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => navigateTo('historicos')}
          >
            Históricos
          </button>
        </nav>
      </aside>

      <main className="container">
        {renderTab()}
      </main>
    </>
  )
}

export default App;
