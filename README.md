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
