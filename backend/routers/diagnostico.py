import asyncio
import ipaddress
import json
import logging
import re
import sys
from typing import AsyncGenerator, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

logger = logging.getLogger("diagnostico")

router = APIRouter(prefix="/diagnostico", tags=["Diagnóstico de Rede"])


def _validar_ip(ip_str: str) -> str:
    """Valida estritamente se o endereço fornecido é um IPv4 ou IPv6 válido."""
    ip_limpo = (ip_str or "").strip()
    if not ip_limpo:
        raise HTTPException(status_code=400, detail="O endereço IP não pode ser vazio.")
    try:
        ip_obj = ipaddress.ip_address(ip_limpo)
        return str(ip_obj)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Endereço IP inválido: '{ip_limpo}'. Informe um IPv4 ou IPv6 válido.",
        )


def _formatar_linha_estilo_windows(linha: str, ip_alvo: str) -> Optional[str]:
    """Formata a saída de ping (mesmo vindo de Linux/Docker) no formato clássico do Windows CMD."""
    linha_limpa = linha.strip()
    if not linha_limpa:
        return None

    # Se já for formato do Windows nativo
    if "Resposta de" in linha_limpa or "Disparando" in linha_limpa or "Esgotado" in linha_limpa:
        return linha_limpa

    # Cabeçalho inicial do Linux: "PING 192.168.10.108 (192.168.10.108) 56(84) bytes of data."
    if linha_limpa.startswith("PING "):
        return f"Disparando {ip_alvo} com 32 bytes de dados:"

    # Linha de resposta do Linux:
    # "64 bytes from 192.168.10.108: icmp_seq=1 ttl=63 time=3.75 ms"
    # ou "64 bytes from cb-05 (192.168.10.108): icmp_seq=1 ttl=63 time=3.75 ms"
    match_reply = re.search(
        r"(\d+)\s+bytes from\s+([^:]+):\s+(?:icmp_seq=\d+\s+)?ttl=(\d+)\s+time=([\d.]+)\s*ms",
        linha_limpa,
        re.IGNORECASE,
    )
    if match_reply:
        origem = match_reply.group(2).strip()
        if "(" in origem and ")" in origem:
            origem = origem.split("(")[-1].split(")")[0]
        ttl = match_reply.group(3)
        time_ms = float(match_reply.group(4))

        if time_ms < 1.0:
            str_tempo = "tempo<1ms"
        else:
            str_tempo = f"tempo={int(round(time_ms))}ms"

        return f"Resposta de {origem}: bytes=32 {str_tempo} TTL={ttl}"

    # Host inacessível
    if "destination host unreachable" in linha_limpa.lower():
        match_unreach = re.search(r"from\s+([^\s:]+)", linha_limpa, re.IGNORECASE)
        origem = match_unreach.group(1) if match_unreach else ip_alvo
        return f"Resposta de {origem}: Host de destino inacessível."

    # Timeout
    if "request timeout" in linha_limpa.lower() or "no answer" in linha_limpa.lower():
        return "Esgotado o tempo limite do pedido."

    # Estatísticas de encerramento do Linux
    if "ping statistics" in linha_limpa.lower():
        return f"\nEstatísticas do Ping para {ip_alvo}:"
    if "packets transmitted" in linha_limpa.lower():
        m_stats = re.search(
            r"(\d+)\s+packets transmitted,\s+(\d+)\s+(?:packets\s+)?received,\s+([\d.]+)%\s+packet loss",
            linha_limpa,
            re.IGNORECASE,
        )
        if m_stats:
            env = m_stats.group(1)
            rec = m_stats.group(2)
            perda = m_stats.group(3)
            perdidos = int(env) - int(rec)
            return f"    Pacotes: Enviados = {env}, Recebidos = {rec}, Perdidos = {perdidos} ({perda}% de perda)"
        return linha_limpa

    if "rtt min/avg/max" in linha_limpa.lower():
        m_rtt = re.search(r"=\s*([\d.]+)/([\d.]+)/([\d.]+)", linha_limpa)
        if m_rtt:
            min_ms = int(round(float(m_rtt.group(1))))
            med_ms = int(round(float(m_rtt.group(2))))
            max_ms = int(round(float(m_rtt.group(3))))
            return f"Aproximar um número redondo de vezes em milissegundos:\n    Mínimo = {min_ms}ms, Máximo = {max_ms}ms, Média = {med_ms}ms"
        return linha_limpa

    return linha_limpa


async def _gerar_stream_ping(ip: str, contagem: Optional[int] = None) -> AsyncGenerator[str, None]:
    """Executa o comando ping como subprocess assíncrono e faz stream linha por linha via SSE formatado em padrão Windows CMD."""
    is_windows = sys.platform == "win32"
    if contagem and contagem > 0:
        if is_windows:
            cmd = ["ping", "-n", str(contagem), ip]
        else:
            cmd = ["ping", "-c", str(contagem), "-W", "2", ip]
    else:
        if is_windows:
            cmd = ["ping", "-t", ip]
        else:
            cmd = ["ping", ip]

    process = None
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        assert process.stdout is not None
        while True:
            line_bytes = await process.stdout.readline()
            if not line_bytes:
                break
            encoding = "cp850" if is_windows else "utf-8"
            linha_bruta = line_bytes.decode(encoding, errors="replace").rstrip("\r\n")
            if linha_bruta:
                linha_formatada = _formatar_linha_estilo_windows(linha_bruta, ip)
                if linha_formatada:
                    yield f"data: {json.dumps({'linha': linha_formatada, 'status': 'executando'})}\n\n"

        codigo = await process.wait()
        yield f"data: {json.dumps({'linha': 'Ping finalizado.', 'status': 'concluido', 'codigo': codigo})}\n\n"

    except FileNotFoundError:
        yield f"data: {json.dumps({'linha': 'Erro: comando ping não encontrado no servidor.', 'status': 'erro'})}\n\n"
    except asyncio.CancelledError:
        if process:
            try:
                process.terminate()
                await process.wait()
            except Exception:
                pass
        raise
    except Exception as exc:
        logger.error(f"Erro ao executar ping para {ip}: {exc}", exc_info=True)
        yield f"data: {json.dumps({'linha': f'Erro durante a execução: {str(exc)}', 'status': 'erro'})}\n\n"


@router.get("/ping")
async def ping_equipamento(
    ip: str = Query(..., description="Endereço IP para teste de conectividade"),
    contagem: Optional[int] = Query(None, ge=1, le=500, description="Quantidade de pacotes (omita para contínuo)"),
):
    """
    Executa ping para o IP informado e retorna a saída em tempo real
    via Server-Sent Events (SSE). Se contagem for omitida, roda continuamente até ser parado.
    """
    ip_validado = _validar_ip(ip)

    return StreamingResponse(
        _gerar_stream_ping(ip_validado, contagem),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/ping-rapido")
async def ping_rapido(
    ip: str = Query(..., description="Endereço IP para teste rápido"),
):
    """
    Executa um ping rápido (1 pacote) para checar se o host está respondendo.
    Retorna JSON simples com online: True/False e tempo estimado.
    """
    ip_validado = _validar_ip(ip)
    is_windows = sys.platform == "win32"

    if is_windows:
        cmd = ["ping", "-n", "1", "-w", "1500", ip_validado]
    else:
        cmd = ["ping", "-c", "1", "-W", "2", ip_validado]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await proc.communicate()
        codigo = proc.returncode

        saida = stdout.decode("cp850" if is_windows else "utf-8", errors="replace")
        online = codigo == 0

        # Tenta extrair tempo se respondeu
        tempo_ms = None
        for parte in saida.split():
            if "time=" in parte.lower() or "tempo=" in parte.lower() or "tempo<" in parte.lower():
                try:
                    num = "".join(ch for ch in parte if ch.isdigit() or ch == ".")
                    if num:
                        tempo_ms = float(num)
                except ValueError:
                    pass

        return {
            "ip": ip_validado,
            "online": online,
            "codigo": codigo,
            "tempo_ms": tempo_ms,
        }
    except FileNotFoundError:
        return {"ip": ip_validado, "online": False, "erro": "Comando ping não disponível no servidor."}
    except Exception as exc:
        return {"ip": ip_validado, "online": False, "erro": str(exc)}
