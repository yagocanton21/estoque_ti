import pytest

def test_historico_orcamentos_com_e_sem_item_id(client):
    # 1. Cria um item de teste no estoque
    resp_item = client.post(
        "/itens/",
        json={
            "nome": "Bateria 9V Recarregável",
            "marca": "Elgin",
            "modelo": "9V 250mAh",
            "quantidade": 2,
            "quantidade_minima": 5,
        },
    )
    assert resp_item.status_code == 201
    item_estoque_id = resp_item.json()["id"]

    # 2. Cria item 1 na lista de compras vinculado ao item do estoque
    resp_compra1 = client.post(
        "/lista-compras/",
        json={
            "nome": "Bateria 9V Recarregável Elgin",
            "quantidade": 5,
            "item_id": item_estoque_id,
        },
    )
    assert resp_compra1.status_code == 201
    compra1_id = resp_compra1.json()["id"]

    # Adiciona 2 cotações para a compra 1
    resp_orc1 = client.post(
        f"/lista-compras/{compra1_id}/orcamentos",
        json={
            "fornecedor": "Mercado Livre",
            "preco_unitario": 25.00,
            "frete": 10.00,
            "link": "https://mercadolivre.com/bateria-elgin",
            "selecionado": True,
        },
    )
    assert resp_orc1.status_code == 201
    assert resp_orc1.json()["data_cotacao"] is not None

    resp_orc2 = client.post(
        f"/lista-compras/{compra1_id}/orcamentos",
        json={
            "fornecedor": "Kalunga",
            "preco_unitario": 32.50,
            "frete": 0.0,
            "link": "https://kalunga.com/bateria-elgin",
            "selecionado": False,
        },
    )
    assert resp_orc2.status_code == 201

    # 3. Cria item 2 na lista de compras AVULSO (sem cadastro no estoque)
    resp_compra2 = client.post(
        "/lista-compras/",
        json={
            "nome": "Bateria 9v Comum",
            "quantidade": 10,
            "item_id": None,
        },
    )
    assert resp_compra2.status_code == 201
    compra2_id = resp_compra2.json()["id"]

    # Adiciona cotação para o item avulso
    resp_orc3 = client.post(
        f"/lista-compras/{compra2_id}/orcamentos",
        json={
            "fornecedor": "Amazon",
            "preco_unitario": 18.90,
            "frete": 0.0,
            "link": "https://amazon.com.br/bateria-9v",
            "selecionado": True,
        },
    )
    assert resp_orc3.status_code == 201

    # 4. Testa busca de histórico por termo textual ("bateria 9v")
    resp_hist = client.get("/lista-compras/orcamentos/historico?termo=bateria%209v")
    assert resp_hist.status_code == 200
    dados = resp_hist.json()
    assert dados["estatisticas"]["total_cotacoes"] == 3
    assert dados["estatisticas"]["menor_preco_unitario"] == 18.90
    assert dados["estatisticas"]["fornecedor_menor_preco"] == "Amazon"
    # Último vencedor
    assert dados["estatisticas"]["ultimo_preco_pago"] in [18.90, 25.00]
    assert len(dados["cotacoes"]) == 3

    # 5. Testa busca de histórico por item_id
    resp_hist_id = client.get(f"/lista-compras/orcamentos/historico?item_id={item_estoque_id}")
    assert resp_hist_id.status_code == 200
    dados_id = resp_hist_id.json()
    assert dados_id["estatisticas"]["total_cotacoes"] == 2
    assert dados_id["estatisticas"]["menor_preco_unitario"] == 25.00
    assert dados_id["estatisticas"]["fornecedor_menor_preco"] == "Mercado Livre"

    # 6. Testa itens cotados frequentes
    resp_freq = client.get("/lista-compras/orcamentos/itens-cotados")
    assert resp_freq.status_code == 200
    itens_freq = resp_freq.json()
    nomes = [item["nome"] for item in itens_freq]
    assert "Bateria 9V Recarregável Elgin" in nomes
    assert "Bateria 9v Comum" in nomes

    # 7. Testa métricas da lista de compras
    resp_metricas = client.get("/lista-compras/metricas")
    assert resp_metricas.status_code == 200
    metricas = resp_metricas.json()
    assert metricas["total_pendentes"] >= 2
    assert metricas["valor_total_estimado"] > 0
