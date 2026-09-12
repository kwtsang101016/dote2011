#!/usr/bin/env python3
"""Convert knowledge/*.md to upload-ready HTML for the AI tutor platform."""

from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE = ROOT / "knowledge"
OUTPUT = ROOT / "html"

# Generate ALL knowledge HTML files. Never drop a lecture from this list just
# because the AI platform only uploads 5 files — instructor picks uploads manually.
# See knowledge/README.md (do not delete lecture HTML; do not auto-archive).
FILES: list[tuple[str, str | None]] = [
    ("course-admin.md", None),
    ("introduction.md", "introduction"),
    ("descriptive-statistics.md", "descriptive-statistics"),
    ("probability.md", "probability"),
    ("discrete-distributions.md", "discrete-distributions"),
    ("faq-and-index.md", None),
    ("older-lectures.md", None),
]

PAGE_HEADING = re.compile(r"^## Page (\d{2}) · (.+)$")
HEADING2 = re.compile(r"^## (.+)$")
HEADING3 = re.compile(r"^### (.+)$")
INLINE = re.compile(r"(\*\*.+?\*\*|\*.+?\*|`[^`]+`)")
TABLE_SEP = re.compile(r"^\|[-:\s|]+\|$")


def inline_format(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        token = match.group(0)
        if token.startswith("**") and token.endswith("**"):
            return f"<strong>{html.escape(token[2:-2])}</strong>"
        if token.startswith("*") and token.endswith("*"):
            return f"<em>{html.escape(token[1:-1])}</em>"
        if token.startswith("`") and token.endswith("`"):
            return f"<code>{html.escape(token[1:-1])}</code>"
        return html.escape(token)

    return INLINE.sub(repl, text)


def parse_table(lines: list[str], start: int) -> tuple[str, int]:
    rows: list[list[str]] = []
    i = start
    while i < len(lines) and lines[i].strip().startswith("|"):
        if TABLE_SEP.match(lines[i].strip()):
            i += 1
            continue
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        rows.append(cells)
        i += 1

    if not rows:
        return "", start

    header = rows[0]
    body = rows[1:]
    parts = ["<table>", "<thead><tr>"]
    for cell in header:
        parts.append(f"<th>{inline_format(cell)}</th>")
    parts.append("</tr></thead>")
    if body:
        parts.append("<tbody>")
        for row in body:
            parts.append("<tr>")
            for cell in row:
                parts.append(f"<td>{inline_format(cell)}</td>")
            parts.append("</tr>")
        parts.append("</tbody>")
    parts.append("</table>")
    return "".join(parts), i


def md_to_html(md: str, lecture_slug: str | None) -> str:
    lines = md.splitlines()
    body: list[str] = []
    i = 0
    in_section = False

    def close_section() -> None:
        nonlocal in_section
        if in_section:
            body.append("</section>")
            in_section = False

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped == "---":
            close_section()
            body.append("<hr />")
            i += 1
            continue

        if stripped.startswith("# ") and not stripped.startswith("## "):
            close_section()
            body.append(f"<h1>{inline_format(stripped[2:])}</h1>")
            i += 1
            continue

        page_match = PAGE_HEADING.match(stripped)
        if page_match:
            close_section()
            page_num = page_match.group(1)
            title = page_match.group(2)
            section_id = f"{lecture_slug}-page-{page_num}" if lecture_slug else f"page-{page_num}"
            data_lecture = f' data-lecture="{lecture_slug}"' if lecture_slug else ""
            body.append(
                f'<section id="{section_id}"{data_lecture} data-page="{int(page_num)}">'
                f"<h2>Page {page_num} · {inline_format(title)}</h2>"
            )
            in_section = True
            i += 1
            continue

        h2_match = HEADING2.match(stripped)
        if h2_match and not PAGE_HEADING.match(stripped):
            close_section()
            body.append(f"<h2>{inline_format(h2_match.group(1))}</h2>")
            i += 1
            continue

        h3_match = HEADING3.match(stripped)
        if h3_match:
            body.append(f"<h3>{inline_format(h3_match.group(1))}</h3>")
            i += 1
            continue

        if stripped.startswith("|"):
            table_html, i = parse_table(lines, i)
            body.append(table_html)
            continue

        if re.match(r"^\d+\.\s", stripped):
            items: list[str] = []
            while i < len(lines) and re.match(r"^\d+\.\s", lines[i].strip()):
                items.append(f"<li>{inline_format(re.sub(r'^\d+\.\s', '', lines[i].strip()))}</li>")
                i += 1
            body.append(f"<ol>{''.join(items)}</ol>")
            continue

        if stripped.startswith("- "):
            items = []
            while i < len(lines) and lines[i].strip().startswith("- "):
                items.append(f"<li>{inline_format(lines[i].strip()[2:])}</li>")
                i += 1
            body.append(f"<ul>{''.join(items)}</ul>")
            continue

        if stripped == "":
            i += 1
            continue

        body.append(f"<p>{inline_format(stripped)}</p>")
        i += 1

    close_section()

    title_match = re.search(r"^# (.+)$", md, re.MULTILINE)
    doc_title = title_match.group(1) if title_match else "DOTE2011G Knowledge"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{html.escape(doc_title)}</title>
</head>
<body>
<article class="dote2011-knowledge">
{chr(10).join(body)}
</article>
</body>
</html>
"""


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for filename, slug in FILES:
        src = KNOWLEDGE / filename
        dst = OUTPUT / filename.replace(".md", ".html")
        md = src.read_text(encoding="utf-8")
        html_out = md_to_html(md, slug)
        dst.write_text(html_out, encoding="utf-8")
        print(f"Wrote {dst.relative_to(ROOT)} ({len(html_out):,} chars)")


if __name__ == "__main__":
    main()
