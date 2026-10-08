import { useState } from 'react';
import axios from 'axios';

interface ModalImportarPlanilhaProps {
  onClose: () => void;
  onImportadoSucesso: () => void;
}

export function ModalImportarPlanilha({ onClose, onImportadoSucesso }: ModalImportarPlanilhaProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    criados: number;
    atualizados: number;
    ignorados: number;
    total_linhas: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      setErro(null);
      setResultado(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setErro('Por favor, selecione um arquivo de planilha (.xlsx ou .csv).');
      return;
    }

    setImportando(true);
    setErro(null);

    const formData = new FormData();
    formData.append('file', arquivo);

    try {
      const res = await axios.post('/api/relacao-ips/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(res.data);
      onImportadoSucesso();
    } catch (err: any) {
      console.error('Erro na importação:', err);
      setErro(err.response?.data?.detail || 'Erro ao importar a planilha. Verifique a formatação do arquivo.');
    } finally {
      setImportando(false);
    }
  };

  const baixarModeloCsv = () => {
    const cabecalho = 'Nome da Máquina;IP;Usuário;Usuário AD;Setor;Sistema Operacional;Office;Antivírus;Observações\n';
    const linhaExemplo = 'TI-DESK01;192.168.1.100;Carlos Silva;carlos.silva;TI;Windows 11 Pro;Office 2021;Windows Defender;Máquina principal do suporte\n';
    const blob = new Blob([cabecalho + linhaExemplo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_relacao_ips.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="edit-modal import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-importar-title"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        <div className="edit-modal-header">
          <div>
            <span>Planilha Excel / CSV</span>
            <h2 id="modal-importar-title">Importar Relação de IPs</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        {erro && (
          <div className="modal-error-alert" style={{ marginBottom: '1rem' }}>
            <span>⚠️ {erro}</span>
          </div>
        )}

        {resultado ? (
          <div className="import-success-box" style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--accent-success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✓ Importação finalizada com sucesso!
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem' }}>
              <li>Total de registros processados: <strong>{resultado.total_linhas}</strong></li>
              <li>Novas máquinas cadastradas: <strong style={{ color: 'var(--accent-success)' }}>+{resultado.criados}</strong></li>
              <li>Máquinas atualizadas: <strong style={{ color: 'var(--accent-secondary)' }}>{resultado.atualizados}</strong></li>
              {resultado.ignorados > 0 && <li>Linhas vazias ignoradas: {resultado.ignorados}</li>}
            </ul>
            <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem' }} onClick={onClose}>
              Concluir e Ver Máquinas
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpload}>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.45', marginBottom: '1rem' }}>
                Envie sua planilha atual em formato <strong>.xlsx</strong> (Excel) ou <strong>.csv</strong>. 
                O sistema reconhece automaticamente colunas como <em>Máquina, IP, Usuário, AD, Setor, S.O., Office e Antivírus</em>.
              </p>

              <div
                style={{
                  border: '2px dashed var(--glass-border)',
                  borderRadius: '12px',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .txt"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                />
                <div style={{ pointerEvents: 'none' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-secondary)', marginBottom: '0.75rem' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p style={{ fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    {arquivo ? `Arquivo selecionado: ${arquivo.name}` : 'Clique ou arraste o arquivo da planilha aqui'}
                  </p>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Suporta arquivos Excel (.xlsx) e CSV
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Precisa de um modelo padrão?
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={baixarModeloCsv}
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                >
                  Baixar Modelo CSV
                </button>
              </div>
            </div>

            <div className="edit-modal-actions">
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={importando}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={!arquivo || importando}>
                {importando ? 'Importando e Processando...' : 'Iniciar Importação'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
