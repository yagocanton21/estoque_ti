interface FiltrosMaquinasProps {
  busca: string;
  setBusca: (v: string) => void;
  filtrosAbertos: boolean;
  setFiltrosAbertos: (fn: (v: boolean) => boolean) => void;
  filtrosAtivos: number;
  setoresDisponiveis: string[];
  setorSelecionado: string;
  setSetorSelecionado: (v: string) => void;
  opcoesFiltro: {
    sistemas_operacionais: string[];
    offices: string[];
    antivirus: string[];
  };
  soSelecionado: string;
  setSoSelecionado: (v: string) => void;
  officeSelecionado: string;
  setOfficeSelecionado: (v: string) => void;
  antivirusSelecionado: string;
  setAntivirusSelecionado: (v: string) => void;
  onLimparFiltros: () => void;
  onAbrirImportar: () => void;
  onExportar: () => void;
  onNovaMaquina: () => void;
  onResetPagina: () => void;
}

export function FiltrosMaquinas({
  busca,
  setBusca,
  filtrosAbertos,
  setFiltrosAbertos,
  filtrosAtivos,
  setoresDisponiveis,
  setorSelecionado,
  setSetorSelecionado,
  opcoesFiltro,
  soSelecionado,
  setSoSelecionado,
  officeSelecionado,
  setOfficeSelecionado,
  antivirusSelecionado,
  setAntivirusSelecionado,
  onLimparFiltros,
  onAbrirImportar,
  onExportar,
  onNovaMaquina,
  onResetPagina,
}: FiltrosMaquinasProps) {
  return (
    <>
      <div className="inventory-toolbar" style={{ gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div className="inventory-search" style={{ flex: '1', minWidth: '260px' }}>
          <input
            type="text"
            placeholder="Pesquisar máquina, IP, usuário, AD, setor..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              onResetPagina();
            }}
          />
          {busca && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setBusca('');
                onResetPagina();
              }}
              title="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          id="btn-filtros"
          className={`btn btn-outline${filtrosAbertos || filtrosAtivos > 0 ? ' filter-toggle-active' : ''}`}
          onClick={() => setFiltrosAbertos((v) => !v)}
          title="Filtrar por setor, sistema operacional, Office e antivírus"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          <span>Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ''}</span>
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onAbrirImportar}
            title="Importar dados de planilha Excel ou CSV"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Importar Planilha</span>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onExportar}
            title="Exportar planilha Excel (.xlsx)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onNovaMaquina}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Nova Máquina</span>
          </button>
        </div>
      </div>

      {filtrosAbertos && (
        <div className="filter-panel">
          {([
            ['Setor', 'setor', setoresDisponiveis, setorSelecionado, setSetorSelecionado, 'Todos'],
            ['Sistema Operacional', 'so', opcoesFiltro.sistemas_operacionais, soSelecionado, setSoSelecionado, 'Todos'],
            ['Office', 'office', opcoesFiltro.offices, officeSelecionado, setOfficeSelecionado, 'Todos'],
            ['Antivírus', 'antivirus', opcoesFiltro.antivirus, antivirusSelecionado, setAntivirusSelecionado, 'Todos'],
          ] as [string, string, string[], string, (v: string) => void, string][]).map(([rotulo, id, opcoes, valor, setValor, todos]) => (
            <label key={id} className="filter-panel-field" htmlFor={`filtro-${id}`}>
              <span>{rotulo}</span>
              <select
                id={`filtro-${id}`}
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  onResetPagina();
                }}
              >
                <option value="">{todos}</option>
                {opcoes.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {filtrosAtivos > 0 && (
            <button type="button" className="btn btn-outline" onClick={onLimparFiltros}>
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </>
  );
}
