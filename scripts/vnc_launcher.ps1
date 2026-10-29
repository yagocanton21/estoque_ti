param([string]$rawUrl)

if (-not $rawUrl) { exit }

# Limpa o prefixo do protocolo
$ip = $rawUrl -replace '(?i)^vnc://', '' -replace '(?i)^vnc:', '' -replace '/', ''
$ip = $ip.Trim()

if (-not $ip) { exit }

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

if (-not $vncExe) { exit 1 }

$code = @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class WinHelper {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumThreadWindows(int dwThreadId, EnumWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    public static bool HasAuthFailure(int processId) {
        try {
            var proc = System.Diagnostics.Process.GetProcessById(processId);
            bool failed = false;
            foreach (System.Diagnostics.ProcessThread thread in proc.Threads) {
                EnumThreadWindows(thread.Id, (hWnd, lParam) => {
                    StringBuilder sb = new StringBuilder(256);
                    GetWindowText(hWnd, sb, 256);
                    string t = sb.ToString();
                    if (t.Contains("Message Box") || t.Contains("Authentication failed") || t.Contains("VNC Authentication")) {
                        failed = true;
                        return false;
                    }
                    return true;
                }, IntPtr.Zero);
                if (failed) return true;
            }
        } catch { }
        return false;
    }
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

$passwords = @("ARJArthi", "monitor")
$connected = $false

foreach ($pass in $passwords) {
    $p = Start-Process -FilePath $vncExe -ArgumentList "$ip -password $pass" -PassThru
    
    # Monitora para verificar se conectou ou se a senha foi rejeitada
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 100
        
        if ($p.HasExited) {
            break
        }
        
        # Se apareceu caixa de erro/autenticação, fecha e tenta a próxima senha
        if ([WinHelper]::HasAuthFailure($p.Id)) {
            try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}
            break
        }
        
        # Se o título da janela mudou (conectou com sucesso na máquina remota)
        $proc = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
        if ($proc -and $proc.MainWindowTitle -and $proc.MainWindowTitle -notlike "VNC Viewer Status*") {
            $connected = $true
            break
        }
    }
    
    if ($connected) {
        break
    }
}

# Se nenhuma das duas senhas conectou, abre normal para o usuário ver o erro ou digitar
if (-not $connected) {
    Start-Process -FilePath $vncExe -ArgumentList $ip
}
