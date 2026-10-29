"""Painel de backups (Cobian + Duplicati). Portado dos testes do kit-backup-monitor v2."""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from database import SessionLocal
from models.backup import BackupAgente, BackupExecucao
from services import backups
from services.backup_formatos import (
    duracao_em_segundos,
    fuso_de,
    horas_ignoradas,
    iso,
    ler_data,
    para_banco,
    tamanho_em_bytes,
)

AMOSTRAS = Path(__file__).parent / "amostras_backup"
INGEST, ADMIN = "i" * 24, "a" * 24
FUSO = fuso_de("-03:00")


def amostra(nome):
    return json.loads((AMOSTRAS / nome).read_text(encoding="utf-8"))


def agora_iso(horas_atras=0.0):
    return (datetime.now(timezone.utc) - timedelta(hours=horas_atras)).strftime("%Y-%m-%dT%H:%M:%SZ")


def duplicati_ok(nome="Job A", fim_h=1.0):
    return {"Data": {"ParsedResult": "Success", "BeginTime": agora_iso(fim_h + 0.1), "EndTime": agora_iso(fim_h),
                     "Duration": "00:06:00", "ExaminedFiles": 10, "AddedFiles": 2, "SizeOfAddedFiles": 2048,
                     "ErrorsActualLength": 0, "WarningsActualLength": 0},
            "Extra": {"OperationName": "Backup", "backup-name": nome}, "LogLines": []}


def cobian_run(task="T1", status="ok", fim_h=1.0, errors=0, **kw):
    r = {"task": task, "status": status, "started_at": agora_iso(fim_h + 0.05), "finished_at": agora_iso(fim_h),
         "errors": errors, "warnings": 0, "processed_files": 100, "backed_up_files": 5,
         "total_size": "4,24 GB", "duration_s": 180}
    r.update(kw)
    return r


@pytest.fixture()
def painel(client):
    """Config fixa + sessão do banco; devolve uma função para trocar a config no meio do teste."""
    base = {"ingest_token": INGEST, "admin_token": ADMIN, "late_hours_default": 26, "agent_late_minutes": 60,
            "timezone_offset": "-03:00", "rules": [], "ignore": [], "tasks": []}

    def configurar(**extra):
        backups.configurar({**base, **extra})

    configurar()
    db = SessionLocal()
    db.configurar = configurar
    yield db
    db.close()
    backups.configurar(None)


def estados(db):
    return {r["tarefa"]: r["estado"] for r in backups.linhas_status(db)}


# ------------------------------------------------------------------ ingestão

def test_duplicati_payload_real_2_0_7_1(painel):
    p = amostra("duplicati-2.0.7.1-real.json")
    p["Data"]["BeginTime"], p["Data"]["EndTime"] = agora_iso(1.1), agora_iso(1.0)   # amostra tem data fixa
    r = backups.ingerir_duplicati(painel, p, "ws-ana", "10.0.0.5", 1)
    assert (r["machine"], r["task"], r["status"], r["new"]) == ("WS-ANA", "Teste Captura", "ok", 1)
    linhas = backups.linhas_status(painel)
    assert len(linhas) == 1
    assert linhas[0]["estado"] == "ok"
    assert linhas[0]["tamanho"] == "6 B"


def test_reenvio_nao_duplica_nem_realerta(painel):
    for _ in range(3):
        backups.ingerir_duplicati(painel, amostra("duplicati-erro.json"), "WS-1", "x", 1)
    assert painel.query(BackupExecucao).count() == 1
    assert len(backups.alertas_abertos(painel)) == 1


def test_erro_vira_erro_com_mensagem(painel):
    backups.ingerir_duplicati(painel, amostra("duplicati-erro.json"), "WS-1", "x", 1)
    r = backups.linhas_status(painel)[0]
    assert (r["estado"], r["erros"], r["avisos"]) == ("erro", 2, 1)
    assert "SSL connection" in r["mensagem"]


def test_excecao_vira_erro(painel):
    backups.ingerir_duplicati(painel, amostra("duplicati-excecao.json"), "NAS", "x", 1)
    r = backups.linhas_status(painel)[0]
    assert (r["tarefa"], r["estado"]) == ("NAS - Projetos", "erro")
    assert "network path" in r["mensagem"]


def test_backup_abortado_mostra_a_causa(painel):
    backups.ingerir_duplicati(painel, amostra("duplicati-abortado-real.json"), "WS-1", "x", 1)
    r = backups.linhas_status(painel)[0]
    assert (r["tarefa"], r["estado"]) == ("Projetos E2E", "erro")
    assert "source path" in r["mensagem"]
    assert "IOException" in r["mensagem"]


def test_sem_resultado_reconhecido_nunca_vira_ok(painel):
    backups.ingerir_duplicati(painel, {"Data": {}, "Extra": {"OperationName": "Backup", "backup-name": "X"}}, "WS-1", "x", 1)
    r = backups.linhas_status(painel)[0]
    assert r["estado"] == "erro"
    assert "sem resultado reconhecido" in r["mensagem"]


def test_operacao_nao_backup_ignorada(painel):
    res = backups.ingerir_duplicati(painel, amostra("duplicati-list.json"), "WS-1", "x", 1)
    assert res["new"] == 0
    assert backups.linhas_status(painel) == []


def test_texto_cru_nao_derruba(painel):
    res = backups.ingerir_duplicati(painel, "lixo qualquer sem estrutura", "WS-1", "x", 1)
    assert res["status"] == "erro"   # sem resultado reconhecido => erro, nunca ok


def test_cobian_dedup_e_status_aviso_erro(painel):
    pl = {"agent": "srv-01", "runs": [cobian_run("A", fim_h=2), cobian_run("B", "error", 3, errors=2, message="ERR x")]}
    r1 = backups.ingerir_cobian(painel, pl, "x", 1)
    r2 = backups.ingerir_cobian(painel, pl, "x", 2)
    assert (r1["new"], r2["new"]) == (2, 0)
    assert estados(painel) == {"A": "ok", "B": "erro"}
    assert len(backups.alertas_abertos(painel)) == 1


def test_carga_de_historico_gera_um_unico_alerta(painel):
    runs = [cobian_run("Backup Documentos", "error", fim_h=24 * d + 2, errors=1, message="ERR login") for d in range(20)]
    r = backups.ingerir_cobian(painel, {"agent": "SRV2016-08", "runs": runs}, "x", 1)
    assert r["new"] == 20
    assert len(backups.alertas_abertos(painel)) == 1


def test_historico_antigo_nao_alerta(painel):
    runs = [cobian_run("T", "error", fim_h=24 * d + 100, errors=1) for d in range(5)]
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": runs}, "x", 1)
    assert backups.alertas_abertos(painel) == []
    assert backups.linhas_status(painel)[0]["estado"] == "erro"   # o cartão continua mostrando o estado real


# ------------------------------------------------------------------- prazos

def test_atrasado_e_alerta_unico_por_episodio(painel):
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": [cobian_run("T1", fim_h=40)]}, "x", 1)
    criados = [len(backups.verificar(painel)) for _ in range(8)]       # 2 h de verificação a cada 15 min
    assert backups.linhas_status(painel)[0]["estado"] == "atrasado"
    assert criados == [1, 0, 0, 0, 0, 0, 0, 0], "um alerta por episódio, não um por verificação"
    assert len(backups.alertas_abertos(painel)) == 1


def test_nunca_para_tarefa_cadastrada(painel):
    painel.configurar(tasks=[{"source": "cobian", "machine": "SRV", "task": "Fantasma"}])
    assert backups.linhas_status(painel)[0]["estado"] == "nunca"
    assert len(backups.verificar(painel)) == 1


def test_regra_glob_define_prazo(painel):
    painel.configurar(rules=[{"source": "duplicati", "machine": "WS-*", "task": "*", "max_age_hours": 74},
                             {"source": "duplicati", "machine": "*", "task": "*", "max_age_hours": 26}])
    backups.ingerir_duplicati(painel, duplicati_ok("J", fim_h=50), "WS-ANA", "x", 1)   # 50 h < 74 h => ok
    backups.ingerir_duplicati(painel, duplicati_ok("J", fim_h=50), "SRV-A", "x", 1)    # 50 h > 26 h => atrasado
    assert {r["maquina"]: r["estado"] for r in backups.linhas_status(painel)} == {"WS-ANA": "ok", "SRV-A": "atrasado"}


def test_ignore_remove_do_painel_e_dos_alertas(painel):
    painel.configurar(ignore=[{"source": "duplicati", "machine": "PC-VELHO", "task": "*"}])
    backups.ingerir_duplicati(painel, duplicati_ok("J", fim_h=200), "PC-VELHO", "x", 1)
    assert backups.linhas_status(painel) == []
    assert backups.verificar(painel) == []


def test_recuperacao_fecha_alerta(painel):
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": [cobian_run("T1", "error", 5, errors=1)]}, "x", 1)
    assert len(backups.alertas_abertos(painel)) == 1
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": [cobian_run("T1", "ok", 1)]}, "x", 2)
    assert backups.alertas_abertos(painel) == []
    assert backups.linhas_status(painel)[0]["estado"] == "ok"


def test_executando_nao_vira_erro(painel):
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": [cobian_run("T1", fim_h=5)],
                                    "running": [{"task": "T1", "started_at": agora_iso(0.2)}]}, "x", 1)
    assert backups.linhas_status(painel)[0]["estado"] == "executando"


def test_primeira_execucao_em_andamento_aparece(painel):
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": [],
                                    "running": [{"task": "Nova", "started_at": agora_iso(0.1)}]}, "x", 1)
    assert [(r["tarefa"], r["estado"]) for r in backups.linhas_status(painel)] == [("Nova", "executando")]


def test_agente_parado_gera_alerta(painel):
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": []}, "x", 1)
    painel.query(BackupAgente).update({BackupAgente.ultimo_contato: para_banco(datetime.now(timezone.utc) - timedelta(hours=3))})
    painel.commit()
    assert backups.linhas_agentes(painel)[0]["estado"] == "parado"
    assert len(backups.verificar(painel)) == 1


def test_servico_cobian_parado(painel):
    backups.ingerir_cobian(painel, {"agent": "SRV", "heartbeat": {"cobian_service": "Stopped"}, "runs": []}, "x", 1)
    assert backups.linhas_agentes(painel)[0]["estado"] == "servico"


def test_faixa_30_dias_nao_inventa_verde(painel):
    for _ in range(6):   # reenvio a cada 30 min não pode pintar dias novos
        backups.ingerir_cobian(painel, {"agent": "SRV", "runs": [cobian_run("T1", fim_h=5)]}, "x", 1)
    verdes = [d for d in backups.linhas_status(painel)[0]["historico"] if d["estado"] == "ok"]
    assert len(verdes) <= 1


def test_skip_days_fim_de_semana_nao_atrasa():
    """Servidor roda seg-sex 23:00: sexta 23:16 -> segunda 10:00 (58,7 h) não é atraso com skip sáb/dom."""
    sexta = ler_data("2026-10-09 23:16:00", FUSO)
    seg_10h = ler_data("2026-10-12 10:00:00", FUSO)
    seg_23h30 = ler_data("2026-10-12 23:30:00", FUSO)
    ter_02h = ler_data("2026-10-13 02:00:00", FUSO)
    fim_de_semana = frozenset({5, 6})
    assert horas_ignoradas(sexta, seg_10h, fim_de_semana, FUSO) == pytest.approx(48.0)
    assert 58.7 - horas_ignoradas(sexta, seg_10h, fim_de_semana, FUSO) < 26
    assert (seg_23h30 - sexta).total_seconds() / 3600 - 48 < 26
    assert (ter_02h - sexta).total_seconds() / 3600 - 48 > 26
    assert horas_ignoradas(sexta, seg_10h, frozenset(), FUSO) == 0.0


def test_skip_days_aplicado_no_cartao(painel):
    painel.configurar(rules=[{"source": "cobian", "machine": "*", "task": "*", "max_age_hours": 26,
                              "skip_days": ["sab", "dom"]}])
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": [cobian_run("T1", fim_h=1)]}, "x", 1)
    linha = backups.linhas_status(painel)[0]
    assert linha["dias_ignorados"] == [5, 6]
    assert linha["estado"] == "ok"


# ------------------------------------------------------------------ formatos

def test_tamanhos():
    casos = {"4,24 GB": 4552665333, "0 bytes": 0, "1.234 bytes": 1234, "1,234.56 MB": 1294529986,
             "530,48 MB": 556248596, 13249978368: 13249978368, "12.34 GB": 13249974108}
    for entrada, esperado in casos.items():
        assert tamanho_em_bytes(entrada) == esperado, entrada


def test_duracao_e_datas_do_dotnet():
    assert duracao_em_segundos("00:14:09.1234567") == 849
    assert duracao_em_segundos("1.02:03:04") == 93784
    assert ler_data("0001-01-01T00:00:00", FUSO) is None
    assert iso(ler_data("2026-10-09T13:27:43.1609558Z", FUSO)) == "2026-10-09T13:27:43Z"
    assert iso(ler_data("2026-10-09 10:00:00", FUSO)) == "2026-10-09T13:00:00Z"   # local -03:00


# ---------------------------------------------------------------------- HTTP

def test_health_livre(client, painel):
    resp = client.get("/backups/api/health")
    assert resp.status_code == 200
    assert resp.json()["ingest_configured"] is True


def test_envio_exige_token(client, painel):
    pl = {"agent": "SRV", "runs": [cobian_run()]}
    assert client.post("/backups/api/cobian", json=pl).status_code == 401
    assert client.post("/backups/api/cobian", json=pl, headers={"X-Auth-Token": "errado" * 4}).status_code == 401
    assert client.post("/backups/api/duplicati/errado/WS-1", json=duplicati_ok()).status_code == 401
    assert painel.query(BackupExecucao).count() == 0


def test_envio_sem_token_configurado_e_recusado(client, painel):
    painel.configurar(ingest_token="", admin_token="")
    resp = client.post("/backups/api/cobian", json={"agent": "SRV"}, headers={"X-Auth-Token": ""})
    assert resp.status_code == 503


def test_whoami_confere_token_sem_gravar(client, painel):
    assert client.get("/backups/api/whoami", headers={"X-Auth-Token": INGEST}).json()["role"] == "ingest"
    assert client.get("/backups/api/whoami", headers={"X-Auth-Token": ADMIN}).json()["role"] == "admin"
    assert client.get("/backups/api/whoami", headers={"X-Auth-Token": "x"}).status_code == 401
    assert painel.query(BackupAgente).count() == 0


def test_json_invalido_400_e_cobian_ok(client, painel):
    h = {"X-Auth-Token": INGEST, "Content-Type": "application/json"}
    assert client.post("/backups/api/cobian", content=b"{nao e json", headers=h).status_code == 400
    resp = client.post("/backups/api/cobian", content=json.dumps({"agent": "srv-x", "runs": [cobian_run()]}).encode("utf-8-sig"), headers=h)
    assert resp.status_code == 200
    assert (resp.json()["machine"], resp.json()["new"]) == ("SRV-X", 1)


def test_duplicati_fim_a_fim_e_painel(client, painel):
    resp = client.post(f"/backups/api/duplicati/{INGEST}/ws-ana", json=duplicati_ok("Documentos"))
    assert resp.status_code == 200
    assert resp.json()["new"] == 1
    # formato form 'message=<json>' que algumas versões do Duplicati usam
    form = client.post(f"/backups/api/duplicati/{INGEST}/ws-bia", data={"message": json.dumps(duplicati_ok("Fotos"))})
    assert form.json()["task"] == "Fotos"
    dados = client.get("/backups/painel").json()
    assert {(t["maquina"], t["tarefa"], t["estado"]) for t in dados["tarefas"]} == {
        ("WS-ANA", "Documentos", "ok"), ("WS-BIA", "Fotos", "ok")}
    assert dados["problemas"] == 0
    assert len(dados["tarefas"][0]["historico"]) == 30


def test_apelido_de_maquina_e_de_cartao_sao_independentes(client, painel):
    painel.configurar(aliases={"srv-01": "Do arquivo"})
    backups.ingerir_cobian(painel, {"agent": "SRV-01", "runs": [cobian_run("A"), cobian_run("B", fim_h=2)]}, "x", 1)
    assert {t["apelido"] for t in client.get("/backups/painel").json()["tarefas"]} == {"Do arquivo"}

    assert client.post("/backups/apelido", json={"maquina": "srv-01", "apelido": "Servidor Fiscal"}).status_code == 200
    assert client.post("/backups/apelido", json={"maquina": "SRV-01", "fonte": "cobian", "tarefa": "A",
                                                 "apelido": "Banco"}).status_code == 200
    tarefas = {t["tarefa"]: t for t in client.get("/backups/painel").json()["tarefas"]}
    assert (tarefas["A"]["apelido"], tarefas["A"]["apelido_cartao"]) == ("Servidor Fiscal", "Banco")
    assert (tarefas["B"]["apelido"], tarefas["B"]["apelido_cartao"]) == ("Servidor Fiscal", "")

    client.post("/backups/apelido", json={"maquina": "SRV-01", "apelido": ""})   # vazio remove, inclusive o do arquivo
    assert {t["apelido"] for t in client.get("/backups/painel").json()["tarefas"]} == {""}


def test_apelido_valida_entrada(client, painel):
    assert client.post("/backups/apelido", json={"maquina": " ", "apelido": "x"}).status_code == 400
    assert client.post("/backups/apelido", json={"maquina": "SRV", "tarefa": "A", "fonte": "outra",
                                                 "apelido": "x"}).status_code == 400


def test_resumo_e_formato_antigo(client, painel):
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": [cobian_run("Ruim", "error", 1, errors=3, message="ERR x"),
                                                             cobian_run("Bom", fim_h=1)]}, "x", 1)
    resumo = client.get("/backups/resumo").json()
    assert (resumo["total"], resumo["problemas"], resumo["contagem"]["ok"]) == (2, 1, 1)
    assert [(i["tarefa"], i["estado"]) for i in resumo["itens"]] == [("Ruim", "erro")]
    antigo = client.get("/backups/api/resumo").json()
    assert (antigo["ok"], antigo["problems"], antigo["open_alerts"]) == (True, 1, 1)
    assert antigo["items"][0]["task"] == "Ruim" and antigo["items"][0]["kind"] == "backup"


def test_reconhecer_alertas(client, painel):
    backups.ingerir_cobian(painel, {"agent": "SRV", "runs": [cobian_run("T1", "error", 1, errors=1)]}, "x", 1)
    alertas = client.get("/backups/painel").json()["alertas"]
    assert len(alertas) == 1
    assert client.post("/backups/alertas/reconhecer", json={"ids": [alertas[0]["id"]]}).json()["reconhecidos"] == 1
    assert client.get("/backups/painel").json()["alertas"] == []


def test_raw_exige_token_admin(client, painel):
    client.post("/backups/api/cobian", json={"agent": "SRV", "runs": []}, headers={"X-Auth-Token": INGEST})
    assert client.get("/backups/api/raw", headers={"X-Auth-Token": INGEST}).status_code == 401
    resp = client.get("/backups/api/raw", headers={"X-Auth-Token": ADMIN})
    assert resp.json()["payloads"][0]["payload"]["agent"] == "SRV"


def test_dois_servidores_com_o_mesmo_nome_viram_conflito(painel):
    backups.ingerir_cobian(painel, {"agent": "SRV2016-08", "heartbeat": {"cobian_dir": r"C:\Program Files\Cobian Reflector"},
                                    "runs": []}, "x", 1)
    backups.ingerir_cobian(painel, {"agent": "SRV2016-08", "heartbeat": {"cobian_dir": r"F:\Cobian Reflector"},
                                    "runs": []}, "x", 2)
    agente = backups.linhas_agentes(painel)[0]
    assert agente["estado"] == "conflito"
    assert "dois servidores" in agente["problema"]
    assert backups.montar_resumo(painel)["problemas"] == 1


def test_mesmo_servidor_nao_gera_conflito(painel):
    for i in range(3):
        backups.ingerir_cobian(painel, {"agent": "SRV", "heartbeat": {"cobian_dir": r"C:\Cobian"}, "runs": []}, "x", i)
    assert backups.linhas_agentes(painel)[0]["estado"] == "ok"


def test_config_lida_do_arquivo_com_bom_e_token_do_ambiente(client, tmp_path, monkeypatch):
    caminho = tmp_path / "backup_monitor.json"
    conteudo = {"bind": "192.168.10.76", "port": 8899, "ingest_token": "f" * 48, "late_hours_default": 30,
                "rules": [{"source": "cobian", "machine": "*", "task": "*", "max_age_hours": 12}],
                "aliases": {"srv2016-08": "Servidor Fiscal"}}
    caminho.write_text(json.dumps(conteudo), encoding="utf-8-sig")
    monkeypatch.setenv("BACKUP_CONFIG_PATH", str(caminho))
    monkeypatch.setenv("BACKUP_ADMIN_TOKEN", "b" * 32)
    backups.configurar(None)
    try:
        cfg = backups.config()
        assert (cfg["ingest_token"], cfg["admin_token"], cfg["late_hours_default"]) == ("f" * 48, "b" * 32, 30)
        assert cfg["aliases"] == {"SRV2016-08": "Servidor Fiscal"}
        assert backups.prazo_esperado("cobian", "X", "Y")[0] == 12
        assert "bind" not in cfg
    finally:
        backups.configurar(None)
