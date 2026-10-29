@echo off
title Configurador de Acesso Remoto UltraVNC - Estoque TI
cd /d "%~dp0"

echo ==========================================================
echo Configurando Acesso Remoto UltraVNC - Estoque TI
echo ==========================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "habilitar_acesso_vnc.ps1"

if exist "desativar_popup_navegador.reg" (
    reg.exe import "desativar_popup_navegador.reg" >nul 2>&1
)

echo.
echo Concluido! Pode fechar esta janela.
pause

