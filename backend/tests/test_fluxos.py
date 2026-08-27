def test_banco_de_teste_e_isolado(test_database_url):
    assert "test" in test_database_url.lower() or "/tmp/" in test_database_url.lower()
    assert "/data/estoque.db" not in test_database_url


def test_status_da_api(client):
    resposta = client.get("/")
    assert resposta.status_code == 200
    assert resposta.json() == {"mensagem": "API funcionando"}


def test_produto_movimentacao_e_lista_automatica(client):
    produto = client.post(
        "/itens/",
        json={
            "nome": "Produto do teste isolado",
            "marca": "Teste",
            "modelo": "T-001",
            "quantidade": 5,
            "quantidade_minima": 3,
        },
    )
    assert produto.status_code == 201
    produto_id = produto.json()["id"]

    saida = client.post(
        "/movimentacoes/",
        json={"item_id": produto_id, "tipo": "saida", "quantidade": 2},
    )
    assert saida.status_code == 201
    assert saida.json()["alerta"] is not None

    atualizado = client.get(f"/itens/{produto_id}")
    assert atualizado.json()["quantidade"] == 3

    compras = client.get("/lista-compras/")
    assert compras.status_code == 200
    assert len(compras.json()) == 1
    assert compras.json()[0]["item_id"] == produto_id


def test_emprestimo_aceita_equipamento_nao_cadastrado(client):
    resposta = client.post(
        "/emprestimos/",
        json={
            "item_nome": "Projetor trazido por fornecedor",
            "pessoa": "Sala de Treinamento",
            "quantidade": 1,
        },
    )
    assert resposta.status_code == 201
    assert resposta.json()["item_nome"] == "Projetor trazido por fornecedor"

    ativos = client.get("/emprestimos/ativos/paginado?skip=0&limit=5")
    assert ativos.status_code == 200
    assert ativos.json()["total"] == 1


def test_ajuste_exige_motivo_e_fica_no_historico(client):
    produto = client.post(
        "/itens/",
        json={
            "nome": "Teclado para conferência",
            "marca": "Teste",
            "modelo": "AJ-01",
            "quantidade": 10,
            "quantidade_minima": 4,
        },
    )
    produto_id = produto.json()["id"]

    motivo_invalido = client.post(
        "/movimentacoes/ajuste",
        json={"item_id": produto_id, "nova_quantidade": 7, "motivo": "  "},
    )
    assert motivo_invalido.status_code == 422

    ajuste = client.post(
        "/movimentacoes/ajuste",
        json={
            "item_id": produto_id,
            "nova_quantidade": 7,
            "motivo": "Contagem física encontrou três unidades a menos",
        },
    )
    assert ajuste.status_code == 201
    assert ajuste.json()["quantidade_anterior"] == 10
    assert ajuste.json()["quantidade_resultante"] == 7
    assert ajuste.json()["motivo"].startswith("Contagem física")

    atualizado = client.get(f"/itens/{produto_id}")
    assert atualizado.json()["quantidade"] == 7

    historico = client.get(
        "/movimentacoes/historico/paginado?skip=0&limit=5&tipo=ajuste"
    )
    assert historico.status_code == 200
    assert historico.json()["total"] == 1
    assert historico.json()["items"][0]["item_nome"] == "Teclado para conferência"


def test_edicao_de_produto_nao_permite_burlar_ajuste(client):
    produto = client.post(
        "/itens/",
        json={
            "nome": "Mouse auditado",
            "quantidade": 5,
            "quantidade_minima": 1,
        },
    )
    produto_id = produto.json()["id"]

    resposta = client.put(
        f"/itens/{produto_id}",
        json={
            "nome": "Mouse auditado",
            "quantidade": 4,
            "quantidade_minima": 1,
        },
    )
    assert resposta.status_code == 400
    assert "Ajuste de estoque" in resposta.json()["detail"]


def test_historico_de_ajustes_limita_cinco_por_pagina(client):
    produto = client.post(
        "/itens/",
        json={
            "nome": "Produto com inventários",
            "quantidade": 10,
            "quantidade_minima": 0,
        },
    )
    produto_id = produto.json()["id"]

    for nova_quantidade in [9, 8, 7, 6, 5, 4]:
        resposta = client.post(
            "/movimentacoes/ajuste",
            json={
                "item_id": produto_id,
                "nova_quantidade": nova_quantidade,
                "motivo": f"Conferência de saldo {nova_quantidade}",
            },
        )
        assert resposta.status_code == 201

    historico = client.get(
        "/movimentacoes/historico/paginado?skip=0&limit=5&tipo=ajuste"
    )
    assert historico.status_code == 200
    assert historico.json()["total"] == 6
    assert len(historico.json()["items"]) == 5
