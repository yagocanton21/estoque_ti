if (-not $env:TEST_API_BASE_URL) {
    throw "Defina TEST_API_BASE_URL apontando para uma API com banco de testes isolado."
}
$BASE = $env:TEST_API_BASE_URL
if ($BASE -match ':8000/?$' -and $env:ALLOW_MUTATING_LIVE_DB -ne '1') {
    throw "Proteção ativa: estes testes não podem alterar a API principal na porta 8000."
}
$pass = 0
$fail = 0

function Test-Case {
    param($name, $result, $expected)
    if ($result -match $expected) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
        Write-Host "         Esperado: $expected" -ForegroundColor Yellow
        Write-Host "         Recebido: $result" -ForegroundColor Yellow
        $script:fail++
    }
}

function Invoke-API {
    param($method, $path, $body = $null)
    try {
        $params = @{ Method = $method; Uri = "$BASE$path"; ContentType = "application/json" }
        if ($body) { $params.Body = ($body | ConvertTo-Json) }
        $r = Invoke-RestMethod @params
        return $r | ConvertTo-Json -Depth 5
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        return "$code $($_.ErrorDetails.Message)"
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTES DE EDGE CASES / ERROS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ─────────────────────────────────────────
Write-Host "► CAMPOS OBRIGATORIOS FALTANDO (422)" -ForegroundColor Magenta

$r = Invoke-API POST "/itens/" @{ marca="Dell" }
Test-Case "POST /itens/ sem nome e quantidade → 422" $r "422"

$r = Invoke-API POST "/itens/" @{ nome="Só nome" }
Test-Case "POST /itens/ sem quantidade → 422" $r "422"

$r = Invoke-API POST "/movimentacoes/" @{ tipo="entrada"; quantidade=5 }
Test-Case "POST /movimentacoes/ sem item_id → 422" $r "422"

$r = Invoke-API POST "/movimentacoes/" @{ item_id=1; quantidade=5 }
Test-Case "POST /movimentacoes/ sem tipo → 422" $r "422"

# ─────────────────────────────────────────
Write-Host "`n► TIPOS DE DADOS INVALIDOS (422)" -ForegroundColor Magenta

$r = Invoke-API POST "/itens/" @{ nome="Teste"; quantidade="nao_eh_numero" }
Test-Case "POST /itens/ com quantidade string → 422" $r "422"

$r = Invoke-API GET "/itens/abc"
Test-Case "GET /itens/abc (id string) → 422" $r "422"

$r = Invoke-API POST "/movimentacoes/" @{ item_id=1; tipo="invalido"; quantidade=5 }
Test-Case "POST /movimentacoes/ com tipo invalido → 422" $r "422"

# ─────────────────────────────────────────
Write-Host "`n► VALORES LIMITE" -ForegroundColor Magenta

$r = Invoke-API POST "/itens/" @{ nome="Item zero estoque"; quantidade=0; quantidade_minima=0 }
Test-Case "Cadastrar item com quantidade=0 (permitido)" $r '"id"'

$r = Invoke-API POST "/itens/" @{ nome="Item negativo"; quantidade=-5; quantidade_minima=0 }
Test-Case "Cadastrar item com quantidade negativa → 422" $r "422"

$r = Invoke-API POST "/movimentacoes/" @{ item_id=1; tipo="saida"; quantidade=0 }
Test-Case "Saida com quantidade=0 → 422" $r "422"

# Cria item fresco para teste de quantidade enorme
$itemGrande = (Invoke-API POST "/itens/" @{ nome="Item grande"; quantidade=10; quantidade_minima=0 }) | ConvertFrom-Json
$r = Invoke-API POST "/movimentacoes/" @{ item_id=$itemGrande.id; tipo="entrada"; quantidade=999999 }
Test-Case "Entrada com quantidade enorme (sem limite definido)" $r "entrada"

# ─────────────────────────────────────────
Write-Host "`n► SAIDA EXATA DO ESTOQUE" -ForegroundColor Magenta

$itemExato = (Invoke-API POST "/itens/" @{ nome="Item saida exata"; quantidade=5; quantidade_minima=0 }) | ConvertFrom-Json
$r = Invoke-API POST "/movimentacoes/" @{ item_id=$itemExato.id; tipo="saida"; quantidade=5 }
Test-Case "Saida exata do estoque (estoque vai a 0)" $r "saida"

$r = Invoke-API POST "/movimentacoes/" @{ item_id=$itemExato.id; tipo="saida"; quantidade=1 }
Test-Case "Saida adicional com estoque zerado → 400" $r "400"

# ─────────────────────────────────────────
Write-Host "`n► DELETAR ITEM COM MOVIMENTACOES (FK CONSTRAINT)" -ForegroundColor Magenta

# Cria item sem movimentações para deletar
$itemDel = (Invoke-API POST "/itens/" @{ nome="Item para deletar"; quantidade=1; quantidade_minima=0 }) | ConvertFrom-Json
# Cria item com movimentações para bloquear
$itemComMov = (Invoke-API POST "/itens/" @{ nome="Item com movimentacoes"; quantidade=10; quantidade_minima=0 }) | ConvertFrom-Json
Invoke-API POST "/movimentacoes/" @{ item_id=$itemComMov.id; tipo="entrada"; quantidade=1 } | Out-Null

$r = Invoke-API DELETE "/itens/$($itemDel.id)"
Test-Case "Deletar item sem movimentacoes (204)" $r ""

$r = Invoke-API DELETE "/itens/$($itemComMov.id)"
Test-Case "Deletar item com movimentacoes → 409" $r "409"

# ─────────────────────────────────────────
Write-Host "`n► BODY VAZIO E MALFORMADO" -ForegroundColor Magenta

try {
    $r = Invoke-RestMethod -Method POST -Uri "$BASE/itens/" -ContentType "application/json" -Body "{}"
    $r2 = $r | ConvertTo-Json
} catch {
    $r2 = $_.Exception.Response.StatusCode.value__.ToString()
}
Test-Case "POST /itens/ com body vazio {} → 422" $r2 "422"

# ─────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESULTADO FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASSOU : $pass" -ForegroundColor Green
Write-Host "  FALHOU : $fail" -ForegroundColor Red
Write-Host "  TOTAL  : $($pass + $fail)" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan
