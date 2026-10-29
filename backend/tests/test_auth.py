def test_login_sucesso(client):
    resposta = client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin123", "manter_conectado": False},
    )
    assert resposta.status_code == 200
    dados = resposta.json()
    assert "access_token" in dados
    assert dados["token_type"] == "bearer"
    assert dados["expires_in_days"] == 1
    assert dados["username"] == "admin"


def test_login_manter_conectado(client):
    resposta = client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin123", "manter_conectado": True},
    )
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["expires_in_days"] == 30


def test_login_credenciais_invalidas(client):
    resposta = client.post(
        "/auth/login",
        json={"username": "admin", "password": "senha_errada"},
    )
    assert resposta.status_code == 401
    assert "incorretos" in resposta.json()["detail"].lower()


def test_endpoint_me_com_e_sem_token(client):
    # Sem token
    sem_token = client.get("/auth/me")
    assert sem_token.status_code == 401

    # Com token
    login_resp = client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login_resp.json()["access_token"]

    com_token = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert com_token.status_code == 200
    assert com_token.json()["username"] == "admin"
    assert com_token.json()["autenticado"] is True

