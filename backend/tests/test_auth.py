def test_login_sucesso(client):
    resposta = client.post(
        "/auth/login",
        json={"username": "admin_teste", "password": "senha_teste_123", "manter_conectado": False},
    )
    assert resposta.status_code == 200
    dados = resposta.json()
    assert "access_token" in dados
    assert dados["token_type"] == "bearer"
    assert dados["expires_in_days"] == 1
    assert dados["username"] == "admin_teste"


def test_login_manter_conectado(client):
    resposta = client.post(
        "/auth/login",
        json={"username": "admin_teste", "password": "senha_teste_123", "manter_conectado": True},
    )
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["expires_in_days"] == 30


def test_login_credenciais_invalidas(client):
    resposta = client.post(
        "/auth/login",
        json={"username": "admin_teste", "password": "senha_errada"},
    )
    assert resposta.status_code == 401
    assert "incorretos" in resposta.json()["detail"].lower()


def test_endpoint_me_com_e_sem_token(unauthenticated_client, client):
    # Sem token
    sem_token = unauthenticated_client.get("/auth/me")
    assert sem_token.status_code == 401

    # Com token
    login_resp = unauthenticated_client.post(
        "/auth/login",
        json={"username": "admin_teste", "password": "senha_teste_123"},
    )
    token = login_resp.json()["access_token"]

    com_token = unauthenticated_client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert com_token.status_code == 200
    assert com_token.json()["username"] == "admin_teste"
    assert com_token.json()["autenticado"] is True


def test_rotas_fechadas_para_usuarios_anonimos(unauthenticated_client):
    """
    Garante que nenhuma rota de negócio ou painel responda para usuários não autenticados.
    Todas devem retornar 401 Unauthorized.
    """
    rotas_protegidas_get = [
        "/itens/",
        "/movimentacoes/",
        "/lista-compras/",
        "/emprestimos/",
        "/relacao-ips/",
        "/equipamentos/tipos",
        "/backups/painel",
        "/backups/resumo",
        "/backups/historico",
    ]
    for rota in rotas_protegidas_get:
        r = unauthenticated_client.get(rota)
        assert r.status_code == 401, f"Rota {rota} deveria exigir autenticação (401), mas retornou {r.status_code}"

    # Testes de mutação anônima (POST/DELETE)
    assert unauthenticated_client.post("/itens/", json={"nome": "X", "quantidade": 1}).status_code == 401
    assert unauthenticated_client.post("/movimentacoes/", json={"item_id": 1, "tipo": "entrada", "quantidade": 1}).status_code == 401
    assert unauthenticated_client.delete("/itens/1").status_code == 401
    assert unauthenticated_client.post("/emprestimos/", json={"item_nome": "X", "pessoa": "Y", "quantidade": 1}).status_code == 401
    assert unauthenticated_client.post("/equipamentos/tipos", json={"nome": "X"}).status_code == 401


def test_persistencia_jwt_secret_key(tmp_path, monkeypatch):
    from services.auth import _obter_jwt_secret_key

    # Caso 1: JWT_SECRET_KEY explícita no ambiente tem prioridade máxima
    monkeypatch.setenv("JWT_SECRET_KEY", "chave_super_secreta_configurada_no_env_123")
    assert _obter_jwt_secret_key() == "chave_super_secreta_configurada_no_env_123"

    # Caso 2: Quando sem env, e apontando para arquivo persistido
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)

    secret_file = tmp_path / "jwt_test.key"
    monkeypatch.setenv("JWT_SECRET_FILE", str(secret_file))

    chave1 = _obter_jwt_secret_key()
    assert len(chave1) >= 32
    assert secret_file.exists()
    assert secret_file.read_text(encoding="utf-8").strip() == chave1

    # Segunda chamada deve reutilizar deterministicamente a mesma chave
    chave2 = _obter_jwt_secret_key()
    assert chave1 == chave2
