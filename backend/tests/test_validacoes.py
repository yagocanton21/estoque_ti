import pytest
from sqlalchemy.exc import IntegrityError
from models.lista_compras import ListaCompras


def test_item_nome_invalido_rejeitado(client):
    # 1. Nome vazio ou só espaços
    resp1 = client.post(
        "/itens/",
        json={"nome": "   ", "quantidade": 5, "quantidade_minima": 1},
    )
    assert resp1.status_code == 422

    # 2. Nome muito curto (< 2 caracteres)
    resp2 = client.post(
        "/itens/",
        json={"nome": "A", "quantidade": 5, "quantidade_minima": 1},
    )
    assert resp2.status_code == 422

    # 3. Nome válido com espaços extras nas pontas é sanitizado
    resp3 = client.post(
        "/itens/",
        json={"nome": "  Mouse Óptico USB  ", "marca": "  Dell  ", "quantidade": 5, "quantidade_minima": 1},
    )
    assert resp3.status_code == 201
    assert resp3.json()["nome"] == "Mouse Óptico USB"
    assert resp3.json()["marca"] == "Dell"


def test_lista_compras_status_invalido_rejeitado(client):
    # 1. Criação com status inválido deve ser rejeitada com 422
    resp1 = client.post(
        "/lista-compras/",
        json={"nome": "Switch 24p", "quantidade": 1, "status": "hackeado"},
    )
    assert resp1.status_code == 422

    # 2. Criação com status válido
    resp2 = client.post(
        "/lista-compras/",
        json={"nome": "Switch 24p", "quantidade": 1, "status": "pendente"},
    )
    assert resp2.status_code == 201
    item_id = resp2.json()["id"]

    # 3. Atualização para status inválido deve ser rejeitada com 422
    resp3 = client.put(
        f"/lista-compras/{item_id}",
        json={"status": "status_inexistente"},
    )
    assert resp3.status_code == 422

    # 4. Atualização para status permitido
    resp4 = client.put(
        f"/lista-compras/{item_id}",
        json={"status": "comprado"},
    )
    assert resp4.status_code == 200
    assert resp4.json()["status"] == "comprado"


def test_equipamento_e_tipo_nome_invalido(client):
    # Tipo com nome em branco
    resp1 = client.post("/equipamentos/tipos", json={"nome": "   "})
    assert resp1.status_code == 422

    # Tipo válido
    resp_tipo = client.post("/equipamentos/tipos", json={"nome": "Roteadores"})
    assert resp_tipo.status_code == 201
    tipo_id = resp_tipo.json()["id"]

    # Equipamento com nome em branco
    resp2 = client.post(
        "/equipamentos/",
        json={"tipo_id": tipo_id, "nome": "  "},
    )
    assert resp2.status_code == 422


def test_emprestimo_campos_em_branco_rejeitados(client):
    # item_nome em branco
    resp1 = client.post(
        "/emprestimos/",
        json={"item_nome": "   ", "pessoa": "Lucas", "quantidade": 1},
    )
    assert resp1.status_code == 422

    # pessoa em branco
    resp2 = client.post(
        "/emprestimos/",
        json={"item_nome": "Notebook", "pessoa": "   ", "quantidade": 1},
    )
    assert resp2.status_code == 422


def test_maquina_nome_em_branco_rejeitado(client):
    resp = client.post(
        "/relacao-ips/",
        json={"nome_maquina": "   ", "ip": "192.168.1.200"},
    )
    assert resp.status_code == 422


def test_db_check_constraint_status_lista_compras():
    from database import SessionLocal
    db = SessionLocal()
    try:
        item_invalido = ListaCompras(
            nome="Item Hack",
            quantidade=1,
            status="valor_burlado",
        )
        db.add(item_invalido)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
    finally:
        db.close()


def test_gerar_pdf_orcamento_no_servidor_sucesso_e_regras(client):
    # 1. Cria item na lista de compras
    item_resp = client.post(
        "/lista-compras/",
        json={"nome": "Switch Gerenciável 24P", "quantidade": 2},
    )
    assert item_resp.status_code == 201
    item_id = item_resp.json()["id"]

    # 2. Tentar gerar PDF sem orçamentos cadastrados -> 400
    sem_orcamento = client.post(
        f"/lista-compras/{item_id}/gerar-pdf",
        json={
            "cidade": "Atibaia",
            "solicitante": "Carlos TI",
            "destinatario": "Diretoria",
            "assinatura": "Carlos TI Responsável",
        },
    )
    assert sem_orcamento.status_code == 400
    assert "ao menos um orçamento" in sem_orcamento.json()["detail"]

    # 3. Adiciona cotações oficiais
    client.post(
        f"/lista-compras/{item_id}/orcamentos",
        json={
            "fornecedor": "Kabum",
            "preco_unitario": 800.0,
            "frete": 30.0,
            "link": "https://kabum.example/switch",
            "selecionado": False,
        },
    )
    client.post(
        f"/lista-compras/{item_id}/orcamentos",
        json={
            "fornecedor": "Mercado Livre",
            "preco_unitario": 750.0,
            "frete": 0.0,
            "link": "https://ml.example/switch",
            "selecionado": True,
        },
    )

    # 4. Envio com campo em branco no form de documento -> 422
    invalido_resp = client.post(
        f"/lista-compras/{item_id}/gerar-pdf",
        json={
            "cidade": "   ",
            "solicitante": "Carlos TI",
            "destinatario": "Diretoria",
            "assinatura": "Carlos TI Responsável",
        },
    )
    assert invalido_resp.status_code == 422

    # 5. Geração oficial com sucesso pelo servidor
    pdf_resp = client.post(
        f"/lista-compras/{item_id}/gerar-pdf",
        json={
            "cidade": "Bom Jesus dos Perdões",
            "solicitante": "Carlos TI",
            "destinatario": "Julia / Katia",
            "assinatura": "Carlos TI Responsável",
        },
    )
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content.startswith(b"%PDF-")
    assert len(pdf_resp.content) > 1000

    # 6. Verifica que o item no banco agora tem o PDF registrado
    item_consultado = client.get(f"/lista-compras/{item_id}")
    assert item_consultado.status_code == 200
    assert item_consultado.json()["tem_pdf"] is True
    assert item_consultado.json()["pdf_nome"].endswith(".pdf")

    # 7. Verifica que o PDF pode ser baixado/visualizado via GET /pdf
    download_resp = client.get(f"/lista-compras/{item_id}/pdf")
    assert download_resp.status_code == 200
    assert download_resp.headers["content-type"] == "application/pdf"
    assert download_resp.content == pdf_resp.content

