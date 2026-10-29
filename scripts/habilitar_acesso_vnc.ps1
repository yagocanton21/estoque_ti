# Script para associar o protocolo vnc:// ao UltraVNC Viewer no Windows
# Permite que o botão "Acessar" do Estoque TI abra a máquina diretamente no UltraVNC.
# Suporta login automático com fallback de senhas (1º ARJArthi -> 2º monitor).
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

# Cria o launcher VBScript limpo e confiavel (sem tela preta de prompt e com auto-login e fallback)
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
    
    If url <> "" Then
        vncExe = "$vncExe"
        
        ' 1ª tentativa: senha padrao ARJArthi
        Set exec1 = WshShell.Exec("""" & vncExe & """ " & url & " -password ARJArthi")
        WScript.Sleep 1400
        
        ' Se falhou a autenticacao, fecha e tenta a 2ª senha (monitor)
        If WshShell.AppActivate("VncViewer Message Box") Or WshShell.AppActivate("VNC Authentication") Then
            exec1.Terminate
            Set exec2 = WshShell.Exec("""" & vncExe & """ " & url & " -password monitor")
            WScript.Sleep 1400
            
            ' Se a 2ª senha tambem falhar, abre sem senha para digitar manualmente
            If WshShell.AppActivate("VncViewer Message Box") Or WshShell.AppActivate("VNC Authentication") Then
                exec2.Terminate
                WshShell.Run """" & vncExe & """ " & url, 1, False
            End If
        End If
    End If
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
Write-Host "Auto-login ativo: 1º ARJArthi -> 2º monitor." -ForegroundColor Green
Write-Host "Agora, qualquer clique em 'Acessar' entrara diretamente na maquina correta." -ForegroundColor Green
