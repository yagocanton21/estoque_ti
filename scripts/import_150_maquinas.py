import io
import random
import openpyxl
import urllib.request
import urllib.error
import mimetypes

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

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Relação de IPs"

headers = [
    "Nome da Máquina", "IP", "Usuário", "Usuário AD", "Setor", 
    "Sistema Operacional", "Office", "Antivírus", "Observações"
]
ws.append(headers)

total_gerado = 0
ip_base = 10

for setor_nome, prefixo, qtd in setores_dados:
    for i in range(1, qtd + 1):
        tipo_maq = "NOTE" if (i % 3 == 0 or setor_nome == "Diretoria") else "DESK"
        nome_maquina = f"{prefixo}-{tipo_maq}{i:02d}"
        
        nome_idx = total_gerado % len(nomes)
        base_nome, base_login = nomes[nome_idx]
        
        if total_gerado >= len(nomes):
            sufixo_num = (total_gerado // len(nomes)) + 1
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
        
        ws.append([nome_maquina, ip, usuario, usuario_ad, setor_nome, so, office, av, obs])
        total_gerado += 1
        if total_gerado >= 150:
            break
    if total_gerado >= 150:
        break

excel_file = io.BytesIO()
wb.save(excel_file)
excel_bytes = excel_file.getvalue()

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = bytearray()
body.extend(f"--{boundary}\r\n".encode("utf-8"))
body.extend(b'Content-Disposition: form-data; name="file"; filename="150_maquinas.xlsx"\r\n')
body.extend(b'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n')
body.extend(excel_bytes)
body.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))

req = urllib.request.Request(
    "http://localhost:8000/relacao-ips/importar",
    data=bytes(body),
    headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Content-Length": str(len(body)),
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Resposta:", response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode("utf-8"))
except Exception as ex:
    print("Erro:", ex)
