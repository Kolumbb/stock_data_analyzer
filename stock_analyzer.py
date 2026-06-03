#!/usr/bin/env python3
"""
Analizator fundamentalny spółek giełdowych v2
Wczytuje raporty finansowe (PDF / HTML 10-K / 10-Q) i oblicza kluczowe wskaźniki.
Wymaga: pip install anthropic pdfplumber beautifulsoup4 rich lxml
"""

import os
import sys
import re
import json
import base64
import argparse
from pathlib import Path
from typing import Optional

try:
    import anthropic
    import pdfplumber
    from bs4 import BeautifulSoup
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich import box
    from rich.rule import Rule
except ImportError as e:
    print(f"Brakujący moduł: {e}")
    print("Uruchom: pip install anthropic pdfplumber beautifulsoup4 rich lxml")
    sys.exit(1)

console = Console()

# ─────────────────────────────────────────────────────────────────────────────
# Konfiguracja ekstrakcji
# ─────────────────────────────────────────────────────────────────────────────

# Sekcje które szukamy w dokumencie (do wyodrębnienia kontekstu)
FINANCIAL_KEYWORDS = [
    "consolidated statements of operations",
    "consolidated balance sheet",
    "consolidated statements of cash",
    "condensed consolidated statements",
    "stockholders equity", "stockholders' equity",
    "net revenue", "net sales", "total revenue",
    "total assets", "total liabilities",
    "gross profit", "operating income", "net income",
    "earnings per share", "diluted earnings",
    "current assets", "current liabilities",
    "long-term debt", "short-term debt", "total debt",
    "cash and cash equivalents", "short-term investments",
    "free cash flow", "operating cash flow",
    "research and development", "interest expense", "income tax",
    "accounts receivable", "inventories", "goodwill",
    "deferred tax", "retained earnings", "additional paid",
    "data center", "non-gaap", "segment",
    "przychody", "zysk", "aktywa", "zobowiązania",  # polskie raporty
]

# Nagłówki sekcji finansowych — punkt startu ekstrakcji
SECTION_ANCHORS = [
    "FINANCIAL STATEMENTS AND SUPPLEMENTARY DATA",
    "FINANCIAL STATEMENTS",
    "CONDENSED CONSOLIDATED FINANCIAL STATEMENTS",
    "CONSOLIDATED FINANCIAL STATEMENTS",
    "PART I. FINANCIAL INFORMATION",
    "PART I FINANCIAL INFORMATION",
    "Condensed Consolidated Statements of Operations",
    "Consolidated Statements of Operations",
    "SPRAWOZDANIE FINANSOWE",
    "SKONSOLIDOWANE SPRAWOZDANIE",
]

# Maks rozmiar tekstu przekazanego do API na jeden raport (znaki)
MAX_CHARS_PER_FILE = 150_000
# Okno kontekstu wokół każdego trafienia słowa kluczowego (linie)
CONTEXT_WINDOW = 60


# ─────────────────────────────────────────────────────────────────────────────
# System prompt
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Jesteś precyzyjnym analitykiem finansowym. Na podstawie dostarczonych raportów finansowych
oblicz i zwróć WYŁĄCZNIE obiekt JSON z wynikami analizy. Bez komentarzy, bez backtick-ów, tylko czysty JSON.

Jeśli dostarczone są dwa raporty (np. 10-K roczny + 10-Q kwartalny):
- Dla wskaźników bilansu użyj najnowszego (10-Q)
- Dla trendów r/r (revenue_yoy_pct itp.) porównaj najnowszy okres z analogicznym z poprzedniego roku
- W polu "period" podaj oba okresy np. "FY2025 + Q1 2026"

Format odpowiedzi:
{
  "company": "pełna nazwa spółki",
  "ticker": "ticker giełdowy jeśli znany",
  "period": "okres sprawozdawczy",
  "currency": "waluta (USD/EUR/PLN)",
  "income": {
    "revenue": liczba_w_mln_lub_null,
    "ebit": liczba_lub_null,
    "ebitda": liczba_lub_null,
    "net_income": liczba_lub_null,
    "gross_profit": liczba_lub_null,
    "operating_expenses": liczba_lub_null,
    "interest_expense": liczba_lub_null
  },
  "margins": {
    "gross_margin_pct": liczba_lub_null,
    "operating_margin_pct": liczba_lub_null,
    "net_margin_pct": liczba_lub_null,
    "ebitda_margin_pct": liczba_lub_null
  },
  "balance_sheet": {
    "total_assets": liczba_lub_null,
    "total_equity": liczba_lub_null,
    "total_debt": liczba_lub_null,
    "cash_and_equivalents": liczba_lub_null,
    "current_assets": liczba_lub_null,
    "current_liabilities": liczba_lub_null,
    "inventories": liczba_lub_null
  },
  "returns": {
    "roe_pct": liczba_lub_null,
    "roa_pct": liczba_lub_null,
    "roic_pct": liczba_lub_null
  },
  "leverage": {
    "debt_to_equity": liczba_lub_null,
    "debt_to_assets_pct": liczba_lub_null,
    "net_debt": liczba_lub_null,
    "interest_coverage": liczba_lub_null
  },
  "liquidity": {
    "current_ratio": liczba_lub_null,
    "quick_ratio": liczba_lub_null,
    "cash_ratio": liczba_lub_null
  },
  "cash_flow": {
    "operating_cf": liczba_lub_null,
    "free_cash_flow": liczba_lub_null,
    "fcf_margin_pct": liczba_lub_null
  },
  "per_share": {
    "eps_basic": liczba_lub_null,
    "eps_diluted": liczba_lub_null,
    "eps_non_gaap": liczba_lub_null
  },
  "scorecard": {
    "revenue_growth": liczba_1_do_10_lub_null,
    "profitability": liczba_1_do_10_lub_null,
    "balance_sheet": liczba_1_do_10_lub_null,
    "liquidity": liczba_1_do_10_lub_null,
    "competitive_position": liczba_1_do_10_lub_null,
    "risks": liczba_1_do_10_lub_null,
    "momentum": liczba_1_do_10_lub_null,
    "valuation": liczba_1_do_10_lub_null
  },
  "verdict": {
    "recommendation": "KUP lub AKUMULUJ lub TRZYMAJ lub SPRZEDAJ",
    "total_score": liczba_0_do_100,
    "summary": "3-4 zdania po polsku z oceną fundamentalną",
    "bulls": ["argument za 1", "argument za 2", "argument za 3", "argument za 4", "argument za 5"],
    "bears": ["ryzyko 1", "ryzyko 2", "ryzyko 3", "ryzyko 4", "ryzyko 5"],
    "horizon": {
      "short": "ocena krótkoterminowa 1 zdanie",
      "medium": "ocena średnioterminowa 1 zdanie",
      "long": "ocena długoterminowa 1 zdanie"
    },
    "entry_strategy": "1-2 zdania o strategii wejścia"
  },
  "yoy_changes": {
    "revenue_yoy_pct": liczba_lub_null,
    "net_income_yoy_pct": liczba_lub_null,
    "ebit_yoy_pct": liczba_lub_null
  },
  "missing_data": ["lista brakujących danych jeśli były niezbędne"]
}

Liczby finansowe podaj w milionach waluty. Procenty jako liczba (15.3 dla 15.3%).
Jeśli nie możesz obliczyć wskaźnika, wpisz null."""

SCORECARD_LABELS = {
    "revenue_growth": "Wzrost przychodów",
    "profitability": "Rentowność",
    "balance_sheet": "Bilans / zadłużenie",
    "liquidity": "Płynność",
    "competitive_position": "Pozycja konkurencyjna",
    "risks": "Ryzyka egzogeniczne",
    "momentum": "Momentum / katalizatory",
    "valuation": "Wycena",
}


# ─────────────────────────────────────────────────────────────────────────────
# Ekstrakcja tekstu z plików
# ─────────────────────────────────────────────────────────────────────────────

def _clean_lines(text: str) -> list[str]:
    """Usuwa puste i bardzo krótkie linie, normalizuje whitespace."""
    return [l.strip() for l in text.splitlines() if len(l.strip()) > 2]


def _extract_by_keywords(lines: list[str], max_chars: int) -> str:
    """
    Wyciąga linie zawierające słowa kluczowe + okno kontekstu wokół nich.
    Daje gęsty wynik skoncentrowany na danych finansowych.
    """
    important: set[int] = set()
    for i, line in enumerate(lines):
        ll = line.lower()
        if any(kw in ll for kw in FINANCIAL_KEYWORDS):
            for j in range(max(0, i - 3), min(len(lines), i + CONTEXT_WINDOW)):
                important.add(j)

    result = "\n".join(lines[i] for i in sorted(important))
    return result[:max_chars]


def _find_anchor(text: str) -> int:
    """Zwraca pozycję pierwszej sekcji finansowej lub 0."""
    for anchor in SECTION_ANCHORS:
        idx = text.find(anchor)
        if idx > 0:
            return max(0, idx - 200)
    return 0


def read_html(path: Path, label: str = "") -> str:
    """
    Inteligentna ekstrakcja z pliku HTML (10-K / 10-Q z SEC EDGAR).

    Strategia:
    1. Usuń XBRL hidden + script/style/head
    2. Znajdź kotwicę sekcji finansowych (np. "FINANCIAL STATEMENTS")
    3. Od kotwicy wyodrębnij linie z słowami kluczowymi + kontekstem
    4. Ogranicz do MAX_CHARS_PER_FILE
    """
    size_kb = path.stat().st_size // 1024
    console.log(f"[dim]Wczytuję HTML: {path.name} ({size_kb} KB)[/dim]")

    html = path.read_text(encoding="utf-8", errors="ignore")

    soup = BeautifulSoup(html, "html.parser")

    # Usuń sekcję XBRL (display:none) — zawiera tylko metadane, nie liczby
    for tag in soup.find_all(style=re.compile(r"display\s*:\s*none", re.I)):
        tag.decompose()
    for tag in soup(["script", "style", "head"]):
        tag.decompose()

    raw_text = soup.get_text(separator="\n", strip=True)
    lines = _clean_lines(raw_text)
    full_text = "\n".join(lines)

    # Znajdź punkt startowy (sekcja sprawozdań finansowych)
    anchor = _find_anchor(full_text)
    working_text = full_text[anchor:]
    working_lines = _clean_lines(working_text)

    extracted = _extract_by_keywords(working_lines, MAX_CHARS_PER_FILE)

    console.log(
        f"[dim]  → wyodrębniono {len(extracted):,} / {len(full_text):,} znaków "
        f"({len(extracted)*100//max(len(full_text),1)}%)[/dim]"
    )
    return extracted


def read_pdf(path: Path) -> tuple[str, bytes]:
    """Wyciąga tekst i raw bytes z PDF."""
    size_kb = path.stat().st_size // 1024
    console.log(f"[dim]Wczytuję PDF: {path.name} ({size_kb} KB)[/dim]")

    text_parts: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)

    raw_bytes = path.read_bytes()
    full_text = "\n".join(text_parts)

    # Dla PDF-ów też stosujemy ekstrakcję słów kluczowych jeśli plik jest duży
    if len(full_text) > MAX_CHARS_PER_FILE:
        lines = _clean_lines(full_text)
        full_text = _extract_by_keywords(lines, MAX_CHARS_PER_FILE)
        console.log(f"[dim]  → PDF przycięty do {len(full_text):,} znaków[/dim]")

    return full_text, raw_bytes


# ─────────────────────────────────────────────────────────────────────────────
# Budowanie zapytania do API
# ─────────────────────────────────────────────────────────────────────────────

def build_messages(files: dict[str, Path], ticker: str, currency: str) -> list[dict]:
    """Buduje listę messages dla Anthropic API."""
    content: list[dict] = []

    for label, path in files.items():
        suffix = path.suffix.lower()

        if suffix == ".pdf":
            text, raw_bytes = read_pdf(path)
            # Próbuj wysłać jako dokument PDF (native); fallback do tekstu
            try:
                b64 = base64.b64encode(raw_bytes).decode()
                content.append({
                    "type": "document",
                    "source": {"type": "base64", "media_type": "application/pdf", "data": b64},
                    "title": f"{label.upper()}: {path.name}",
                })
            except Exception:
                content.append({
                    "type": "text",
                    "text": f"=== {label.upper()}: {path.name} ===\n\n{text}",
                })

        elif suffix in (".html", ".htm"):
            text = read_html(path, label)
            content.append({
                "type": "text",
                "text": f"=== {label.upper()} ({path.name}) ===\n\n{text}",
            })

        else:
            # Pliki tekstowe / CSV / XLSX (fallback)
            text = path.read_text(encoding="utf-8", errors="ignore")
            if len(text) > MAX_CHARS_PER_FILE:
                text = text[:MAX_CHARS_PER_FILE] + "\n... [PRZYCIĘTO]"
            content.append({
                "type": "text",
                "text": f"=== {label.upper()}: {path.name} ===\n\n{text}",
            })

    # Instrukcja końcowa
    report_types = list(files.keys())
    instruction = (
        f"Ticker/spółka: {ticker}\n"
        f"Waluta raportowania: {currency}\n"
        f"Dostarczone raporty: {', '.join(report_types)}\n\n"
        f"Przeanalizuj powyższe raporty i zwróć wyniki w formacie JSON "
        f"zgodnie z instrukcją systemową. Liczby w milionach {currency}.\n"
    )
    if "annual" in report_types and ("quarterly" in report_types or "semi" in report_types):
        instruction += (
            "Dla wskaźników bilansu (aktywa, dług, płynność) użyj najnowszego raportu kwartalnego. "
            "Dla trendów r/r porównaj najnowszy kwartał z analogicznym kwartałem rok wcześniej.\n"
        )
    if "earnings" in report_types:
        instruction += (
            "Raport 'earnings' to prezentacja wyników (earnings slides) lub press release — "
            "użyj go do uzupełnienia danych Non-GAAP (EPS non-GAAP, non-GAAP marże, guidance).\n"
        )

    content.append({"type": "text", "text": instruction})
    return [{"role": "user", "content": content}]


# ─────────────────────────────────────────────────────────────────────────────
# Wywołanie API
# ─────────────────────────────────────────────────────────────────────────────

def analyze(files: dict[str, Path], ticker: str, currency: str, api_key: str) -> dict:
    """Wysyła dokumenty do Claude i zwraca sparsowany JSON."""
    client = anthropic.Anthropic(api_key=api_key)

    console.log("[bold]Wysyłam do Claude API (claude-opus-4-6)...[/bold]")
    messages = build_messages(files, ticker, currency)

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    raw = response.content[0].text.strip()

    # Usuń ewentualne backticki
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        console.print(f"[red]Błąd parsowania JSON: {e}[/red]")
        console.print(f"[dim]Surowa odpowiedź (pierwsze 500 znaków):\n{raw[:500]}[/dim]")
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Formatowanie wyników
# ─────────────────────────────────────────────────────────────────────────────

def fmt_mln(val: Optional[float], currency: str = "USD") -> str:
    if val is None:
        return "[dim]–[/dim]"
    abs_val = abs(val)
    sign = "-" if val < 0 else ""
    if abs_val >= 1_000_000:
        return f"{sign}{abs_val/1_000_000:.2f} bld {currency}"
    if abs_val >= 1_000:
        return f"{sign}{abs_val/1_000:.1f} mln {currency}"
    return f"{sign}{abs_val:.0f} tys {currency}"


def fmt_pct(val: Optional[float]) -> str:
    if val is None:
        return "[dim]–[/dim]"
    return f"{val:.1f}%"


def fmt_x(val: Optional[float], decimals: int = 2) -> str:
    if val is None:
        return "[dim]–[/dim]"
    return f"{val:.{decimals}f}x"


def score_color(s: Optional[float]) -> str:
    if s is None:
        return "dim"
    if s >= 8:
        return "green"
    if s >= 6:
        return "yellow"
    if s >= 4:
        return "orange3"
    return "red"


def score_bar(s: Optional[float], width: int = 10) -> str:
    if s is None:
        return "─" * width
    filled = round((s / 10) * width)
    return "█" * filled + "░" * (width - filled)


def yoy_str(pct: Optional[float]) -> str:
    if pct is None:
        return "[dim]–[/dim]"
    col = "green" if pct > 0 else "red"
    sign = "+" if pct > 0 else ""
    return f"[{col}]{sign}{pct:.1f}%[/{col}]"


def lev_badge(val: Optional[float], good, bad, reverse: bool = False) -> str:
    if val is None:
        return "[dim]–[/dim]"
    if not reverse:
        if val <= good:  return "[green]✓ niskie[/green]"
        if val <= bad:   return "[yellow]⚠ średnie[/yellow]"
        return "[red]✗ wysokie[/red]"
    else:
        if val >= good:  return "[green]✓ silne[/green]"
        if val >= bad:   return "[yellow]⚠ ok[/yellow]"
        return "[red]✗ słabe[/red]"


def liq_badge(val: Optional[float], good: float, warn: float) -> str:
    if val is None:
        return "[dim]–[/dim]"
    if val >= good:  return "[green]✓ dobra[/green]"
    if val >= warn:  return "[yellow]⚠ ok[/yellow]"
    return "[red]✗ niska[/red]"


def print_results(data: dict) -> None:
    c       = data.get("currency", "USD")
    company = data.get("company", "Spółka")
    period  = data.get("period", "–")
    verdict = data.get("verdict", {})
    rec     = verdict.get("recommendation", "–")

    rec_colors = {"KUP": "bold green", "AKUMULUJ": "green",
                  "TRZYMAJ": "yellow", "SPRZEDAJ": "bold red"}
    rc = rec_colors.get(rec, "white")

    console.print()
    console.print(Rule(f"[bold]{company}[/bold]  ·  {period}  ·  [{rc}]{rec}[/{rc}]"))
    console.print()

    # Ocena ogólna
    score = verdict.get("total_score")
    if score is not None:
        sc = "green" if score >= 70 else "yellow" if score >= 50 else "red"
        console.print(Panel(
            f"[bold {sc}]{score}/100[/bold {sc}]  ·  [{rc}]{rec}[/{rc}]\n\n"
            f"[dim]{verdict.get('summary', '')}[/dim]",
            title="Ocena fundamentalna", border_style="dim"
        ))

    # P&L
    inc = data.get("income", {})
    yoy = data.get("yoy_changes", {})

    t = Table(title="Wyniki finansowe (P&L)", box=box.SIMPLE_HEAVY, title_style="bold")
    t.add_column("Wskaźnik", style="dim", width=28)
    t.add_column("Wartość", justify="right", width=22)
    t.add_column("Zmiana r/r", justify="right", width=14)

    t.add_row("Przychody ze sprzedaży", fmt_mln(inc.get("revenue"), c),
              yoy_str(yoy.get("revenue_yoy_pct")))
    t.add_row("Zysk brutto",            fmt_mln(inc.get("gross_profit"), c), "")
    t.add_row("Zysk operacyjny (EBIT)", fmt_mln(inc.get("ebit"), c),
              yoy_str(yoy.get("ebit_yoy_pct")))
    t.add_row("EBITDA",                 fmt_mln(inc.get("ebitda"), c), "")
    t.add_row("Zysk netto",             fmt_mln(inc.get("net_income"), c),
              yoy_str(yoy.get("net_income_yoy_pct")))
    console.print(t)

    # Marże
    mar = data.get("margins", {})
    cf  = data.get("cash_flow", {})

    t2 = Table(title="Marże", box=box.SIMPLE_HEAVY, title_style="bold")
    t2.add_column("Wskaźnik", style="dim", width=28)
    t2.add_column("Wartość", justify="right", width=22)

    t2.add_row("Marża brutto",     fmt_pct(mar.get("gross_margin_pct")))
    t2.add_row("Marża operacyjna", fmt_pct(mar.get("operating_margin_pct")))
    t2.add_row("Marża netto",      fmt_pct(mar.get("net_margin_pct")))
    t2.add_row("Marża EBITDA",     fmt_pct(mar.get("ebitda_margin_pct")))
    t2.add_row("Marża FCF",        fmt_pct(cf.get("fcf_margin_pct")))
    console.print(t2)

    # Rentowność i EPS
    ret = data.get("returns", {})
    ps  = data.get("per_share", {})

    t3 = Table(title="Rentowność i EPS", box=box.SIMPLE_HEAVY, title_style="bold")
    t3.add_column("Wskaźnik", style="dim", width=28)
    t3.add_column("Wartość", justify="right", width=22)

    t3.add_row("ROE",              fmt_pct(ret.get("roe_pct")))
    t3.add_row("ROA",              fmt_pct(ret.get("roa_pct")))
    t3.add_row("ROIC (est.)",      fmt_pct(ret.get("roic_pct")))
    t3.add_row("EPS podstawowy",   str(ps.get("eps_basic")  or "–"))
    t3.add_row("EPS rozcieńczony", str(ps.get("eps_diluted") or "–"))
    t3.add_row("EPS non-GAAP",     str(ps.get("eps_non_gaap") or "–"))
    console.print(t3)

    # Zadłużenie
    lev = data.get("leverage", {})
    bs  = data.get("balance_sheet", {})

    nd = lev.get("net_debt")
    nd_badge = ("[green]✓ ujemny[/green]" if nd and nd < 0
                else "[yellow]⚠ dodatni[/yellow]" if nd is not None
                else "[dim]–[/dim]")

    t4 = Table(title="Zadłużenie", box=box.SIMPLE_HEAVY, title_style="bold")
    t4.add_column("Wskaźnik", style="dim", width=28)
    t4.add_column("Wartość", justify="right", width=22)
    t4.add_column("Ocena", justify="center", width=14)

    t4.add_row("Dług całkowity",      fmt_mln(bs.get("total_debt"), c), "")
    t4.add_row("Dług netto",          fmt_mln(lev.get("net_debt"), c), nd_badge)
    t4.add_row("Dług / Kapitał własny", fmt_x(lev.get("debt_to_equity")),
               lev_badge(lev.get("debt_to_equity"), 0.5, 1.5))
    t4.add_row("Dług / Aktywa",       fmt_pct(lev.get("debt_to_assets_pct")),
               lev_badge(lev.get("debt_to_assets_pct"), 30, 60))
    t4.add_row("Pokrycie odsetek",    fmt_x(lev.get("interest_coverage")),
               lev_badge(lev.get("interest_coverage"), 5, 2, reverse=True))
    console.print(t4)

    # Płynność
    liq = data.get("liquidity", {})
    wc = ((bs.get("current_assets") or 0) - (bs.get("current_liabilities") or 0)) or None

    t5 = Table(title="Płynność finansowa", box=box.SIMPLE_HEAVY, title_style="bold")
    t5.add_column("Wskaźnik", style="dim", width=28)
    t5.add_column("Wartość", justify="right", width=22)
    t5.add_column("Ocena", justify="center", width=14)

    t5.add_row("Current ratio",   fmt_x(liq.get("current_ratio")),
               liq_badge(liq.get("current_ratio"), 2.0, 1.2))
    t5.add_row("Quick ratio",     fmt_x(liq.get("quick_ratio")),
               liq_badge(liq.get("quick_ratio"), 1.5, 0.8))
    t5.add_row("Cash ratio",      fmt_x(liq.get("cash_ratio")),
               liq_badge(liq.get("cash_ratio"), 1.0, 0.4))
    t5.add_row("Aktywa bieżące",  fmt_mln(bs.get("current_assets"), c), "")
    t5.add_row("Zobow. bieżące",  fmt_mln(bs.get("current_liabilities"), c), "")
    t5.add_row("Kapitał obrotowy", fmt_mln(wc, c), "")
    console.print(t5)

    # Scorecard
    sc_data = data.get("scorecard", {})
    if sc_data:
        console.print()
        console.print(Rule("Scorecard inwestycyjny"))
        console.print()
        for key, label in SCORECARD_LABELS.items():
            s   = sc_data.get(key)
            col = score_color(s)
            bar = score_bar(s)
            s_str = f"{s}/10" if s is not None else "–"
            console.print(f"  [{col}]{bar}[/{col}]  [{col}]{s_str:>5}[/{col}]  {label}")
        if score is not None:
            console.print(f"\n  [bold]Wynik łączny: {score}/100[/bold]")

    # Za i przeciw
    bulls = verdict.get("bulls", [])
    bears = verdict.get("bears", [])
    if bulls or bears:
        console.print()
        console.print(Rule("Argumenty za i przeciw"))
        console.print()
        t6 = Table(box=box.SIMPLE, show_header=True, expand=True)
        t6.add_column("✓  Za inwestycją", style="green", ratio=1)
        t6.add_column("✗  Ryzyka",        style="red",   ratio=1)
        for i in range(max(len(bulls), len(bears))):
            b = f"+ {bulls[i]}" if i < len(bulls) else ""
            r = f"– {bears[i]}" if i < len(bears) else ""
            t6.add_row(b, r)
        console.print(t6)

    # Horyzont
    horizon = verdict.get("horizon", {})
    if horizon:
        console.print()
        th = Table(box=box.SIMPLE_HEAVY, title="Horyzont inwestycyjny", title_style="bold")
        th.add_column("Krótki (<1 rok)",   ratio=1)
        th.add_column("Średni (1–3 lata)", ratio=1)
        th.add_column("Długi (>3 lata)",   ratio=1)
        th.add_row(horizon.get("short", "–"),
                   horizon.get("medium", "–"),
                   horizon.get("long", "–"))
        console.print(th)

    # Strategia wejścia
    entry = verdict.get("entry_strategy")
    if entry:
        console.print()
        console.print(Panel(f"[bold]Strategia wejścia:[/bold] {entry}",
                            border_style="dim", padding=(0, 1)))

    # Brakujące dane
    missing = data.get("missing_data", [])
    if missing:
        console.print()
        console.print(f"[dim]Brakujące dane: {', '.join(missing)}[/dim]")

    console.print()
    console.print(Rule("[dim]Nie stanowi porady inwestycyjnej[/dim]"))
    console.print()


# ─────────────────────────────────────────────────────────────────────────────
# Zapis wyników
# ─────────────────────────────────────────────────────────────────────────────

def save_json(data: dict, output: Path) -> None:
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    console.print(f"[dim]Wyniki JSON zapisane: {output}[/dim]")


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analizator fundamentalny spółek giełdowych v2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Przykłady użycia:
  python stock_analyzer.py --annual 10k.htm --ticker AMD
  python stock_analyzer.py --annual 10k.htm --quarterly 10q.htm --ticker AMD --currency USD
  python stock_analyzer.py --annual 10k.htm --quarterly 10q.htm --earnings AMD_Q1_slides.pdf --ticker AMD
  python stock_analyzer.py --quarterly raport_kwartalny.pdf --ticker PKO --currency PLN
  python stock_analyzer.py --annual 10k.htm --quarterly 10q.htm --ticker AAPL --output wyniki.json

Obsługiwane formaty: PDF, HTML/HTM (10-K/10-Q z SEC EDGAR lub inne)
Klucz API: ustaw zmienną środowiskową ANTHROPIC_API_KEY lub użyj --api-key

Co podawać:
  --annual    Raport roczny (10-K z SEC lub odpowiednik)
  --quarterly Raport kwartalny (10-Q z SEC lub odpowiednik)
  --semi      Raport półroczny (dla spółek europejskich, GPW itp.)
  --earnings  Earnings slides lub press release — zawiera Non-GAAP EPS,
              guidance i komentarz zarządu; uzupełnia dane z 10-Q/10-K
        """
    )
    parser.add_argument("--annual",    type=Path, help="Raport roczny          np. 10-K.htm, raport_roczny.pdf")
    parser.add_argument("--quarterly", type=Path, help="Raport kwartalny       np. 10-Q.htm, raport_Q1.pdf")
    parser.add_argument("--semi",      type=Path, help="Raport półroczny       np. raport_H1.pdf (opcjonalne)")
    parser.add_argument("--earnings",  type=Path, help="Earnings slides / press release  np. AMD_Q1_earnings.pdf")
    parser.add_argument("--ticker",    default="Spółka", help="Ticker lub nazwa spółki (domyślnie: Spółka)")
    parser.add_argument("--currency",  default="USD",    help="Waluta raportowania (domyślnie: USD)")
    parser.add_argument("--output",    type=Path, help="Ścieżka pliku wyjściowego JSON")
    parser.add_argument("--api-key",   help="Klucz API Anthropic (alternatywnie: ANTHROPIC_API_KEY)")

    args = parser.parse_args()

    # Zbierz pliki
    files: dict[str, Path] = {}
    for label, path in [
        ("annual",    args.annual),
        ("quarterly", args.quarterly),
        ("semi",      args.semi),
        ("earnings",  args.earnings),
    ]:
        if path:
            if not path.exists():
                console.print(f"[red]Plik nie istnieje: {path}[/red]")
                sys.exit(1)
            files[label] = path

    if not files:
        console.print("[red]Podaj co najmniej jeden plik raportu.[/red]")
        parser.print_help()
        sys.exit(1)

    api_key = args.api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        console.print("[red]Brakuje klucza API.[/red]\n"
                      "Ustaw: export ANTHROPIC_API_KEY='sk-ant-...'  lub użyj --api-key")
        sys.exit(1)

    console.print()
    console.print(Panel(
        f"[bold]Analizator fundamentalny v2[/bold]\n"
        f"Spółka : [bold]{args.ticker}[/bold]  |  Waluta: {args.currency}\n"
        f"Raporty: {', '.join(f'{k}: {v.name}' for k, v in files.items())}",
        border_style="blue"
    ))
    console.print()

    with console.status("[bold blue]Analizuję raporty finansowe..."):
        data = analyze(files, args.ticker, args.currency, api_key)

    print_results(data)

    out = args.output or Path(f"{args.ticker}_analysis.json")
    save_json(data, out)


if __name__ == "__main__":
    main()
