# Script para associar o protocolo vnc:// ao UltraVNC Viewer no Windows
# Permite que o botão "Acessar" do Estoque TI abra a máquina diretamente no UltraVNC.
# Não requer privilégios de Administrador (grava em HKCU).

$vncPaths = @(
    "C:\Program Files (x86)\uvnc bvba\UltraVNC\vncviewer.exe",
    "C:\Program Files\uvnc bvba\UltraVNC\vncviewer.exe",
    "C:\Program Files\UltraVNC\vncviewer.exe",
    "C:\Program Files (x86)\UltraVNC\vncviewer.exe"
)

$vncExe = $null
foreach ($path in $vncPaths) {
    if (Test-Path $path) {
        $vncExe = $path
        break
    }
}

if (-not $vncExe) {
    Write-Host "[ERRO] UltraVNC Viewer nao encontrado nas pastas padrao." -ForegroundColor Red
    Write-Host "Instale o UltraVNC ou configure o caminho manualmente." -ForegroundColor Yellow
    Exit 1
}

Write-Host "[INFO] UltraVNC Viewer localizado em: $vncExe" -ForegroundColor Cyan

$key = "HKCU:\Software\Classes\vnc"
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name "(Default)" -Value "URL:VNC Protocol"
Set-ItemProperty -Path $key -Name "URL Protocol" -Value ""

$cmdKey = "$key\shell\open\command"
New-Item -Path $cmdKey -Force | Out-Null

# Comando que limpa o prefixo 'vnc://' e qualquer barra final antes de chamar o vncviewer
$cmd = 'powershell.exe -WindowStyle Hidden -Command "$ip = ''%1'' -replace ''^vnc://'', '''' -replace ''/.*$'', ''''; Start-Process ''' + $vncExe + ''' -ArgumentList $ip"'
Set-ItemProperty -Path $cmdKey -Name "(Default)" -Value $cmd

Write-Host "[SUCESSO] Protocolo vnc:// registrado com sucesso no Windows!" -ForegroundColor Green
Write-Host "Agora, qualquer clique em 'Acessar' no sistema abrira diretamente o UltraVNC." -ForegroundColor Green
