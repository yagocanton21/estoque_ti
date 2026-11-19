import requests

API_URL = "http://localhost:8000"

def popular_via_api():
    # 1. Login
    r = requests.post(f"{API_URL}/auth/login", json={"username": "admin", "password": "8xpdhpckkg"})
    if r.status_code != 200:
        print("Erro no login:", r.text)
        return
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login realizado com sucesso!")

    # 2. Cria itens no estoque
    r_item1 = requests.post(
        f"{API_URL}/itens/",
        headers=headers,
        json={"nome": "SSD Kingston 480GB SATA", "marca": "Kingston", "modelo": "A400", "quantidade": 3, "quantidade_minima": 5},
    )
    ssd_id = r_item1.json().get("id") if r_item1.status_code == 201 else None

    r_item2 = requests.post(
        f"{API_URL}/itens/",
        headers=headers,
        json={"nome": "Teclado USB Dell KB216", "marca": "Dell", "modelo": "KB216", "quantidade": 2, "quantidade_minima": 6},
    )
    teclado_id = r_item2.json().get("id") if r_item2.status_code == 201 else None

    # 3. Item Histórico Concluído: Bateria 9V Alcalina Elgin (Entregue)
    r_bat_antiga = requests.post(
        f"{API_URL}/lista-compras/",
        headers=headers,
        json={"nome": "Bateria 9V Alcalina Elgin", "quantidade": 10, "item_id": None, "link": "https://mercadolivre.com.br/bateria-9v-elgin"},
    )
    if r_bat_antiga.status_code == 201:
        bat_antiga_id = r_bat_antiga.json()["id"]
        # orcamentos
        requests.post(f"{API_URL}/lista-compras/{bat_antiga_id}/orcamentos", headers=headers, json={"fornecedor": "Mercado Livre", "preco_unitario": 16.90, "frete": 0.0, "link": "https://mercadolivre.com.br/bateria-9v-elgin", "selecionado": True})
        requests.post(f"{API_URL}/lista-compras/{bat_antiga_id}/orcamentos", headers=headers, json={"fornecedor": "Kalunga", "preco_unitario": 22.50, "frete": 15.0, "link": "https://kalunga.com.br/bateria-9v", "selecionado": False})
        requests.post(f"{API_URL}/lista-compras/{bat_antiga_id}/orcamentos", headers=headers, json={"fornecedor": "Amazon", "preco_unitario": 18.00, "frete": 0.0, "link": "https://amazon.com.br/bateria-9v-elgin", "selecionado": False})
        # marca como entregue
        requests.put(f"{API_URL}/lista-compras/{bat_antiga_id}", headers=headers, json={"status": "entregue"})

    # 4. Item Ativo Pendente: Bateria 9V Alcalina
    r_bat_nova = requests.post(
        f"{API_URL}/lista-compras/",
        headers=headers,
        json={"nome": "Bateria 9V Alcalina", "quantidade": 5, "item_id": None, "link": "https://mercadolivre.com.br/bateria-9v"},
    )
    if r_bat_nova.status_code == 201:
        bat_nova_id = r_bat_nova.json()["id"]
        requests.post(f"{API_URL}/lista-compras/{bat_nova_id}/orcamentos", headers=headers, json={"fornecedor": "Mercado Livre", "preco_unitario": 17.50, "frete": 0.0, "link": "https://mercadolivre.com.br/bateria-9v", "selecionado": True})
        requests.post(f"{API_URL}/lista-compras/{bat_nova_id}/orcamentos", headers=headers, json={"fornecedor": "Shopee", "preco_unitario": 15.90, "frete": 8.0, "link": "https://shopee.com.br/bateria-9v", "selecionado": False})

    # 5. Item Histórico Concluído: SSD Kingston 480GB A400 (Entregue)
    r_ssd_antigo = requests.post(
        f"{API_URL}/lista-compras/",
        headers=headers,
        json={"nome": "SSD Kingston 480GB A400", "quantidade": 5, "item_id": None, "link": "https://kabum.com.br/ssd-kingston-480gb"},
    )
    if r_ssd_antigo.status_code == 201:
        ssd_antigo_id = r_ssd_antigo.json()["id"]
        requests.post(f"{API_URL}/lista-compras/{ssd_antigo_id}/orcamentos", headers=headers, json={"fornecedor": "KaBuM!", "preco_unitario": 199.90, "frete": 19.90, "link": "https://kabum.com.br/ssd-kingston-480gb", "selecionado": True})
        requests.post(f"{API_URL}/lista-compras/{ssd_antigo_id}/orcamentos", headers=headers, json={"fornecedor": "Terabyte", "preco_unitario": 215.00, "frete": 14.90, "link": "https://terabyteshop.com.br/ssd-480gb", "selecionado": False})
        requests.put(f"{API_URL}/lista-compras/{ssd_antigo_id}", headers=headers, json={"status": "entregue"})

    # 6. Item Ativo: SSD Kingston 480GB A400 SATA (Comprado - A caminho)
    r_ssd_atual = requests.post(
        f"{API_URL}/lista-compras/",
        headers=headers,
        json={"nome": "SSD Kingston 480GB A400 SATA", "quantidade": 4, "item_id": ssd_id, "link": "https://pichau.com.br/ssd-kingston-480gb"},
    )
    if r_ssd_atual.status_code == 201:
        ssd_atual_id = r_ssd_atual.json()["id"]
        requests.post(f"{API_URL}/lista-compras/{ssd_atual_id}/orcamentos", headers=headers, json={"fornecedor": "Pichau", "preco_unitario": 185.00, "frete": 12.0, "link": "https://pichau.com.br/ssd-kingston-480gb", "selecionado": True})
        requests.post(f"{API_URL}/lista-compras/{ssd_atual_id}/orcamentos", headers=headers, json={"fornecedor": "Mercado Livre", "preco_unitario": 195.00, "frete": 0.0, "link": "https://mercadolivre.com.br/ssd-kingston-480gb", "selecionado": False})
        requests.put(f"{API_URL}/lista-compras/{ssd_atual_id}", headers=headers, json={"status": "comprado"})

    # 7. Item Ativo Pendente: Teclado USB Dell KB216 (Sem cotação atual)
    requests.post(
        f"{API_URL}/lista-compras/",
        headers=headers,
        json={"nome": "Teclado USB Dell KB216", "quantidade": 6, "item_id": teclado_id},
    )

    # 8. Item Histórico Concluído: Teclado USB Dell KB216 Preto (Entregue)
    r_tec_antigo = requests.post(
        f"{API_URL}/lista-compras/",
        headers=headers,
        json={"nome": "Teclado USB Dell KB216 Preto", "quantidade": 8, "item_id": None, "link": "https://dell.com.br/teclado-kb216"},
    )
    if r_tec_antigo.status_code == 201:
        tec_antigo_id = r_tec_antigo.json()["id"]
        requests.post(f"{API_URL}/lista-compras/{tec_antigo_id}/orcamentos", headers=headers, json={"fornecedor": "Dell Direto", "preco_unitario": 79.00, "frete": 0.0, "link": "https://dell.com.br/teclado-kb216", "selecionado": True})
        requests.post(f"{API_URL}/lista-compras/{tec_antigo_id}/orcamentos", headers=headers, json={"fornecedor": "Mercado Livre", "preco_unitario": 85.00, "frete": 10.0, "link": "https://mercadolivre.com.br/teclado-dell-kb216", "selecionado": False})
        requests.put(f"{API_URL}/lista-compras/{tec_antigo_id}", headers=headers, json={"status": "entregue"})

    # 9. Item Ativo Pendente: Bobina Cabo de Rede Cat6 Furukawa 305m (Pendente com 3 orçamentos)
    r_cabo = requests.post(
        f"{API_URL}/lista-compras/",
        headers=headers,
        json={"nome": "Cabo de Rede Cat6 Furukawa 305m Azul", "quantidade": 1, "item_id": None, "link": "https://mercadolivre.com.br/cabo-cat6-furukawa"},
    )
    if r_cabo.status_code == 201:
        cabo_id = r_cabo.json()["id"]
        requests.post(f"{API_URL}/lista-compras/{cabo_id}/orcamentos", headers=headers, json={"fornecedor": "Loja do CFTV", "preco_unitario": 780.00, "frete": 0.0, "link": "https://lojadocftv.com.br/cabo-cat6-furukawa", "selecionado": True})
        requests.post(f"{API_URL}/lista-compras/{cabo_id}/orcamentos", headers=headers, json={"fornecedor": "Mercado Livre", "preco_unitario": 820.00, "frete": 0.0, "link": "https://mercadolivre.com.br/cabo-cat6-furukawa", "selecionado": False})
        requests.post(f"{API_URL}/lista-compras/{cabo_id}/orcamentos", headers=headers, json={"fornecedor": "Kalunga", "preco_unitario": 890.00, "frete": 35.0, "link": "https://kalunga.com.br/cabo-cat6-furukawa", "selecionado": False})

    print("Todos os produtos e cotações foram criados com sucesso pela API!")

if __name__ == "__main__":
    popular_via_api()
