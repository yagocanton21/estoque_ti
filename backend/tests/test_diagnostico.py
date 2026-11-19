def test_ping_exige_autenticacao(unauthenticated_client):
    res = unauthenticated_client.get("/diagnostico/ping?ip=127.0.0.1")
    assert res.status_code == 401


def test_ping_rejeita_ip_invalido(client):
    res = client.get("/diagnostico/ping?ip=qualquer_coisa")
    assert res.status_code == 400
    assert "inválido" in res.json()["detail"].lower()

    # Tentativa de injeção de comando
    res_inj = client.get("/diagnostico/ping?ip=127.0.0.1;ls")
    assert res_inj.status_code == 400


def test_ping_rapido_rejeita_ip_invalido(client):
    res = client.get("/diagnostico/ping-rapido?ip=192.168.999.999")
    assert res.status_code == 400


def test_ping_sucesso_loopback(client):
    # Ping 1 pacote para 127.0.0.1
    res = client.get("/diagnostico/ping?ip=127.0.0.1&contagem=1")
    assert res.status_code == 200
    assert "text/event-stream" in res.headers.get("content-type", "")
    assert "127.0.0.1" in res.text


def test_ping_rapido_sucesso_loopback(client):
    res = client.get("/diagnostico/ping-rapido?ip=127.0.0.1")
    assert res.status_code == 200
    dados = res.json()
    assert dados["ip"] == "127.0.0.1"
    assert dados["online"] is True
