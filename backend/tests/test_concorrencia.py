import concurrent.futures
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from services import backups
from services.auth import criar_token_acesso


def _auth_headers():
    token, _ = criar_token_acesso("admin_teste")
    return {"Authorization": f"Bearer {token}"}


def test_concorrencia_saida_estoque_impede_saldo_negativo(client):
    """
    Testa saídas simultâneas concorrentes.
    Item com 10 unidades. 10 threads tentam retirar 2 unidades cada (total 20).
    Apenas 5 devem conseguir e 5 devem falhar com 400.
    O saldo final deve ser exatamente 0 e nunca negativo.
    """
    resp = client.post(
        "/itens/",
        json={"nome": "SSD 1TB Concorrencia", "marca": "Kingston", "quantidade": 10, "quantidade_minima": 2},
    )
    assert resp.status_code == 201
    item_id = resp.json()["id"]

    sucessos = 0
    falhas_estoque = 0

    def tentar_saida():
        # Cada thread cria seu próprio TestClient para simular conexões HTTP paralelas
        with TestClient(app, headers=_auth_headers()) as local_client:
            return local_client.post(
                "/movimentacoes/",
                json={"item_id": item_id, "tipo": "saida", "quantidade": 2},
            )

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(tentar_saida) for _ in range(10)]
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            if r.status_code == 201:
                sucessos += 1
            elif r.status_code == 400 and "Estoque insuficiente" in r.json().get("detail", ""):
                falhas_estoque += 1

    assert sucessos == 5, f"Esperado 5 sucessos, obteve {sucessos}"
    assert falhas_estoque == 5, f"Esperado 5 falhas por estoque insuficiente, obteve {falhas_estoque}"

    resp_final = client.get(f"/itens/{item_id}")
    assert resp_final.json()["quantidade"] == 0


def test_concorrencia_devolver_emprestimo_idempotente(client):
    """
    Testa devolução simultânea do mesmo empréstimo (duplo clique ou requests paralelas).
    Apenas 1 deve obter sucesso; as outras devem receber 400 ('Este item já foi devolvido').
    """
    resp_emp = client.post(
        "/emprestimos/",
        json={"item_nome": "Notebook Dell Concorrencia", "pessoa": "Mariana TI", "quantidade": 1},
    )
    assert resp_emp.status_code == 201
    emp_id = resp_emp.json()["id"]

    sucessos = 0
    ja_devolvidos = 0

    def tentar_devolucao():
        with TestClient(app, headers=_auth_headers()) as local_client:
            return local_client.put(f"/emprestimos/{emp_id}/devolver")

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(tentar_devolucao) for _ in range(5)]
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            if r.status_code == 200:
                sucessos += 1
            elif r.status_code == 400 and "já foi devolvido" in r.json().get("detail", ""):
                ja_devolvidos += 1

    assert sucessos == 1, f"Esperado 1 sucesso, obteve {sucessos}"
    assert ja_devolvidos == 4, f"Esperado 4 rejeições, obteve {ja_devolvidos}"


def test_concorrencia_estoque_minimo_nao_duplica_lista_compras(client):
    """
    Testa duas saídas paralelas que levam o estoque abaixo do mínimo.
    O item deve ser adicionado à lista de compras apenas 1 vez (sem duplicatas).
    """
    resp = client.post(
        "/itens/",
        json={"nome": "Cabo HDMI Concorrente", "marca": "Genérico", "quantidade": 4, "quantidade_minima": 3},
    )
    item_id = resp.json()["id"]

    def tentar_saida():
        with TestClient(app, headers=_auth_headers()) as local_client:
            return local_client.post(
                "/movimentacoes/",
                json={"item_id": item_id, "tipo": "saida", "quantidade": 1},
            )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(tentar_saida) for _ in range(2)]
        for f in concurrent.futures.as_completed(futures):
            assert f.result().status_code == 201

    resp_compras = client.get("/lista-compras/")
    assert resp_compras.status_code == 200
    itens_vinculados = [c for c in resp_compras.json() if c.get("item_id") == item_id]
    assert len(itens_vinculados) == 1, f"Item duplicado na lista de compras! Quantidade: {len(itens_vinculados)}"


def test_concorrencia_criar_tipo_equipamento_sem_erro_500(client):
    """
    Testa criação concorrente do mesmo TipoEquipamento.
    Apenas 1 deve ser criado (201) e os outros devem receber 400 tratado (sem erro 500).
    """
    sucessos = 0
    duplicados = 0

    def criar_tipo():
        with TestClient(app, headers=_auth_headers()) as local_client:
            return local_client.post(
                "/equipamentos/tipos",
                json={"nome": "Access Point Concorrente"},
            )

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(criar_tipo) for _ in range(4)]
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            if r.status_code == 201:
                sucessos += 1
            elif r.status_code == 400:
                duplicados += 1

    assert sucessos == 1
    assert duplicados == 3


def test_concorrencia_salvar_apelido_backup_upsert():
    """
    Testa chamadas concorrentes para salvar apelido de backup da mesma máquina.
    Todas devem executar com sucesso (upsert atômico sem colisão de chave primária).
    """
    def salvar(i):
        with SessionLocal() as db:
            backups.salvar_apelido(db, "SRV-TESTE-CONCORRENCIA", f"Servidor Principal {i}")

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(salvar, i) for i in range(4)]
        for f in concurrent.futures.as_completed(futures):
            f.result()  # Não deve levantar exceção

    with SessionLocal() as db:
        apelidos = backups.apelidos_maquina(db)
        assert "SRV-TESTE-CONCORRENCIA" in apelidos
        assert apelidos["SRV-TESTE-CONCORRENCIA"].startswith("Servidor Principal")


def test_chave_idempotencia_impede_dupla_movimentacao(client):
    """
    Testa que reenvios com a mesma Idempotency-Key retornam o mesmo resultado
    e não deduzem estoque duas vezes.
    """
    resp = client.post(
        "/itens/",
        json={"nome": "Mouse Sem Fio Idempotente", "quantidade": 5, "quantidade_minima": 1},
    )
    item_id = resp.json()["id"]

    chave_unica = "req_mouse_teste_12345"

    # Primeira requisição: realiza saída de 2 unidades
    r1 = client.post(
        "/movimentacoes/",
        json={"item_id": item_id, "tipo": "saida", "quantidade": 2},
        headers={"Idempotency-Key": chave_unica},
    )
    assert r1.status_code == 201
    dados1 = r1.json()
    assert dados1["quantidade_anterior"] == 5
    assert dados1["quantidade_resultante"] == 3
    mov_id = dados1["id"]

    # Segunda requisição com a MESMA chave (ex: retry de rede ou duplo clique)
    r2 = client.post(
        "/movimentacoes/",
        json={"item_id": item_id, "tipo": "saida", "quantidade": 2},
        headers={"Idempotency-Key": chave_unica},
    )
    assert r2.status_code == 201
    dados2 = r2.json()
    assert dados2["id"] == mov_id  # Mesma movimentação retornada
    assert dados2["quantidade_resultante"] == 3

    # Saldo final no estoque continua 3, NÃO virou 1!
    resp_item = client.get(f"/itens/{item_id}")
    assert resp_item.json()["quantidade"] == 3


def test_chave_idempotencia_concorrente_mesma_chave(client):
    """
    Testa múltiplas threads disparando requisições com a exata MESMA chave de idempotência.
    Apenas 1 movimentação real deve ser criada e todas as threads recebem sucesso com o mesmo ID.
    """
    resp = client.post(
        "/itens/",
        json={"nome": "Teclado Idempotente Paralelo", "quantidade": 10},
    )
    item_id = resp.json()["id"]
    chave_compartilhada = "req_paralela_idemp_999"

    def enviar():
        with TestClient(app, headers=_auth_headers()) as local_client:
            return local_client.post(
                "/movimentacoes/",
                json={"item_id": item_id, "tipo": "saida", "quantidade": 3},
                headers={"Idempotency-Key": chave_compartilhada},
            )

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(enviar) for _ in range(5)]
        respostas = [f.result() for f in concurrent.futures.as_completed(futures)]

    # Todas as 5 respostas devem ser 201
    for r in respostas:
        assert r.status_code == 201

    ids = {r.json()["id"] for r in respostas}
    assert len(ids) == 1, f"Deveria existir apenas 1 movimentação criada, mas gerou IDs: {ids}"

    # Saldo deve ter diminuído apenas 3 (10 - 3 = 7), não 15!
    resp_item = client.get(f"/itens/{item_id}")
    assert resp_item.json()["quantidade"] == 7
