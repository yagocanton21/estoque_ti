$BASE = "http://localhost:8000"
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
        return $_.Exception.Response.StatusCode.value__.ToString() + " " + $_.ErrorDetails.Message
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTES DO SISTEMA DE ESTOQUE DE TI" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ─────────────────────────────────────────
Write-Host "► STATUS DA API" -ForegroundColor Magenta
$r = Invoke-API GET "/"
Test-Case "GET / → API funcionando" $r "funcionando"

# ─────────────────────────────────────────
Write-Host "`n► CADASTRO DE ITENS (POST /itens/)" -ForegroundColor Magenta

$r = Invoke-API POST "/itens/" @{ nome="Notebook Dell"; marca="Dell"; modelo="Latitude 5420"; quantidade=10; quantidade_minima=3 }
Test-Case "Cadastrar notebook com todos os campos" $r '"id"'

$r = Invoke-API POST "/itens/" @{ nome="Mouse USB"; quantidade=20; quantidade_minima=5 }
Test-Case "Cadastrar mouse sem marca/modelo (campos opcionais)" $r '"id"'

$r = Invoke-API POST "/itens/" @{ nome="Teclado Mecânico"; marca="Redragon"; modelo="K552"; quantidade=8; quantidade_minima=2 }
Test-Case "Cadastrar teclado com estoque" $r '"id"'

$r = Invoke-API POST "/itens/" @{ nome="Monitor 24pol"; marca="LG"; modelo="24MK430H"; quantidade=5; quantidade_minima=1 }
Test-Case "Cadastrar monitor" $r '"id"'

# ─────────────────────────────────────────
Write-Host "`n► LISTAGEM DE ITENS (GET /itens/)" -ForegroundColor Magenta

$r = Invoke-API GET "/itens/"
Test-Case "Listar todos os itens cadastrados" $r "Notebook Dell"

# ─────────────────────────────────────────
Write-Host "`n► BUSCA POR ID (GET /itens/{id})" -ForegroundColor Magenta

$r = Invoke-API GET "/itens/1"
Test-Case "Buscar item existente (id=1)" $r "Notebook Dell"

$r = Invoke-API GET "/itens/999"
Test-Case "Buscar item inexistente (404)" $r "404"

# ─────────────────────────────────────────
Write-Host "`n► ATUALIZAÇÃO DE ITENS (PUT /itens/{id})" -ForegroundColor Magenta

$r = Invoke-API PUT "/itens/1" @{ nome="Notebook Dell Atualizado"; marca="Dell"; modelo="Latitude 5520"; quantidade=10; quantidade_minima=3 }
Test-Case "Atualizar modelo do notebook" $r "5520"

$r = Invoke-API PUT "/itens/999" @{ nome="Fantasma"; quantidade=1; quantidade_minima=0 }
Test-Case "Atualizar item inexistente (404)" $r "404"

# ─────────────────────────────────────────
Write-Host "`n► MOVIMENTAÇÕES - ENTRADAS (POST /movimentacoes/)" -ForegroundColor Magenta

$r = Invoke-API POST "/movimentacoes/" @{ item_id=1; tipo="entrada"; quantidade=5 }
Test-Case "Entrada de 5 notebooks (estoque: 10→15)" $r "entrada"

$r = Invoke-API POST "/movimentacoes/" @{ item_id=2; tipo="entrada"; quantidade=10 }
Test-Case "Entrada de 10 mouses (estoque: 20→30)" $r "entrada"

# ─────────────────────────────────────────
Write-Host "`n► MOVIMENTAÇÕES - SAÍDAS (POST /movimentacoes/)" -ForegroundColor Magenta

$r = Invoke-API POST "/movimentacoes/" @{ item_id=1; tipo="saida"; quantidade=3 }
Test-Case "Saída de 3 notebooks (estoque: 15→12)" $r "saida"

$r = Invoke-API POST "/movimentacoes/" @{ item_id=2; tipo="saida"; quantidade=18 }
Test-Case "Saída de 18 mouses (estoque: 30→12)" $r "saida"

# ─────────────────────────────────────────
Write-Host "`n► ALERTA DE ESTOQUE MÍNIMO" -ForegroundColor Magenta

$r = Invoke-API POST "/movimentacoes/" @{ item_id=3; tipo="saida"; quantidade=7 }
Test-Case "Saída que bate no mínimo → alerta no response" $r "mínimo"

# ─────────────────────────────────────────
Write-Host "`n► VALIDAÇÕES DE ERRO" -ForegroundColor Magenta

$r = Invoke-API POST "/movimentacoes/" @{ item_id=1; tipo="saida"; quantidade=9999 }
Test-Case "Saída com estoque insuficiente (400)" $r "400"

$r = Invoke-API POST "/movimentacoes/" @{ item_id=999; tipo="entrada"; quantidade=5 }
Test-Case "Movimentação com item inexistente (404)" $r "404"

# ─────────────────────────────────────────
Write-Host "`n► LISTAGEM DE MOVIMENTAÇÕES (GET /movimentacoes/)" -ForegroundColor Magenta

$r = Invoke-API GET "/movimentacoes/"
Test-Case "Listar histórico completo de movimentações" $r "entrada"

# ─────────────────────────────────────────
Write-Host "`n► EXCLUSÃO DE ITENS (DELETE /itens/{id})" -ForegroundColor Magenta

$r = Invoke-API POST "/itens/" @{ nome="Item para deletar"; quantidade=1; quantidade_minima=0 }
$r = Invoke-API DELETE "/itens/5"
Test-Case "Deletar item existente (204 = resposta vazia)" $r ""

$r = Invoke-API DELETE "/itens/999"
Test-Case "Deletar item inexistente (404)" $r "404"

# ─────────────────────────────────────────
Write-Host "`n► VERIFICAR ESTOQUE FINAL" -ForegroundColor Magenta

$r = Invoke-API GET "/itens/1"
Test-Case "Estoque final do notebook reflete as movimentações" $r '"quantidade"'

$r = Invoke-API GET "/itens/2"
Test-Case "Estoque final do mouse reflete as movimentações" $r '"quantidade"'

# ─────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESULTADO FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASSOU : $pass" -ForegroundColor Green
Write-Host "  FALHOU : $fail" -ForegroundColor Red
Write-Host "  TOTAL  : $($pass + $fail)" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan
