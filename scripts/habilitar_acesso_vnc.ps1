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

# Cria o launcher VBScript limpo (sem tela preta de prompt e sem colisao de aspas)
$vbsPath = "$env:LOCALAPPDATA\vnc_launcher.vbs"
$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
Set args = WScript.Arguments
If args.Count > 0 Then
    url = args(0)
    url = Replace(url, "vnc://", "")
    url = Replace(url, "vnc:", "")
    url = Replace(url, "/", "")
    url = Trim(url)
    WshShell.Run """$vncExe"" " & url, 1, False
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
Write-Host "Agora, qualquer clique em 'Acessar' abrira o UltraVNC diretamente no IP correto." -ForegroundColor Green
