# Script para associar o protocolo vnc:// ao UltraVNC Viewer no Windows
# Permite que o botão "Acessar" do Estoque TI abra a máquina diretamente no UltraVNC.
# Suporta login automático com fallback de senhas (1º ARJArthi -> 2º monitor), perfis .vnc do usuário e logs.
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

# Cria o launcher VBScript limpo e confiavel
$vbsPath = "$env:LOCALAPPDATA\vnc_launcher.vbs"
$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
logPath = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\vnc_acesso.log"

Sub LogMsg(msg)
    On Error Resume Next
    Set f = fso.OpenTextFile(logPath, 8, True)
    f.WriteLine Now & " - " & msg
    f.Close
End Sub

Set args = WScript.Arguments
If args.Count > 0 Then
    url = args(0)
    url = Replace(url, "vnc://", "")
    url = Replace(url, "vnc:", "")
    url = Replace(url, "/", "")
    url = Trim(url)
    
    If url <> "" Then
        vncExe = "$vncExe"
        
        appData = WshShell.ExpandEnvironmentStrings("%APPDATA%")
        cfgHost = appData & "\UltraVNC\" & url & "-5900.vnc"
        cfgOpt = appData & "\UltraVNC\options.vnc"
        
        cfgParam = url & " -quickoption 1 -autoscaling"
        If fso.FileExists(cfgHost) Then
            cfgParam = "-config """ & cfgHost & """"
        ElseIf fso.FileExists(cfgOpt) Then
            cfgParam = "-config """ & cfgOpt & """ " & url
        End If
        
        LogMsg "Iniciando conexao para " & url & " (param: " & cfgParam & ")"
        
        ' 1ª tentativa: senha padrao ARJArthi com configuracao de video otimizada
        WshShell.Run """" & vncExe & """ " & cfgParam & " -password ARJArthi", 1, False
        WScript.Sleep 1400
        
        ' Se falhou a autenticacao, fecha e tenta a 2ª senha (monitor)
        If WshShell.AppActivate("VncViewer Message Box") Or WshShell.AppActivate("VNC Authentication") Then
            LogMsg "Senha ARJArthi rejeitada para " & url & ". Tentando fallback com monitor..."
            WshShell.Run "taskkill /f /im vncviewer.exe", 0, True
            WScript.Sleep 300
            WshShell.Run """" & vncExe & """ " & cfgParam & " -password monitor", 1, False
            WScript.Sleep 1400
            
            ' Se a 2ª senha tambem falhar, abre sem senha para digitar manualmente
            If WshShell.AppActivate("VncViewer Message Box") Or WshShell.AppActivate("VNC Authentication") Then
                LogMsg "Senha monitor tambem rejeitada para " & url & ". Abrindo tela padrao sem senha..."
                WshShell.Run "taskkill /f /im vncviewer.exe", 0, True
                WScript.Sleep 300
                WshShell.Run """" & vncExe & """ " & cfgParam, 1, False
            Else
                LogMsg "Conectado com sucesso em " & url & " usando senha monitor!"
            End If
        Else
            LogMsg "Conectado com sucesso em " & url & " usando senha ARJArthi!"
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
Write-Host "Carregamento automatico de perfis .vnc habilitado." -ForegroundColor Cyan
Write-Host "Logs salvos em: $env:LOCALAPPDATA\vnc_acesso.log" -ForegroundColor Cyan
