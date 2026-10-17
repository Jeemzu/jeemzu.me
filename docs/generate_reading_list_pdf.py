#!/usr/bin/env python3
"""Render the Reading List Markdown guide to PDF with local Chromium."""

from __future__ import annotations

import html
import re
import shutil
import subprocess
import tempfile
from pathlib import Path


DOCS_DIR = Path(__file__).resolve().parent
SOURCE = DOCS_DIR / "reading-list-web-app-tutorial.md"
OUTPUT = DOCS_DIR / "reading-list-web-app-tutorial.pdf"

INLINE_PATTERN = re.compile(
    r"(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?://[^)]+\))"
)


def inline_markup(text: str) -> str:
    """Escape text and translate the Markdown inline forms used in this guide."""
    pieces: list[str] = []
    cursor = 0
    for match in INLINE_PATTERN.finditer(text):
        pieces.append(html.escape(text[cursor : match.start()]))
        token = match.group()
        if token.startswith("`"):
            pieces.append(f"<code>{html.escape(token[1:-1])}</code>")
        elif token.startswith("**"):
            pieces.append(f"<strong>{html.escape(token[2:-2])}</strong>")
        else:
            link = re.fullmatch(r"\[([^\]]+)\]\((https?://[^)]+)\)", token)
            assert link is not None
            pieces.append(
                f'<a href="{html.escape(link.group(2), quote=True)}">'
                f"{html.escape(link.group(1))}</a>"
            )
        cursor = match.end()
    pieces.append(html.escape(text[cursor:]))
    return "".join(pieces)


def markdown_to_html(markdown: str) -> str:
    """Convert the guide's small, intentionally supported Markdown subset."""
    lines = markdown.splitlines()
    result: list[str] = []
    paragraph: list[str] = []
    list_tag: str | None = None
    list_start: int | None = None
    in_code = False
    code_indent = 0
    code_lines: list[str] = []

    def flush_paragraph() -> None:
        if paragraph:
            result.append(f"<p>{inline_markup(' '.join(paragraph))}</p>")
            paragraph.clear()

    def close_list() -> None:
        nonlocal list_tag
        if list_tag:
            result.append(f"</{list_tag}>")
            list_tag = None

    for line in lines:
        fence = re.match(r"^([ \t]*)```", line)
        if fence:
            flush_paragraph()
            close_list()
            if in_code:
                result.append(f"<pre><code>{html.escape(chr(10).join(code_lines))}</code></pre>")
                code_lines.clear()
                in_code = False
            else:
                in_code = True
                code_indent = len(fence.group(1))
            continue

        if in_code:
            code_lines.append(line[code_indent:] if line.startswith(" " * code_indent) else line)
            continue

        heading = re.match(r"^(#{1,3})\s+(.+)$", line)
        bullet = re.match(r"^\s*[-*]\s+(.+)$", line)
        numbered = re.match(r"^\s*(\d+)\.\s+(.+)$", line)
        quote = re.match(r"^>\s?(.*)$", line)
        if not line.strip() or heading or bullet or numbered or quote or line == "---":
            flush_paragraph()
            if not bullet and not numbered:
                close_list()
            if heading:
                level = len(heading.group(1))
                result.append(
                    f"<h{level}>{inline_markup(heading.group(2))}</h{level}>"
                )
            elif bullet or numbered:
                tag = "ul" if bullet else "ol"
                if list_tag != tag:
                    close_list()
                    list_start = int(numbered.group(1)) if numbered else None
                    start_attr = f' start="{list_start}"' if list_start else ""
                    result.append(f"<{tag}{start_attr}>")
                    list_tag = tag
                item = bullet.group(1) if bullet else numbered.group(2)
                result.append(f"<li>{inline_markup(item)}</li>")
            elif quote:
                result.append(f"<blockquote>{inline_markup(quote.group(1))}</blockquote>")
            elif line == "---":
                result.append("<hr>")
            continue

        paragraph.append(line.strip())

    flush_paragraph()
    close_list()
    if in_code:
        raise ValueError("Unclosed fenced code block in the Markdown source")

    return "\n".join(result)


def find_browser() -> str:
    for candidate in ("chromium", "chromium-browser", "google-chrome", "chrome"):
        browser = shutil.which(candidate)
        if browser:
            return browser
    raise SystemExit(
        "Chromium or Google Chrome is required to generate the PDF. "
        "Install either browser and run this script again."
    )


def main() -> None:
    markdown = SOURCE.read_text(encoding="utf-8")
    body = markdown_to_html(markdown)
    document = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Build and Deploy a Small Web App</title>
  <style>
    @page {{
      size: A4;
      margin: 18mm 17mm 19mm;
      @bottom-right {{
        color: #64748b;
        content: counter(page);
        font: 9pt Arial, sans-serif;
      }}
    }}
    * {{ box-sizing: border-box; }}
    body {{
      color: #203047;
      font: 10.5pt/1.56 Arial, Helvetica, sans-serif;
      margin: 0;
    }}
    h1, h2, h3 {{ color: #10243c; line-height: 1.2; }}
    h1 {{
      border-bottom: 4px solid #2b9c91;
      font-size: 31pt;
      letter-spacing: -0.7pt;
      margin: 0 0 10pt;
      padding: 0 0 12pt;
    }}
    h1 + h2 {{
      color: #2b746f;
      font-size: 15pt;
      font-weight: normal;
      margin: 0 0 22pt;
    }}
    h2 {{
      border-bottom: 1px solid #dce5ed;
      font-size: 18pt;
      margin: 27pt 0 9pt;
      padding-bottom: 5pt;
      break-after: avoid;
    }}
    h3 {{
      font-size: 12.5pt;
      margin: 17pt 0 5pt;
      break-after: avoid;
    }}
    p {{ margin: 6pt 0 10pt; }}
    ul, ol {{ margin: 5pt 0 11pt; padding-left: 22pt; }}
    li {{ margin: 3pt 0; padding-left: 2pt; }}
    a {{ color: #176f78; text-decoration: none; }}
    strong {{ color: #172b45; }}
    code {{
      background: #edf3f6;
      border-radius: 3px;
      color: #174953;
      font: 9pt/1.4 "DejaVu Sans Mono", Consolas, monospace;
      padding: 1pt 3pt;
      overflow-wrap: anywhere;
    }}
    pre {{
      background: #f2f6f9;
      border: 1px solid #dce5ed;
      border-left: 3px solid #2b9c91;
      border-radius: 4px;
      margin: 8pt 0 12pt;
      padding: 9pt 10pt;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      break-inside: avoid;
    }}
    pre code {{
      background: none;
      color: #203047;
      font-size: 8pt;
      line-height: 1.45;
      padding: 0;
    }}
    blockquote {{
      background: #edf7f5;
      border-left: 3px solid #2b9c91;
      color: #225b5b;
      margin: 10pt 0;
      padding: 8pt 12pt;
    }}
    hr {{ border: 0; border-top: 1px solid #dce5ed; margin: 18pt 0; }}
    h2, h3, li, blockquote {{ orphans: 2; widows: 2; }}
  </style>
</head>
<body>{body}</body>
</html>
"""
    browser = find_browser()
    with tempfile.TemporaryDirectory(prefix="reading-list-pdf-") as temp_dir:
        html_path = Path(temp_dir) / "guide.html"
        html_path.write_text(document, encoding="utf-8")
        subprocess.run(
            [
                browser,
                "--headless",
                "--no-sandbox",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--print-to-pdf={OUTPUT}",
                html_path.as_uri(),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
