import os
import sqlite3

def popular_banco(caminho):
    print(f"Populando banco em: {caminho}")
    conn = sqlite3.connect(caminho)
    c = conn.cursor()
    
    # 0. Cria itens no estoque caso não existam
    c.execute("SELECT id FROM itens WHERE nome LIKE '%SSD%'")
    row = c.fetchone()
    if not row:
        c.execute("""
            INSERT INTO itens (nome, marca, modelo, quantidade, quantidade_minima)
            VALUES ('SSD 480GB SATA', 'Kingston', 'A400', 3, 5)
        """)
        ssd_id = c.lastrowid
    else:
        ssd_id = row[0]

    c.execute("SELECT id FROM itens WHERE nome LIKE '%Teclado%'")
    row_tec = c.fetchone()
    if not row_tec:
        c.execute("""
            INSERT INTO itens (nome, marca, modelo, quantidade, quantidade_minima)
            VALUES ('Teclado USB Dell KB216', 'Dell', 'KB216', 2, 6)
        """)
        teclado_id = c.lastrowid
    else:
        teclado_id = row_tec[0]

    # --- 1. Histórico Concluído: Bateria 9V Alcalina (Setembro) ---
    c.execute("""
        INSERT INTO lista_compras (nome, quantidade, status, link, data_compra, item_id)
        VALUES ('Bateria 9V Alcalina Elgin', 10, 'entregue', 'https://mercadolivre.com.br/bateria-9v-elgin', '2026-09-15 14:00:00', NULL)
    """)
    compra_bat_antiga_id = c.lastrowid
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Mercado Livre', 16.90, 0.0, 'https://mercadolivre.com.br/bateria-9v-elgin', 1, '2026-09-12 09:30:00')
    """, (compra_bat_antiga_id,))
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Kalunga', 22.50, 15.0, 'https://kalunga.com.br/bateria-9v', 0, '2026-09-12 10:15:00')
    """, (compra_bat_antiga_id,))
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Amazon', 18.00, 0.0, 'https://amazon.com.br/bateria-9v-elgin', 0, '2026-09-12 11:00:00')
    """, (compra_bat_antiga_id,))

    # --- 1B. Compra Ativa Atual: Bateria 9V Alcalina (Pendente) ---
    c.execute("""
        INSERT INTO lista_compras (nome, quantidade, status, link, item_id)
        VALUES ('Bateria 9V Alcalina', 5, 'pendente', 'https://mercadolivre.com.br/bateria-9v', NULL)
    """)
    compra_bat_atual_id = c.lastrowid
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Mercado Livre', 17.50, 0.0, 'https://mercadolivre.com.br/bateria-9v', 1, '2026-11-17 14:10:00')
    """, (compra_bat_atual_id,))
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Shopee', 15.90, 8.0, 'https://shopee.com.br/bateria-9v', 0, '2026-11-17 14:20:00')
    """, (compra_bat_atual_id,))

    # --- 2. Histórico Concluído: SSD Kingston (Agosto e Outubro) ---
    c.execute("""
        INSERT INTO lista_compras (nome, quantidade, status, link, data_compra, item_id)
        VALUES ('SSD Kingston 480GB A400', 5, 'entregue', 'https://kabum.com.br/ssd-kingston-480gb', '2026-08-15 16:00:00', NULL)
    """)
    compra_ssd_ago_id = c.lastrowid
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'KaBuM!', 199.90, 19.90, 'https://kabum.com.br/ssd-kingston-480gb', 1, '2026-08-10 11:00:00')
    """, (compra_ssd_ago_id,))
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Terabyte', 215.00, 14.90, 'https://terabyteshop.com.br/ssd-480gb', 0, '2026-08-10 11:30:00')
    """, (compra_ssd_ago_id,))

    c.execute("""
        INSERT INTO lista_compras (nome, quantidade, status, link, data_compra, item_id)
        VALUES ('SSD Kingston 480GB A400 SATA', 5, 'entregue', 'https://pichau.com.br/ssd-kingston-480gb', '2026-10-10 17:00:00', NULL)
    """)
    compra_ssd_out_id = c.lastrowid
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Pichau', 189.90, 15.0, 'https://pichau.com.br/ssd-kingston-480gb', 1, '2026-10-05 14:00:00')
    """, (compra_ssd_out_id,))
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'KaBuM!', 205.00, 22.0, 'https://kabum.com.br/ssd-kingston-480gb', 0, '2026-10-05 14:20:00')
    """, (compra_ssd_out_id,))

    # --- 2B. Compra Ativa Atual: SSD Kingston (A caminho / Comprado) ---
    c.execute("""
        INSERT INTO lista_compras (nome, quantidade, status, link, data_compra, item_id)
        VALUES ('SSD Kingston 480GB A400 SATA', 4, 'comprado', 'https://pichau.com.br/ssd-kingston-480gb', '2026-11-15 15:30:00', ?)
    """, (ssd_id,))
    compra_ssd_atual_id = c.lastrowid
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Pichau', 185.00, 12.0, 'https://pichau.com.br/ssd-kingston-480gb', 1, '2026-11-14 10:00:00')
    """, (compra_ssd_atual_id,))
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Mercado Livre', 195.00, 0.0, 'https://mercadolivre.com.br/ssd-kingston-480gb', 0, '2026-11-14 10:15:00')
    """, (compra_ssd_atual_id,))

    # --- 3. Histórico Concluído: Teclado USB Dell KB216 (Julho) ---
    c.execute("""
        INSERT INTO lista_compras (nome, quantidade, status, link, data_compra, item_id)
        VALUES ('Teclado USB Dell KB216 Preto', 8, 'entregue', 'https://dell.com.br/teclado-kb216', '2026-07-25 11:00:00', NULL)
    """)
    compra_tec_jul_id = c.lastrowid
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Dell Direto', 79.00, 0.0, 'https://dell.com.br/teclado-kb216', 1, '2026-07-20 15:00:00')
    """, (compra_tec_jul_id,))
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Mercado Livre', 85.00, 10.0, 'https://mercadolivre.com.br/teclado-dell-kb216', 0, '2026-07-20 15:30:00')
    """, (compra_tec_jul_id,))

    # --- 3B. Compra Ativa Atual: Teclado USB Dell KB216 (Pendente - sem cotação ainda!) ---
    c.execute("""
        INSERT INTO lista_compras (nome, quantidade, status, link, item_id)
        VALUES ('Teclado USB Dell KB216', 6, 'pendente', NULL, ?)
    """, (teclado_id,))

    # --- 4. Compra Ativa Atual: Bobina Cabo de Rede Cat6 Furukawa 305m (Pendente) ---
    c.execute("""
        INSERT INTO lista_compras (nome, quantidade, status, link, item_id)
        VALUES ('Cabo de Rede Cat6 Furukawa 305m Azul', 1, 'pendente', 'https://mercadolivre.com.br/cabo-cat6-furukawa', NULL)
    """)
    compra_cabo_id = c.lastrowid
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Loja do CFTV', 780.00, 0.0, 'https://lojadocftv.com.br/cabo-cat6-furukawa', 1, '2026-11-16 09:00:00')
    """, (compra_cabo_id,))
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Mercado Livre', 820.00, 0.0, 'https://mercadolivre.com.br/cabo-cat6-furukawa', 0, '2026-11-16 09:30:00')
    """, (compra_cabo_id,))
    c.execute("""
        INSERT INTO orcamentos (lista_compras_id, fornecedor, preco_unitario, frete, link, selecionado, data_cotacao)
        VALUES (?, 'Kalunga', 890.00, 35.0, 'https://kalunga.com.br/cabo-cat6-furukawa', 0, '2026-11-16 10:00:00')
    """, (compra_cabo_id,))

    conn.commit()
    conn.close()
    print("Sucesso!")

if __name__ == "__main__":
    db_path = "/data/estoque.db" if os.path.exists("/data/estoque.db") else "data/estoque.db"
    popular_banco(db_path)
