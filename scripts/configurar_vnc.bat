<# :
@echo off
title Configurador de Acesso Remoto UltraVNC - Estoque TI
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& ([ScriptBlock]::Create((Get-Content '%~f0' -Raw)))"
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
exit /b
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Configurador de Acesso Remoto UltraVNC - Estoque TI" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Busca o executavel do UltraVNC Viewer
$vncPaths = @(
    "C:\Program Files (x86)\uvnc bvba\UltraVNC\vncviewer.exe",
    "C:\Program Files\uvnc bvba\UltraVNC\vncviewer.exe",
    "C:\Program Files\UltraVNC\vncviewer.exe",
    "C:\Program Files (x86)\UltraVNC\vncviewer.exe",
    "C:\UltraVNC\vncviewer.exe",
    "C:\uvnc\vncviewer.exe",
    "$env:ProgramFiles\uvnc bvba\UltraVNC\vncviewer.exe",
    "${env:ProgramFiles(x86)}\uvnc bvba\UltraVNC\vncviewer.exe",
    "$env:ProgramFiles\UltraVNC\vncviewer.exe",
    "${env:ProgramFiles(x86)}\UltraVNC\vncviewer.exe"
)

$vncExe = $null
foreach ($path in $vncPaths) {
    if ($path -and (Test-Path $path)) {
        $vncExe = $path
        break
    }
}

# Se nao achou nas pastas padrao, busca no registro
if (-not $vncExe) {
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\vncviewer.exe",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\vncviewer.exe",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\vncviewer.exe"
    )
    foreach ($rp in $regPaths) {
        if (Test-Path $rp) {
            $val = (Get-ItemProperty $rp -Name "(Default)" -ErrorAction SilentlyContinue)."(Default)"
            if ($val -and (Test-Path $val)) { $vncExe = $val; break }
        }
    }
}

if (-not $vncExe) {
    Write-Host "[ERRO] UltraVNC Viewer (vncviewer.exe) nao foi encontrado nesta maquina!" -ForegroundColor Red
    Write-Host "Para acessar outras maquinas a partir deste PC, e necessario que o UltraVNC Viewer esteja instalado." -ForegroundColor Yellow
    Write-Host ""
    $custom = Read-Host "Se o UltraVNC estiver instalado em outra pasta, digite o caminho completo do vncviewer.exe (ou Enter para sair)"
    if ($custom -and (Test-Path $custom)) {
        $vncExe = $custom
    } else {
        Write-Host ""
        Write-Host "[AVISO] Instale o UltraVNC Viewer nesta maquina e execute este configurador novamente." -ForegroundColor Red
        Exit 1
    }
}

Write-Host "[OK] UltraVNC Viewer localizado em: $vncExe" -ForegroundColor Green
Write-Host ""

# 2. Solicita as senhas interativamente (ficam salvas apenas localmente nesta maquina)
Write-Host "Configuracao de Senhas do UltraVNC:" -ForegroundColor Yellow
Write-Host "(As senhas serao salvas APENAS localmente neste computador)" -ForegroundColor Gray
$SenhaPadrao = Read-Host "Digite a senha padrao/primaria do UltraVNC da empresa"

while (-not $SenhaPadrao) {
    Write-Host "A senha padrao nao pode ser vazia!" -ForegroundColor Red
    $SenhaPadrao = Read-Host "Digite a senha padrao/primaria do UltraVNC da empresa"
}

$SenhaFallback = Read-Host "Digite a senha secundaria/fallback (opcional, pressione Enter para pular)"

# 3. Cria o launcher VBScript limpo e desanexado no AppData do usuario
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

# 4. Registra o protocolo vnc:// no Windows
$key = "HKCU:\Software\Classes\vnc"
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name "(Default)" -Value "URL:VNC Protocol"
Set-ItemProperty -Path $key -Name "URL Protocol" -Value ""

$cmdKey = "$key\shell\open\command"
New-Item -Path $cmdKey -Force | Out-Null
$regCmd = "wscript.exe `"$vbsPath`" `"%1`""
Set-ItemProperty -Path $cmdKey -Name "(Default)" -Value $regCmd

Write-Host "[OK] Protocolo vnc:// configurado no Registro do Windows!" -ForegroundColor Green

# 5. Aplica politicas para o navegador abrir sem pop-up de confirmacao
$policyJson = '[{\"allowed_origins\":[\"http://192.168.10.77\",\"http://localhost:5173\",\"http://127.0.0.1:5173\"],\"protocol\":\"vnc\"}]'
$hklmKeys = @(
    "HKLM:\SOFTWARE\Policies\Google\Chrome",
    "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave",
    "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
)
foreach ($hk in $hklmKeys) {
    try {
        if (-not (Test-Path $hk)) { New-Item -Path $hk -Force -ErrorAction SilentlyContinue | Out-Null }
        & reg.exe add ($hk.Replace("HKLM:\", "HKLM\")) /v AutoLaunchProtocolsFromOrigins /t REG_SZ /d $policyJson /f 2>$null | Out-Null
        & reg.exe add ($hk.Replace("HKLM:\", "HKLM\")) /v ExternalProtocolDialogShowAlwaysOpenCheckbox /t REG_DWORD /d 1 /f 2>$null | Out-Null
    } catch {}
}

# 6. Atualiza arquivos de preferencias locais dos navegadores
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

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "[SUCESSO] Configuracao concluida com sucesso!" -ForegroundColor Green
Write-Host "- Auto-login salvo APENAS localmente neste computador." -ForegroundColor White
Write-Host "- Protocolo vnc:// ativado no Windows." -ForegroundColor White
Write-Host "- Permissoes de navegador configuradas para o Estoque TI." -ForegroundColor White
Write-Host "- Logs disponiveis em: $env:LOCALAPPDATA\vnc_acesso.log" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
