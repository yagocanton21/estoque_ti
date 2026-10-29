"""Conversões puras usadas pelo painel de backups: datas, tamanhos, durações e status.

Os formatos vêm de dois lugares diferentes: o log do Cobian Reflector (lido pelo agente
PowerShell, em português ou inglês) e o relatório HTTP nativo do Duplicati (.NET).
"""
import re
from datetime import datetime, timedelta, timezone


def agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def fuso_de(offset: str) -> timezone:
    """'-03:00' -> timezone. Valor inválido cai em -03:00."""
    m = re.fullmatch(r"([+-])(\d{2}):?(\d{2})", str(offset or ""))
    if not m:
        return timezone(timedelta(hours=-3))
    sinal = -1 if m.group(1) == "-" else 1
    return timezone(sinal * timedelta(hours=int(m.group(2)), minutes=int(m.group(3))))


def iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def para_banco(dt: datetime | None) -> datetime | None:
    """Datetime com fuso -> UTC sem fuso (formato gravado no SQLite)."""
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def do_banco(dt: datetime | None) -> datetime | None:
    """UTC sem fuso lido do SQLite -> datetime com fuso UTC."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def ler_data(valor, fuso: timezone) -> datetime | None:
    """ISO8601 (com/sem fuso), epoch (s/ms), 'AAAA-MM-DD HH:MM[:SS]'.
    Sem fuso = horário local (fuso). Datas < 2000 (ex.: o '0001-01-01T00:00:00'
    do Duplicati) viram None."""
    if valor is None or valor == "":
        return None
    if isinstance(valor, (int, float)):
        ts = float(valor) / (1000.0 if float(valor) > 1e12 else 1.0)
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    s = str(valor).strip()
    if re.fullmatch(r"\d{10,13}", s):
        return ler_data(int(s), fuso)
    s = s.replace("Z", "+00:00")
    s = re.sub(r"\.(\d{6})\d+", r".\1", s)  # fração de 7 dígitos (.NET) -> 6
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            dt = datetime.strptime(s, fmt)
        except ValueError:
            continue
        if dt.year < 2000:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=fuso)
    return None


def bytes_legivel(n) -> str:
    try:
        n = float(n)
    except (TypeError, ValueError):
        return "—"
    if n <= 0:
        return "0 B"
    for unidade in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unidade == "TB":
            return f"{int(n)} B" if unidade == "B" else f"{n:.1f} {unidade}"
        n /= 1024.0
    return "—"


def duracao_legivel(segundos) -> str:
    try:
        s = int(float(segundos))
    except (TypeError, ValueError):
        return "—"
    if s <= 0:
        return "—"
    h, resto = divmod(s, 3600)
    m, seg = divmod(resto, 60)
    return f"{h}h{m:02d}m" if h else (f"{m}m{seg:02d}s" if m else f"{seg}s")


def tempo_atras(dt: datetime | None) -> str:
    if not dt:
        return "nunca"
    delta = max(0.0, (agora_utc() - dt).total_seconds())
    if delta < 90:
        return "agora"
    if delta < 3600:
        return f"{int(delta // 60)} min atrás"
    if delta < 172800:
        return f"{int(delta // 3600)} h atrás"
    return f"{int(delta // 86400)} d atrás"


def primeira_chave(d, *nomes, padrao=None):
    """Primeira chave existente e não vazia, sem diferenciar maiúsculas."""
    if not isinstance(d, dict):
        return padrao
    baixo = {str(k).lower(): v for k, v in d.items()}
    for n in nomes:
        v = baixo.get(n.lower())
        if v not in (None, ""):
            return v
    return padrao


def inteiro(valor, padrao=0) -> int:
    if isinstance(valor, bool):
        return int(valor)
    if isinstance(valor, (list, tuple)):
        return len(valor)
    try:
        if valor is None or valor == "":
            return padrao
        return int(float(str(valor).replace(",", ".")))
    except (TypeError, ValueError):
        return padrao


TAMANHO_RE = re.compile(r"([\d.,]+)\s*(bytes?|B|KB|MB|GB|TB)\b", re.I)
UNIDADES = {"b": 1, "byte": 1, "bytes": 1, "kb": 1024, "mb": 1024 ** 2, "gb": 1024 ** 3, "tb": 1024 ** 4}


def tamanho_em_bytes(valor) -> int:
    """13245000000 | '12,34 GB' (pt) | '12.34 GB' (en) | '1.234 bytes'."""
    if valor is None or valor == "":
        return 0
    if isinstance(valor, (int, float)):
        return int(valor)
    s = str(valor).strip()
    m = TAMANHO_RE.search(s)
    if not m:
        digitos = re.sub(r"[^\d]", "", s)
        return int(digitos) if digitos else 0
    num, unidade = m.group(1).strip(".,"), m.group(2).lower()
    if "," in num and "." in num:       # o último separador é o decimal
        num = (num.replace(",", "") if num.rfind(".") > num.rfind(",")
               else num.replace(".", "").replace(",", "."))
    elif "," in num:                    # "4,24 GB" (pt) | "1,024 bytes" (milhar en)
        num = (num.replace(",", "") if unidade.startswith("b") and re.fullmatch(r"\d{1,3}(,\d{3})+", num)
               else num.replace(",", "."))
    elif unidade.startswith("b") and re.fullmatch(r"\d{1,3}(\.\d{3})+", num):
        num = num.replace(".", "")      # "1.234 bytes" = milhar pt
    try:
        return int(float(num) * UNIDADES.get(unidade, 1))
    except ValueError:
        return 0


def duracao_em_segundos(valor) -> int:
    """'00:14:09.1234567' | '1.02:03:04' | segundos."""
    if valor in (None, ""):
        return 0
    m = re.fullmatch(r"(?:(\d+)\.)?(\d{1,2}):(\d{2}):(\d{2})(?:\.\d+)?", str(valor).strip())
    if m:
        d, h, mi, s = (int(x or 0) for x in m.groups())
        return d * 86400 + h * 3600 + mi * 60 + s
    return inteiro(valor)


def normalizar_maquina(nome) -> str:
    return str(nome or "").strip().upper() or "DESCONHECIDO"


def limpar_apelido(valor) -> str:
    return re.sub(r"[\x00-\x1f\x7f]", "", str(valor or "")).strip()[:60]


MAPA_STATUS = {
    "success": "ok", "ok": "ok", "completed": "ok",
    "warning": "aviso", "warnings": "aviso", "aviso": "aviso",
    "error": "erro", "errors": "erro", "failed": "erro", "fatal": "erro", "erro": "erro",
    "falha": "erro", "interrompido": "erro", "interrupted": "erro", "aborted": "erro",
}


def normalizar_status(valor, erros=0, avisos=0) -> str:
    s = MAPA_STATUS.get(str(valor or "").strip().lower())
    if s:
        if s == "ok" and erros:
            return "erro"
        if s == "ok" and avisos:
            return "aviso"
        return s
    if erros:
        return "erro"
    if avisos:
        return "aviso"
    return "desconhecido"


def duplicati_texto(texto: str) -> dict:
    """Relatório no formato texto do Duplicati (quando faltou o 'Json'): extrai o básico."""
    out: dict = {"Data": {}, "Extra": {}}
    for k in ("ParsedResult", "BeginTime", "EndTime", "Duration", "ExaminedFiles", "AddedFiles",
              "SizeOfAddedFiles", "ErrorsActualLength", "WarningsActualLength"):
        m = re.search(rf"^\s*{k}\s*:\s*(.+?)\s*$", texto, re.M)
        if m:
            out["Data"][k] = m.group(1)
    m = re.search(r"report for (.+?)\s*$", texto, re.M | re.I)
    if m:
        out["Extra"]["backup-name"] = m.group(1)
    return out


DIAS_SEMANA = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
               "seg": 0, "ter": 1, "qua": 2, "qui": 3, "sex": 4, "sab": 5, "dom": 6}


def dias_ignorados(entrada: dict) -> frozenset:
    """skip_days da regra (['sat','sun'] ou ['sab','dom']) -> {5, 6}."""
    return frozenset(DIAS_SEMANA[str(d).strip().lower()[:3]] for d in entrada.get("skip_days", [])
                     if str(d).strip().lower()[:3] in DIAS_SEMANA)


def horas_ignoradas(inicio: datetime, fim: datetime, dias: frozenset, fuso: timezone) -> float:
    """Horas entre inicio e fim que caem em dias da semana a ignorar (fuso local)."""
    if not dias or fim <= inicio:
        return 0.0
    s, e = inicio.astimezone(fuso), fim.astimezone(fuso)
    dia = s.replace(hour=0, minute=0, second=0, microsecond=0)
    total = 0.0
    while dia < e:
        proximo = dia + timedelta(days=1)
        if dia.weekday() in dias:
            total += (min(proximo, e) - max(dia, s)).total_seconds() / 3600
        dia = proximo
    return total
