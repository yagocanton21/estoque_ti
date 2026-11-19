import requests

API_URL = "http://localhost:8000"

def ajustar_cotacoes_triplas():
    # Login
    r = requests.post(f"{API_URL}/auth/login", json={"username": "admin", "password": "8xpdhpckkg"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Busca todos os itens da lista de compras
    itens = requests.get(f"{API_URL}/lista-compras/", headers=headers).json()
    
    # Dicionário de 3 cotações por tipo de item
    catalogo_3_cotacoes = {
        "Monitor": [
            {"fornecedor": "Pichau", "preco_unitario": 649.90, "frete": 19.90, "link": "https://pichau.com.br/monitor-24-lg", "selecionado": True},
            {"fornecedor": "KaBuM!", "preco_unitario": 689.90, "frete": 24.90, "link": "https://kabum.com.br/monitor-24-lg", "selecionado": False},
            {"fornecedor": "Mercado Livre", "preco_unitario": 679.00, "frete": 0.0, "link": "https://mercadolivre.com.br/monitor-24-lg", "selecionado": False},
        ],
        "SSD": [
            {"fornecedor": "Pichau", "preco_unitario": 185.00, "frete": 12.00, "link": "https://pichau.com.br/ssd-kingston-480gb", "selecionado": True},
            {"fornecedor": "Terabyte", "preco_unitario": 192.00, "frete": 15.00, "link": "https://terabyteshop.com.br/ssd-kingston-480gb", "selecionado": False},
            {"fornecedor": "KaBuM!", "preco_unitario": 198.90, "frete": 14.90, "link": "https://kabum.com.br/ssd-kingston-480gb", "selecionado": False},
        ],
        "Bateria": [
            {"fornecedor": "Mercado Livre", "preco_unitario": 16.90, "frete": 0.0, "link": "https://mercadolivre.com.br/bateria-9v-elgin", "selecionado": True},
            {"fornecedor": "Amazon", "preco_unitario": 17.90, "frete": 0.0, "link": "https://amazon.com.br/bateria-9v-elgin", "selecionado": False},
            {"fornecedor": "Kalunga", "preco_unitario": 22.50, "frete": 12.00, "link": "https://kalunga.com.br/bateria-9v", "selecionado": False},
        ],
        "Teclado": [
            {"fornecedor": "Dell Direto", "preco_unitario": 79.00, "frete": 0.0, "link": "https://dell.com.br/teclado-kb216", "selecionado": True},
            {"fornecedor": "Mercado Livre", "preco_unitario": 84.90, "frete": 0.0, "link": "https://mercadolivre.com.br/teclado-dell-kb216", "selecionado": False},
            {"fornecedor": "KaBuM!", "preco_unitario": 89.00, "frete": 11.50, "link": "https://kabum.com.br/teclado-dell-kb216", "selecionado": False},
        ],
        "Cabo": [
            {"fornecedor": "Loja do CFTV", "preco_unitario": 780.00, "frete": 0.0, "link": "https://lojadocftv.com.br/cabo-cat6-furukawa", "selecionado": True},
            {"fornecedor": "Mercado Livre", "preco_unitario": 820.00, "frete": 0.0, "link": "https://mercadolivre.com.br/cabo-cat6-furukawa", "selecionado": False},
            {"fornecedor": "Kalunga", "preco_unitario": 890.00, "frete": 35.00, "link": "https://kalunga.com.br/cabo-cat6-furukawa", "selecionado": False},
        ],
    }

    for item in itens:
        item_id = item["id"]
        nome = item["nome"]
        
        # Encontra as 3 cotações correspondentes
        cotacoes_alvo = None
        for chave, lista_cot in catalogo_3_cotacoes.items():
            if chave.lower() in nome.lower():
                cotacoes_alvo = lista_cot
                break
        
        if not cotacoes_alvo:
            continue

        # Deleta orçamentos existentes desse item para recriar as 3 cotações limpas
        for orc in item.get("orcamentos", []):
            requests.delete(f"{API_URL}/lista-compras/orcamentos/{orc['id']}", headers=headers)

        # Adiciona primeiro as não selecionadas
        for cot in [c for c in cotacoes_alvo if not c["selecionado"]]:
            requests.post(f"{API_URL}/lista-compras/{item_id}/orcamentos", headers=headers, json=cot)
        
        # Adiciona a selecionada por último para virar a vencedora oficial
        for cot in [c for c in cotacoes_alvo if c["selecionado"]]:
            requests.post(f"{API_URL}/lista-compras/{item_id}/orcamentos", headers=headers, json=cot)

        print(f"Item '{nome}' (ID {item_id}) configurado com exatamente 3 cotações!")

if __name__ == "__main__":
    ajustar_cotacoes_triplas()
