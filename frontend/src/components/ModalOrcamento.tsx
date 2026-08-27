import { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Orcamento {
  id: number;
  fornecedor: string;
  preco_unitario: number;
  frete: number;
  link: string | null;
  selecionado: boolean;
}

interface ModalOrcamentoProps {
  item: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function ModalOrcamento({ item, onClose, onSuccess, onError }: ModalOrcamentoProps) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Form states
  const [fornecedor, setFornecedor] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [frete, setFrete] = useState('');
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarOrcamentos();
  }, [item.id]);

  const carregarOrcamentos = async () => {
    setCarregando(true);
    try {
      const res = await axios.get(`/api/lista-compras/${item.id}`);
      setOrcamentos(res.data.orcamentos || []);
    } catch (error: any) {
      onError(error.response?.data?.detail || 'Erro ao carregar orçamentos.');
    } finally {
      setCarregando(false);
    }
  };

  const adicionarOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await axios.post(`/api/lista-compras/${item.id}/orcamentos`, {
        fornecedor,
        preco_unitario: parseFloat(precoUnitario.replace(',', '.')),
        frete: frete ? parseFloat(frete.replace(',', '.')) : 0,
        link: link || null
      });
      onSuccess(`Orçamento de ${fornecedor} adicionado!`);
      setFornecedor('');
      setPrecoUnitario('');
      setFrete('');
      setLink('');
      carregarOrcamentos();
    } catch (error: any) {
      onError(error.response?.data?.detail || 'Erro ao adicionar orçamento.');
    } finally {
      setSalvando(false);
    }
  };

  const deletarOrcamento = async (id: number) => {
    if (!confirm('Deseja excluir este orçamento?')) return;
    try {
      await axios.delete(`/api/lista-compras/orcamentos/${id}`);
      onSuccess('Orçamento excluído.');
      carregarOrcamentos();
    } catch (error: any) {
      onError('Erro ao excluir orçamento.');
    }
  };

  const selecionarOrcamento = async (id: number) => {
    try {
      await axios.put(`/api/lista-compras/orcamentos/${id}`, { selecionado: true });
      onSuccess('Orçamento selecionado!');
      carregarOrcamentos();
    } catch (error) {
      onError('Erro ao selecionar orçamento.');
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    
    // Configurações iniciais
    doc.setFont("helvetica", "normal");
    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    
    doc.setFontSize(12);
    doc.text(`Bom Jesus dos Perdões, ${dataAtual}.`, 20, 20);
    
    doc.setFont("helvetica", "bold");
    doc.text("De:", 20, 35);
    doc.setFont("helvetica", "normal");
    doc.text("Yago", 30, 35);

    doc.setFont("helvetica", "bold");
    doc.text("Para:", 20, 42);
    doc.setFont("helvetica", "normal");
    doc.text("Julia / Katia", 32, 42);

    doc.setFont("helvetica", "bold");
    doc.text("REF:", 20, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`Compra - ${item.nome}`, 32, 55);

    // Tabela
    const tableData = orcamentos.map((orc, index) => {
      const valorTotal = (orc.preco_unitario * item.quantidade) + orc.frete;
      return [
        index + 1,
        `R$ ${orc.preco_unitario.toFixed(2).replace('.', ',')}`,
        item.quantidade,
        orc.frete === 0 ? 'Grátis' : `R$ ${orc.frete.toFixed(2).replace('.', ',')}`,
        `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
        orc.fornecedor
      ];
    });

    autoTable(doc, {
      startY: 65,
      head: [['', 'Preço unitário', 'Qtde', 'Frete', 'Preço total', 'Site']],
      body: tableData,
      theme: 'grid',
      styles: { halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [40, 40, 40] }
    });

    // Assinatura
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.text("Atenciosamente,", 20, finalY + 20);
    doc.text("Yago Canton.", 20, finalY + 30);

    doc.save(`Orcamento_${item.nome}.pdf`);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
        display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>Orçamentos: {item.nome}</h2>
        
        {carregando ? <p style={{ color: 'var(--text-muted)' }}>Carregando orçamentos...</p> : (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orcamentos.map((orc, i) => (
              <div key={orc.id} style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.2)', border: orc.selecionado ? '2px solid var(--accent-success)' : '1px solid var(--glass-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>Opção {i + 1}: {orc.fornecedor}</strong>
                  <p style={{ margin: '4px 0', fontSize: '0.95rem', color: 'var(--text-muted)' }}>Unid: R$ {orc.preco_unitario.toFixed(2).replace('.', ',')} | Frete: R$ {orc.frete.toFixed(2).replace('.', ',')}</p>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>Total: R$ {((orc.preco_unitario * item.quantidade) + orc.frete).toFixed(2).replace('.', ',')}</p>
                  {orc.link && <a href={orc.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', display: 'inline-block', marginTop: '8px' }}>Abrir Link da Loja</a>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  {!orc.selecionado && <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }} onClick={() => selecionarOrcamento(orc.id)}>Escolher Este</button>}
                  {orc.selecionado && <span style={{ color: 'var(--accent-success)', fontWeight: 'bold', textAlign: 'center' }}>Vencedor ✓</span>}
                  <button className="btn btn-outline" style={{ borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }} onClick={() => deletarOrcamento(orc.id)}>Excluir</button>
                </div>
              </div>
            ))}
            {orcamentos.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhum orçamento cadastrado para este item ainda.</p>}
          </div>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
          <h3>Adicionar Nova Opção</h3>
          <form onSubmit={adicionarOrcamento} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Fornecedor (Site/Loja)</label>
              <input type="text" value={fornecedor} onChange={e => setFornecedor(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} placeholder="Ex: Mercado Livre" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Preço Unitário (R$)</label>
              <input type="text" value={precoUnitario} onChange={e => setPrecoUnitario(e.target.value)} required placeholder="Ex: 118,00" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Frete (R$)</label>
              <input type="text" value={frete} onChange={e => setFrete(e.target.value)} placeholder="0,00 se grátis" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Link (Opcional)</label>
              <input type="url" value={link} onChange={e => setLink(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} placeholder="https://..." />
            </div>
            <button type="submit" className="btn btn-primary" disabled={salvando} style={{ gridColumn: '1 / -1', padding: '0.75rem' }}>
              {salvando ? 'Salvando...' : 'Adicionar Orçamento'}
            </button>
          </form>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} style={{ padding: '0.75rem 2rem' }}>Fechar</button>
          <button type="button" className="btn btn-primary" onClick={exportarPDF} disabled={orcamentos.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
