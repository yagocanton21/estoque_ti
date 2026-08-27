param(
    [string]$Prefix = "estoque"
)

$ErrorActionPreference = "Stop"

if ($Prefix -notmatch '^[a-zA-Z0-9_-]+$') {
    throw "O prefixo pode conter apenas letras, números, hífen e sublinhado."
}

$workspace = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "$Prefix-$timestamp.db"

Push-Location $workspace
try {
    docker compose exec -T api python tools/backup_database.py --output "/backups/$fileName"
    if ($LASTEXITCODE -ne 0) {
        throw "O comando de backup falhou."
    }

    $backupPath = Join-Path $workspace "backups\$fileName"
    $backup = Get-Item -LiteralPath $backupPath
    Write-Host "Backup verificado: $($backup.FullName) ($($backup.Length) bytes)" -ForegroundColor Green
}
finally {
    Pop-Location
}
