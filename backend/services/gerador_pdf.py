import io
import os
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def formatar_moeda_br(valor: float) -> str:
    """Formata valor float para formato moeda brasileiro R$ X.XXX,XX"""
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def formatar_data_extenso_pt(dt: datetime) -> str:
    meses = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ]
    return f"{dt.day:02d} de {meses[dt.month - 1]} de {dt.year}"


def sanitizar_nome_arquivo(nome: str) -> str:
    # Converte acentos em ASCII puro para conformidade com headers HTTP (RFC 5987 / latin1/ascii)
    ascii_str = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode("ascii")
    seguro = re.sub(r"[^A-Za-z0-9_-]+", "_", ascii_str).strip("_")
    return f"Orcamento_{seguro[:60]}.pdf" if seguro else "Orcamento_compra.pdf"


class NumberedCanvas(canvas.Canvas):
    """Canvas com duas passagens para calcular o número total de páginas (Página X de Y)."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total_paginas = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.desenhar_cabecalho_e_rodape(total_paginas)
            super().showPage()
        super().save()

    def desenhar_cabecalho_e_rodape(self, total_paginas: int):
        largura, altura = A4
        margem_x = 40

        # --- Cabeçalho ---
        logo_path = Path(__file__).resolve().parents[1] / "static" / "logo.png"
        if not logo_path.exists():
            logo_path = Path(__file__).resolve().parents[2] / "frontend" / "public" / "logo.png"

        tem_logo = logo_path.exists()
        if tem_logo:
            try:
                self.drawImage(str(logo_path), margem_x, altura - 56, width=28, height=28, mask="auto")
            except Exception:
                tem_logo = False

        self.setFont("Helvetica-Bold", 15)
        self.setFillColor(colors.HexColor("#14378c"))
        x_ti = margem_x + 36 if tem_logo else margem_x
        self.drawString(x_ti, altura - 45, "TI")

        self.setFont("Helvetica-Bold", 13)
        self.setFillColor(colors.HexColor("#1e293b"))
        self.drawRightString(largura - margem_x, altura - 40, "ORÇAMENTO DE COMPRA")

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawRightString(largura - margem_x, altura - 52, "Documento para análise e aprovação")

        self.setStrokeColor(colors.HexColor("#14378c"))
        self.setLineWidth(0.8)
        self.line(margem_x, altura - 64, largura - margem_x, altura - 64)

        # --- Rodapé ---
        y_rodape_linha = 35
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.4)
        self.line(margem_x, y_rodape_linha, largura - margem_x, y_rodape_linha)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(margem_x, y_rodape_linha - 12, "Arthi · Estoque TI · Documento oficial gerado pelo servidor")
        texto_pagina = f"Página {self._pageNumber} de {total_paginas}"
        self.drawRightString(largura - margem_x, y_rodape_linha - 12, texto_pagina)


def gerar_pdf_orcamento_bytes(
    item_nome: str,
    item_quantidade: int,
    orcamentos: list,
    cidade: str,
    solicitante: str,
    destinatario: str,
    assinatura: str,
    data_documento: Optional[datetime] = None,
) -> bytes:
    """
    Gera o PDF oficial de orçamento de compra usando ReportLab.
    O cálculo dos totais (preco_unitario * quantidade + frete) é executado
    estritamente no servidor com dados do banco.
    """
    if data_documento is None:
        data_documento = datetime.now(timezone.utc)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=75,
        bottomMargin=50,
    )

    largura_util = A4[0] - 80  # 595.28 - 80 = 515.28 pt

    styles = getSampleStyleSheet()
    normal_style = styles["Normal"]

    style_meta_label = ParagraphStyle(
        "MetaLabel",
        parent=normal_style,
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#64748b"),
    )
    style_meta_val = ParagraphStyle(
        "MetaVal",
        parent=normal_style,
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    )
    style_table_header = ParagraphStyle(
        "TableHeader",
        parent=normal_style,
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        alignment=1,  # Center
        textColor=colors.HexColor("#14378c"),
    )
    style_table_cell = ParagraphStyle(
        "TableCell",
        parent=normal_style,
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        alignment=1,  # Center
        textColor=colors.HexColor("#1e293b"),
    )
    style_table_cell_left = ParagraphStyle(
        "TableCellLeft",
        parent=normal_style,
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        alignment=0,  # Left
        textColor=colors.HexColor("#1e293b"),
    )
    style_table_cell_right = ParagraphStyle(
        "TableCellRight",
        parent=normal_style,
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        alignment=2,  # Right
        textColor=colors.HexColor("#1e293b"),
    )

    story = []

    # 1. Caixa DE / PARA / REFERÊNCIA / LOCAL E DATA
    data_formatada = formatar_data_extenso_pt(data_documento)
    tabela_meta_data = [
        [
            Paragraph(f"<font color='#64748b'><b>DE:</b></font><br/>{solicitante.strip()}", style_meta_val),
            Paragraph(f"<font color='#64748b'><b>PARA:</b></font><br/>{destinatario.strip()}", style_meta_val),
        ],
        [
            Paragraph("<font color='#64748b'><b>REFERÊNCIA:</b></font><br/>Compra", style_meta_val),
            Paragraph(f"<font color='#64748b'><b>LOCAL E DATA:</b></font><br/>{cidade.strip()}, {data_formatada}", style_meta_val),
        ],
    ]
    tabela_meta = Table(tabela_meta_data, colWidths=[largura_util * 0.5, largura_util * 0.5])
    tabela_meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(tabela_meta)
    story.append(Spacer(1, 14))

    # 2. Barra Item Solicitado
    item_header_data = [
        [
            Paragraph(
                f"<font size='7' color='#64748b'><b>ITEM SOLICITADO</b></font><br/>"
                f"<font size='11.5' color='#1e293b'><b>{item_nome}</b></font>",
                normal_style
            ),
            Paragraph(
                f"<font size='9' color='#475569'>Quantidade solicitada: <b>{item_quantidade}</b></font>",
                style_table_cell_right
            ),
        ]
    ]
    tabela_item_header = Table(item_header_data, colWidths=[largura_util * 0.7, largura_util * 0.3])
    tabela_item_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(tabela_item_header)
    story.append(Spacer(1, 8))

    # 3. Tabela Comparativa de Cotações com Cálculo Seguro no Servidor
    cabecalho_cotacoes = [
        Paragraph("#", style_table_header),
        Paragraph("Preço Unit.", style_table_header),
        Paragraph("Qtde", style_table_header),
        Paragraph("Frete", style_table_header),
        Paragraph("Preço Total", style_table_header),
        Paragraph("Site / Fornecedor", style_table_header),
    ]
    linhas_tabela = [cabecalho_cotacoes]

    # Larguras das colunas somam exatamente largura_util (515 pt)
    col_widths = [24, 85, 38, 76, 92, 200]

    for idx, orc in enumerate(orcamentos, start=1):
        preco_unit = float(getattr(orc, "preco_unitario", 0.0) or 0.0)
        frete_val = float(getattr(orc, "frete", 0.0) or 0.0)
        # REGRA DE NEGÓCIO RECALCULADA NO SERVIDOR
        total_calculado = (preco_unit * item_quantidade) + frete_val

        frete_str = "Grátis" if frete_val == 0 else formatar_moeda_br(frete_val)
        fornecedor_str = getattr(orc, "fornecedor", "Não informado") or "Não informado"
        if getattr(orc, "selecionado", False):
            fornecedor_str = f"<b>{fornecedor_str}</b> <font color='#16a34a' size='7'>[ESCOLHIDO]</font>"

        link = getattr(orc, "link", None)
        if link:
            link_curto = link if len(link) <= 35 else f"{link[:32]}..."
            fornecedor_str += f"<br/><font color='#2563eb' size='6.5'>{link_curto}</font>"

        linhas_tabela.append([
            Paragraph(str(idx), style_table_cell),
            Paragraph(formatar_moeda_br(preco_unit), style_table_cell_right),
            Paragraph(str(item_quantidade), style_table_cell),
            Paragraph(frete_str, style_table_cell),
            Paragraph(f"<b>{formatar_moeda_br(total_calculado)}</b>", style_table_cell_right),
            Paragraph(fornecedor_str, style_table_cell_left),
        ])

    tabela_cotacoes = Table(linhas_tabela, colWidths=col_widths, repeatRows=1)
    tabela_cotacoes.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eefc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(tabela_cotacoes)
    story.append(Spacer(1, 16))

    # 4. Assinatura e Bloco de Aprovação (mantidos juntos para não quebrar de forma desorganizada)
    bloco_final = []
    bloco_final.append(Paragraph(
        f"<font size='8.5' color='#475569'>Atenciosamente,</font><br/>"
        f"<font size='9.5' color='#1e293b'><b>{assinatura.strip()}</b></font>",
        normal_style
    ))
    bloco_final.append(Spacer(1, 14))

    aprovacao_content = [
        [
            Paragraph("<font size='8' color='#14378c'><b>APROVAÇÃO DO RESPONSÁVEL</b></font>", normal_style),
        ],
        [
            Paragraph("<font size='7.5' color='#64748b'>Parecer / observações:</font><br/><br/>"
                      "__________________________________________________________________________________________", normal_style),
        ],
        [
            Paragraph(
                "<font size='7.5' color='#64748b'>Visto / assinatura: ___________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Data: ____/____/________</font>",
                normal_style
            ),
        ],
    ]
    tabela_aprovacao = Table(aprovacao_content, colWidths=[largura_util])
    tabela_aprovacao.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
    ]))
    bloco_final.append(tabela_aprovacao)

    story.append(KeepTogether(bloco_final))

    # Compilação do PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
