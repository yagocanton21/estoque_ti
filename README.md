# Estoque TI

## Ambiente de desenvolvimento

```powershell
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:8000
- Documentação da API: http://localhost:8000/docs

O banco principal fica exclusivamente em `data/estoque.db`. O diretório é ignorado pelo Git.

## Migrações do banco

A API executa `alembic upgrade head` automaticamente antes de iniciar.

Criar uma nova migração depois de alterar os modelos:

```powershell
docker compose exec api alembic revision --autogenerate -m "descricao da alteracao"
docker compose exec api alembic upgrade head
```

Consultar a versão aplicada:

```powershell
docker compose exec api alembic current
```

## Testes isolados

Os testes usam um SQLite temporário dentro de um contêiner descartável. Eles não montam `data/` nem acessam o banco principal.

```powershell
docker compose --profile test run --rm tests
```

Os scripts PowerShell antigos agora exigem `TEST_API_BASE_URL` e recusam a porta principal `8000` por padrão.

## Backup

Com a API em execução:

```powershell
.\scripts\backup_database.ps1
```

O backup usa a API de backup do SQLite, executa `PRAGMA integrity_check` e salva um arquivo com data e hora em `backups/`.

Antes de uma restauração, pare a API e preserve uma cópia do banco atual. Nunca substitua `data/estoque.db` enquanto o contêiner estiver escrevendo nele.

## Painel de backups (Cobian + Duplicati)

A aba **Backups** acompanha o Cobian Reflector dos servidores e o Duplicati das máquinas. A Visão Geral mostra um resumo e o menu mostra quantos backups estão com problema. A API verifica atrasos e agentes parados a cada 15 minutos (`BACKUP_CHECK_MINUTES`, `0` desliga).

Configuração em `data/backup_monitor.json`, no mesmo formato do `config.json` do painel antigo (`ingest_token`, `admin_token`, `rules`, `tasks`, `ignore`, `aliases`, `late_hours_default`...). O arquivo é relido sozinho quando muda. As variáveis `BACKUP_INGEST_TOKEN` e `BACKUP_ADMIN_TOKEN` (via `.env`) sobrepõem os tokens do arquivo. Sem token de envio, os agentes recebem HTTP 503.

Endereço para os agentes: `http://<servidor>/api/backups`

- Agente Cobian: `install-cobian-agent.ps1 -PanelUrl 'http://<servidor>/api/backups' -Token '<ingest_token>'`, ou troque só o `panel_url` em `C:\BackupMonitor\cobian-agent.config.json`.
- Duplicati: relatório HTTP em `http://<servidor>/api/backups/api/duplicati/<ingest_token>/<NOME-DA-MAQUINA>`, formato Json.

Importar o histórico do painel antigo (copie o `backups.db` para `data/` antes):

```powershell
docker compose exec -T api python /app/tools/importar_painel_backups.py /data/backups-painel-antigo.db
```
