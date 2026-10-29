# Script para associar o protocolo vnc:// ao UltraVNC Viewer no Windows
# Permite que o botão "Acessar" do Estoque TI abra a máquina diretamente no UltraVNC.
# As senhas são solicitadas na execução e salvas APENAS localmente na sua máquina (%LOCALAPPDATA%).
# Nenhuma senha fica gravada neste script ou no repositório.
# Não requer privilégios de Administrador (grava em HKCU e AppData).

param(
    [string]$SenhaPadrao,
    [string]$SenhaFallback
)

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

# Solicita as senhas de forma segura se nao forem passadas por parametro
if (-not $SenhaPadrao) {
    Write-Host ""
    Write-Host "Configuracao de Senhas do UltraVNC (ficarao salvas APENAS na sua maquina):" -ForegroundColor Yellow
    $pass1 = Read-Host -Prompt "Digite a senha padrao/primaria do UltraVNC" -AsSecureString
    $BSTR1 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass1)
    $SenhaPadrao = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR1)
}

if (-not $SenhaPadrao) {
    Write-Host "[ERRO] A senha padrao nao pode ser vazia." -ForegroundColor Red
    Exit 1
}

if (-not $SenhaFallback) {
    $pass2 = Read-Host -Prompt "Digite a senha de fallback/secundaria (opcional, Enter para pular)" -AsSecureString
    $BSTR2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass2)
    $SenhaFallback = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR2)
}

# 1. Cria o launcher VBScript limpo e confiavel no AppData do usuario local
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
        
        ' 1ª tentativa: senha padrao configurada localmente
        WshShell.Run """" & vncExe & """ " & cfgParam & " -password $SenhaPadrao", 1, False
        WScript.Sleep 1400
        
        ' Se falhou a autenticacao e houver senha de fallback, tenta a 2ª senha
        If WshShell.AppActivate("VncViewer Message Box") Or WshShell.AppActivate("VNC Authentication") Then
"@

if ($SenhaFallback) {
    $vbsContent += @"

            LogMsg "Senha primaria rejeitada para " & url & ". Tentando fallback..."
            WshShell.Run "taskkill /f /im vncviewer.exe", 0, True
            WScript.Sleep 300
            WshShell.Run """" & vncExe & """ " & cfgParam & " -password $SenhaFallback", 1, False
            WScript.Sleep 1400
            
            ' Se o fallback tambem falhar, abre sem senha para digitar manualmente
            If WshShell.AppActivate("VncViewer Message Box") Or WshShell.AppActivate("VNC Authentication") Then
                LogMsg "Senha fallback tambem rejeitada para " & url & ". Abrindo tela padrao sem senha..."
                WshShell.Run "taskkill /f /im vncviewer.exe", 0, True
                WScript.Sleep 300
                WshShell.Run """" & vncExe & """ " & cfgParam, 1, False
            Else
                LogMsg "Conectado com sucesso em " & url & " usando senha de fallback!"
            End If
"@
} else {
    $vbsContent += @"

            LogMsg "Senha primaria rejeitada para " & url & ". Abrindo tela padrao sem senha..."
            WshShell.Run "taskkill /f /im vncviewer.exe", 0, True
            WScript.Sleep 300
            WshShell.Run """" & vncExe & """ " & cfgParam, 1, False
"@
}

$vbsContent += @"

        Else
            LogMsg "Conectado com sucesso em " & url & " usando senha primaria!"
        End If
    End If
End If
"@

[IO.File]::WriteAllText($vbsPath, $vbsContent, [Text.Encoding]::ASCII)

# 2. Registra o protocolo vnc:// no Windows
$key = "HKCU:\Software\Classes\vnc"
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name "(Default)" -Value "URL:VNC Protocol"
Set-ItemProperty -Path $key -Name "URL Protocol" -Value ""

$cmdKey = "$key\shell\open\command"
New-Item -Path $cmdKey -Force | Out-Null
$regCmd = "wscript.exe `"$vbsPath`" `"%1`""
Set-ItemProperty -Path $cmdKey -Name "(Default)" -Value $regCmd

Write-Host "[OK] Protocolo vnc:// configurado no Registro do Windows!" -ForegroundColor Green

# 3. Importa politicas do navegador para tirar o pop-up (se o arquivo .reg estiver junto)
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ($scriptDir) {
    $regFile = Join-Path $scriptDir "desativar_popup_navegador.reg"
    if (Test-Path $regFile) {
        & reg.exe import $regFile 2>$null | Out-Null
    }
}

Write-Host "[INFO] Configurando navegadores para abrir direto sem pop-up de confirmacao..." -ForegroundColor Cyan
$browserDirs = @(
    "$env:LOCALAPPDATA\Google\Chrome\User Data",
    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data",
    "$env:LOCALAPPDATA\Microsoft\Edge\User Data"
)
$origins = @("http://192.168.10.77", "http://localhost:5173", "http://127.0.0.1:5173")

$count = 0
foreach ($bDir in $browserDirs) {
    if (Test-Path $bDir) {
        $prefFiles = Get-ChildItem -Path $bDir -Filter "Preferences" -Recurse -Depth 2 -ErrorAction SilentlyContinue
        foreach ($file in $prefFiles) {
            try {
                $raw = Get-Content $file.FullName -Raw -Encoding UTF8
                $json = $raw | ConvertFrom-Json
                if (-not $json.protocol_handler) {
                    $json | Add-Member -NotePropertyName "protocol_handler" -NotePropertyValue ([PSCustomObject]@{}) -Force
                }
                if (-not $json.protocol_handler.allowed_origin_protocol_pairs) {
                    $json.protocol_handler | Add-Member -NotePropertyName "allowed_origin_protocol_pairs" -NotePropertyValue ([PSCustomObject]@{}) -Force
                }
                foreach ($orig in $origins) {
                    if (-not $json.protocol_handler.allowed_origin_protocol_pairs.$orig) {
                        $json.protocol_handler.allowed_origin_protocol_pairs | Add-Member -NotePropertyName $orig -NotePropertyValue ([PSCustomObject]@{ vnc = $true }) -Force
                    } else {
                        $json.protocol_handler.allowed_origin_protocol_pairs.$orig | Add-Member -NotePropertyName "vnc" -NotePropertyValue $true -Force
                    }
                }
                $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
                $jsonStr = $json | ConvertTo-Json -Depth 32 -Compress
                [System.IO.File]::WriteAllText($file.FullName, $jsonStr, $utf8NoBom)
                $count++
            } catch {}
        }
    }
}

if ($count -gt 0) {
    Write-Host "[OK] $count perfil(is) de navegadores configurados para acesso direto 1-clique!" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "[SUCESSO] Configuracao concluida com sucesso!" -ForegroundColor Green
Write-Host "- Auto-login salvo APENAS localmente na sua maquina." -ForegroundColor White
Write-Host "- Perfis .vnc carregados automaticamente." -ForegroundColor White
Write-Host "- Pop-up de confirmacao desativado para o Estoque TI." -ForegroundColor White
Write-Host "- Logs gravados em: $env:LOCALAPPDATA\vnc_acesso.log" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
