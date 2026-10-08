import io
import openpyxl


def test_crud_relacao_ips(client):
    # 1. Criação de máquina manual
    dados_maquina = {
        "usuario": "Carlos Alberto",
        "nome_maquina": "TI-DESK01",
        "usuario_ad": "carlos.alberto",
        "ip": "192.168.1.101",
        "sistema_operacional": "Windows 11 Pro",
        "office": "Office 2021",
        "setor": "Tecnologia",
        "antivirus": "Windows Defender",
        "observacoes": "Máquina do suporte TI",
    }
    resp = client.post("/relacao-ips/", json=dados_maquina)
    assert resp.status_code == 201
    criado = resp.json()
    assert criado["id"] is not None
    assert criado["nome_maquina"] == "TI-DESK01"
    assert criado["ip"] == "192.168.1.101"
    maquina_id = criado["id"]

    # 2. Listagem e Busca
    busca = client.get("/relacao-ips/?q=192.168.1.101")
    assert busca.status_code == 200
    assert busca.json()["total"] == 1
    assert busca.json()["items"][0]["nome_maquina"] == "TI-DESK01"

    busca_usuario = client.get("/relacao-ips/?q=Carlos")
    assert busca_usuario.status_code == 200
    assert busca_usuario.json()["total"] == 1

    # 3. Setores únicos
    setores = client.get("/relacao-ips/setores")
    assert setores.status_code == 200
    assert "Tecnologia" in setores.json()

    # 4. Estatísticas
    stats = client.get("/relacao-ips/estatisticas")
    assert stats.status_code == 200
    assert stats.json()["total_maquinas"] >= 1
    assert stats.json()["total_com_ip"] >= 1

    # 5. Atualização
    update_resp = client.put(
        f"/relacao-ips/{maquina_id}",
        json={**dados_maquina, "office": "Microsoft 365", "ip": "192.168.1.102"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["office"] == "Microsoft 365"
    assert update_resp.json()["ip"] == "192.168.1.102"

    # 6. Exclusão
    del_resp = client.delete(f"/relacao-ips/{maquina_id}")
    assert del_resp.status_code == 204
    assert client.get(f"/relacao-ips/{maquina_id}").status_code == 404


def test_importar_e_exportar_relacao_ips(client):
    # 1. Cria planilha Excel em memória
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Nome da Máquina", "IP", "Usuário", "Usuário AD", "Setor", "Sistema Operacional", "Office", "Antivírus"])
    ws.append(["FIN-NOTE01", "192.168.1.50", "Mariana Souza", "mariana.souza", "Financeiro", "Windows 11", "M365", "Kaspersky"])
    ws.append(["RH-DESK02", "192.168.1.51", "Roberto Silva", "roberto.silva", "RH", "Windows 10", "2019", "Defender"])

    excel_bytes = io.BytesIO()
    wb.save(excel_bytes)
    excel_bytes.seek(0)

    # 2. Envia importação
    files = {"file": ("planilha_teste.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    import_resp = client.post("/relacao-ips/importar", files=files)
    assert import_resp.status_code == 200
    assert import_resp.json()["criados"] == 2

    # 3. Exporta planilha
    export_resp = client.get("/relacao-ips/exportar")
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(export_resp.content) > 0


def test_limpeza_dominio_arthicom(client):
    # Teste via CRUD manual
    resp = client.post(
        "/relacao-ips/",
        json={
            "nome_maquina": "CQ-TESTE",
            "usuario": "Controle Qualidade",
            "usuario_ad": r"ARTHICOM\controle.qualidade4",
            "ip": "192.168.10.199",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["usuario_ad"] == "controle.qualidade4"

    # Teste via importação com coluna Usuario contendo ARTHICOM\
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Maquina", "Usuario", "IP_rede_interna_192.168.10", "Setor"])
    ws.append(["CQ-04", r"ARTHICOM\controle.qualidade4", "192.168.10.195", "Controle qualidade"])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    import_resp = client.post(
        "/relacao-ips/importar",
        files={"file": ("inventario.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert import_resp.status_code == 200

    busca = client.get("/relacao-ips/?q=CQ-04")
    assert busca.status_code == 200
    item = busca.json()["items"][0]
    assert item["usuario_ad"] == "controle.qualidade4"
    assert "ARTHICOM" not in (item["usuario_ad"] or "")

