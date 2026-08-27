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


def test_fluxo_completo_de_orcamentos_e_selecao_unica(client):
    item_lista = client.post(
        "/lista-compras/",
        json={
            "nome": "Fonte 350W",
            "quantidade": 3,
            "item_id": None,
            "link": None,
        },
    )
    assert item_lista.status_code == 201
    item_lista_id = item_lista.json()["id"]

    fornecedor_invalido = client.post(
        f"/lista-compras/{item_lista_id}/orcamentos",
        json={"fornecedor": "   ", "preco_unitario": 100, "frete": 0},
    )
    assert fornecedor_invalido.status_code == 422

    primeiro = client.post(
        f"/lista-compras/{item_lista_id}/orcamentos",
        json={
            "fornecedor": "Loja A",
            "preco_unitario": 100.10,
            "frete": 12.30,
            "link": "https://loja-a.example/produto",
        },
    )
    segundo = client.post(
        f"/lista-compras/{item_lista_id}/orcamentos",
        json={
            "fornecedor": "Loja B",
            "preco_unitario": 98.75,
            "frete": 15,
            "link": None,
        },
    )
    assert primeiro.status_code == 201
    assert segundo.status_code == 201
    primeiro_id = primeiro.json()["id"]
    segundo_id = segundo.json()["id"]

    assert client.put(
        f"/lista-compras/orcamentos/{primeiro_id}",
        json={"selecionado": True},
    ).status_code == 200
    assert client.put(
        f"/lista-compras/orcamentos/{segundo_id}",
        json={"selecionado": True},
    ).status_code == 200

    detalhe = client.get(f"/lista-compras/{item_lista_id}")
    assert detalhe.status_code == 200
    selecionados = [
        orcamento
        for orcamento in detalhe.json()["orcamentos"]
        if orcamento["selecionado"]
    ]
    assert [orcamento["id"] for orcamento in selecionados] == [segundo_id]

    atualizado = client.put(
        f"/lista-compras/orcamentos/{segundo_id}",
        json={"preco_unitario": 97.55, "frete": 10.25},
    )
    assert atualizado.status_code == 200
    assert atualizado.json()["preco_unitario"] == 97.55
    assert atualizado.json()["frete"] == 10.25

    assert client.delete(
        f"/lista-compras/orcamentos/{primeiro_id}"
    ).status_code == 204

    assert client.delete(f"/lista-compras/{item_lista_id}").status_code == 204
    orcamento_removido_em_cascata = client.delete(
        f"/lista-compras/orcamentos/{segundo_id}"
    )
    assert orcamento_removido_em_cascata.status_code == 404


def test_pdf_do_orcamento_fica_disponivel_no_historico(client):
    item_lista = client.post(
        "/lista-compras/",
        json={"nome": "Monitor 24", "quantidade": 2},
    )
    item_lista_id = item_lista.json()["id"]
    pdf = b"%PDF-1.4\n% PDF de teste\n%%EOF"

    envio_invalido = client.put(
        f"/lista-compras/{item_lista_id}/pdf",
        content=b"nao e pdf",
        headers={"Content-Type": "text/plain"},
    )
    assert envio_invalido.status_code == 415

    envio = client.put(
        f"/lista-compras/{item_lista_id}/pdf",
        content=pdf,
        headers={
            "Content-Type": "application/pdf",
            "X-PDF-Filename": "Orcamento_Monitor_24.pdf",
        },
    )
    assert envio.status_code == 200
    assert envio.json()["tem_pdf"] is True

    client.put(f"/lista-compras/{item_lista_id}", json={"comprado": True})
    historico = client.get("/lista-compras/")
    registro = historico.json()[0]
    assert registro["tem_pdf"] is True
    assert registro["pdf_nome"] == "Orcamento_Monitor_24.pdf"
    assert "orcamento_pdf" not in registro

    visualizacao = client.get(f"/lista-compras/{item_lista_id}/pdf")
    assert visualizacao.status_code == 200
    assert visualizacao.headers["content-type"] == "application/pdf"
    assert visualizacao.content == pdf
