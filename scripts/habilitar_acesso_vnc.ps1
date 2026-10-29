# Script para associar o protocolo vnc:// ao UltraVNC Viewer no Windows
# Permite que o botão "Acessar" do Estoque TI abra a máquina diretamente no UltraVNC.
# Suporta login automático com fallback de senhas (ARJArthi -> monitor).
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

# Copia o script PowerShell do launcher inteligente para o AppData
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourcePs1 = Join-Path $scriptDir "vnc_launcher.ps1"
$targetPs1 = "$env:LOCALAPPDATA\vnc_launcher.ps1"

if (Test-Path $sourcePs1) {
    Copy-Item $sourcePs1 $targetPs1 -Force
} else {
    Write-Host "[AVISO] Arquivo $sourcePs1 nao encontrado localmente." -ForegroundColor Yellow
}

# Cria o launcher VBScript limpo (sem tela preta de prompt)
$vbsPath = "$env:LOCALAPPDATA\vnc_launcher.vbs"
$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
Set args = WScript.Arguments
If args.Count > 0 Then
    appData = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
    psScript = appData & "\vnc_launcher.ps1"
    cmd = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & psScript & """ """ & args(0) & """"
    WshShell.Run cmd, 0, False
End If
"@

[IO.File]::WriteAllText($vbsPath, $vbsContent, [Text.Encoding]::ASCII)

$key = "HKCU:\Software\Classes\vnc"
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name "(Default)" -Value "URL:VNC Protocol"
Set-ItemProperty -Path $key -Name "URL Protocol" -Value ""

$cmdKey = "$key\shell\open\command"
New-Item -Path $cmdKey -Force | Out-Null
$regCmd = "wscript.exe `"$vbsPath`" `"%1`""
Set-ItemProperty -Path $cmdKey -Name "(Default)" -Value $regCmd

Write-Host "[SUCESSO] Protocolo vnc:// configurado com sucesso no Windows!" -ForegroundColor Green
Write-Host "Auto-login ativo com fallback: 1º ARJArthi -> 2º monitor." -ForegroundColor Green
Write-Host "Agora, qualquer clique em 'Acessar' entrara diretamente na maquina." -ForegroundColor Green
