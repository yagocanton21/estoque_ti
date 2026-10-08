import sqlite3
import random
from datetime import datetime, timezone

db_path = "data/estoque.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Nomes de colaboradores realistas
nomes = [
    ("Carlos Eduardo Silva", "carlos.silva"),
    ("Mariana Souza Costa", "mariana.souza"),
    ("Roberto Mendes Lima", "roberto.lima"),
    ("Juliana Rocha Alves", "juliana.rocha"),
    ("Fernanda Dias Santos", "fernanda.santos"),
    ("Lucas Gabriel Ribeiro", "lucas.ribeiro"),
    ("Amanda Martins Ferreira", "amanda.ferreira"),
    ("Rafael Barbosa Oliveira", "rafael.oliveira"),
    ("Beatriz Nunes Cardoso", "beatriz.cardoso"),
    ("Bruno Henrique Castro", "bruno.castro"),
    ("Patricia Gomes Moreira", "patricia.moreira"),
    ("Thiago Augusto Vieira", "thiago.vieira"),
    ("Camila Araujo Nogueira", "camila.araujo"),
    ("Diego Fernandes Cunha", "diego.cunha"),
    ("Larissa Monteiro Teixeira", "larissa.monteiro"),
    ("Guilherme Pires Duarte", "guilherme.duarte"),
    ("Tatiane Farias Ramos", "tatiane.ramos"),
    ("Marcio Andre Carvalho", "marcio.carvalho"),
    ("Vanessa Cristina Lopes", "vanessa.lopes"),
    ("Leandro Borges Guimaraes", "leandro.borges"),
    ("Aline Vasconcelos Prado", "aline.prado"),
    ("Eduardo Cesar Peixoto", "eduardo.peixoto"),
    ("Renata Silveira Campos", "renata.campos"),
    ("Rodrigo Fonseca Melo", "rodrigo.melo"),
    ("Priscila Rezende Maia", "priscila.maia"),
    ("Gustavo Henrique Antunes", "gustavo.antunes"),
    ("Leticia Miranda Furtado", "leticia.furtado"),
    ("Felipe Barreto Siqueira", "felipe.siqueira"),
    ("Debora Cristina Freitas", "debora.freitas"),
    ("Alexandre Matos Coelho", "alexandre.coelho"),
]

setores_dados = [
    ("TI", "TI", 15),
    ("Financeiro", "FIN", 18),
    ("Recursos Humanos", "RH", 12),
    ("Comercial", "COM", 22),
    ("Faturamento", "FAT", 12),
    ("Almoxarifado", "ALM", 10),
    ("Logística", "LOG", 14),
    ("Diretoria", "DIR", 6),
    ("Compras", "CMP", 12),
    ("Engenharia", "ENG", 11),
    ("Controladoria", "CTRL", 8),
    ("Marketing", "MKT", 10),
]

sistemas_op = ["Windows 11 Pro", "Windows 11 Pro", "Windows 10 Pro", "Windows 10 Pro", "Windows Server 2022"]
offices = ["Microsoft 365", "Office 2021 Standard", "Office 2021 Pro", "Office 2019 Standard", "Office 2016"]
antivirus_list = ["Windows Defender", "Kaspersky Endpoint", "Bitdefender GravityZone", "CrowdStrike Falcon"]

# Limpa máquinas antigas de teste se existirem para evitar duplicatas de IP
cursor.execute("DELETE FROM maquinas")

ip_base = 10
total_inseridos = 0
now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

for setor_nome, prefixo, qtd in setores_dados:
    for i in range(1, qtd + 1):
        tipo_maq = "NOTE" if (i % 3 == 0 or setor_nome == "Diretoria") else "DESK"
        nome_maquina = f"{prefixo}-{tipo_maq}{i:02d}"
        
        # Pega ou combina nome de usuário
        nome_idx = (total_inseridos) % len(nomes)
        base_nome, base_login = nomes[nome_idx]
        
        # Varia o usuário se repetir nome
        if total_inseridos >= len(nomes):
            sufixo_num = (total_inseridos // len(nomes)) + 1
            usuario = f"{base_nome} ({sufixo_num})"
            usuario_ad = f"{base_login}{sufixo_num}"
        else:
            usuario = base_nome
            usuario_ad = base_login

        ip = f"192.168.1.{ip_base}"
        ip_base += 1
        so = random.choice(sistemas_op)
        office = random.choice(offices)
        av = random.choice(antivirus_list)
        obs = f"Estação do setor {setor_nome}. Conectada via {'Wi-Fi Corporativo' if tipo_maq == 'NOTE' else 'Cabo CAT6'}."
        
        cursor.execute(
            """
            INSERT INTO maquinas (
                nome_maquina, ip, usuario, usuario_ad, setor, 
                sistema_operacional, office, antivirus, observacoes, 
                ativo, data_criacao, data_atualizacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                nome_maquina, ip, usuario, usuario_ad, setor_nome,
                so, office, av, obs, 1, now_str, now_str
            )
        )
        total_inseridos += 1
        if total_inseridos >= 150:
            break
    if total_inseridos >= 150:
        break

conn.commit()
print(f"Total inserido com sucesso: {total_inseridos} maquinas no banco {db_path}!")
conn.close()
