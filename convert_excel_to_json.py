#!/usr/bin/env -S uv\ run
# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "openpyxl"]
# index = "https://pypi.org/simple"
# ///
"""Convert the internship placements Excel sheet in data/ to the JSON format used by
admin.html and the exported student page (see data/voorbeeld.json).

Usage:
    uv run convert_excel_to_json.py [input.xlsx] [output.json]

Defaults: the single .xlsx file in data/, written to data/stageplaatsen.json.
The output is gitignored; open it in admin.html with "JSON openen…". Records
without lat/lon get a warning in the admin page and can be geocoded there with
"Ontbrekende locaties ophalen".
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pandas as pd

# Dutch postcodes: 4 digits, optional space, 2 letters (e.g. 3011 AA, 4631CS).
# The first pattern handles the normal "1234 AB" and "1234AB" cases; the second
# also accepts a missing space ("1234  AB") without eating the first letters of
# a city name ("1234 Amsterdam" must stay a plaats, not "1234 AM").
POSTCODE_PATTERNS = (
    re.compile(r"\b(\d{4})\s?([A-Za-z]{2})(?![A-Za-z])"),
    re.compile(r"\b(\d{4})\s+([A-Za-z]{2})(?![A-Za-z])"),
)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+")
SEM_SEPARATORS = {"en", "and"}
# Leading words that introduce the specialisatie part, e.g. "ook ALK", "evt capita".
SPEC_PREFIX = re.compile(r"^(ook|evt|nb)\b[\s-]*", re.IGNORECASE)


def clean(value: object) -> str:
    """Normalize a cell to a plain single-spaced string ('' for empty cells)."""
    if value is None or pd.isna(value):
        return ""
    return re.sub(r"\s+", " ", str(value).replace("\xa0", " ")).strip()


def split_postcode(raw: str) -> tuple[str, str]:
    """Split a combined "Postcode Plaats" cell into (postcode, plaats)."""
    text = clean(raw)
    for pattern in POSTCODE_PATTERNS:
        match = pattern.search(text)
        if match:
            break
    else:
        return "", text
    postcode = f"{match.group(1)} {match.group(2).upper()}"
    plaats = re.sub(r"\s+", " ", text[: match.start()] + " " + text[match.end() :]).strip()
    return postcode, plaats


def split_contact(raw: str) -> tuple[str, str, int]:
    """Split a "Mailadres/telefoonnummer" cell into (mailadres, telefoonnummer, n_emails)."""
    text = clean(raw)
    emails = list(dict.fromkeys(e.strip(".") for e in EMAIL_RE.findall(text)))
    rest = re.sub(r"[()/,;]+", " ", EMAIL_RE.sub(" ", text))
    return " ".join(emails), re.sub(r"\s+", " ", rest).strip(), len(emails)


def clean_spec(text: str) -> str:
    text = text.strip(" \t.,:;-_'\"()“”‘’/–")
    return re.sub(r"\s+", " ", SPEC_PREFIX.sub("", text, count=1)).strip()


def parse_semesters_spec(raw: str) -> tuple[list[str], str]:
    """Split the free-text "Semesters/specialisaties" cell into (semesters, specialisatie).

    Handles "semester 1,2,3", "semester: 3&5", "Semester 2 en 5",
    "semester 2,3,5 evt capita", "alle semesters - nb eerste lijnspraktijk",
    and specialization-only notes such as "neurologie".
    """
    text = clean(raw)
    if not text:
        return [], ""
    if re.fullmatch(r"alle\s+semesters.*", text, re.IGNORECASE):
        rest = re.sub(r"^alle\s+semesters\b[\s:,-]*", "", text, flags=re.IGNORECASE)
        return [str(n) for n in range(1, 9)], clean_spec(rest)
    if not re.search(r"semester", text, re.IGNORECASE):
        return [], clean_spec(text)
    after = re.split(r"semesters?\s*:?", text, maxsplit=1, flags=re.IGNORECASE)[1]
    semesters: list[str] = []
    spec_parts: list[str] = []
    in_spec = False
    for token in re.split(r"[\s,;&]+", after):
        token = token.strip(".,-_'\"")
        if not token:
            continue
        if in_spec:
            spec_parts.append(token)
        elif re.fullmatch(r"[1-8]", token) and token not in semesters:
            semesters.append(token)
        elif token.lower() in SEM_SEPARATORS:
            continue  # "en"/"and" between semester numbers
        else:
            in_spec = True
            spec_parts.append(token)
    return semesters, clean_spec(" ".join(spec_parts))


def load_rows(path: Path) -> tuple[pd.DataFrame, dict[str, object], int]:
    """Read the first sheet and select source columns by header name.

    Returns (frame, {field: column label}, header row index).
    """
    raw = pd.read_excel(path, sheet_name=0, header=None, dtype=str)
    header_index = None
    for index, row in raw.head(15).iterrows():
        names = [str(v).lower() for v in row if pd.notna(v)]
        if any("stageplaats" in n for n in names) and any("postcode" in n for n in names):
            header_index = index
            break
    if header_index is None:
        raise SystemExit(f"No header row with 'Stageplaats'/'Postcode' found in {path}.")
    frame = pd.read_excel(path, sheet_name=0, header=header_index, dtype=str)

    columns: dict[str, object] = {}
    for col in frame.columns:
        name = re.sub(r"\s+", " ", str(col).lower()).strip()
        if name == "stageplaats":
            columns["stageplaats"] = col
        elif "begeleider" in name:
            columns["stagebegeleider"] = col
        elif "postcode" in name or name == "plaats":
            columns["location"] = col
        elif "mail" in name or "telefoon" in name:
            columns["contact"] = col
        elif "semester" in name or "specialisatie" in name:
            columns["sem_spec"] = col
    if "stageplaats" not in columns:
        raise SystemExit(f"Could not find a 'Stageplaats' column in {path}.")
    return frame, columns, header_index


def find_single_xlsx() -> Path:
    candidates = sorted(Path("data").glob("*.xlsx"))
    if len(candidates) != 1:
        names = ", ".join(str(c) for c in candidates) or "(none)"
        raise SystemExit(f"Expected exactly one .xlsx in data/ (found: {names}); pass the input file explicitly.")
    return candidates[0]


def convert(input_path: Path, output_path: Path) -> None:
    frame, columns, header_index = load_rows(input_path)

    def value(key: str, row: pd.Series) -> str:
        col = columns.get(key)
        return "" if col is None else clean(row[col])

    records: list[dict] = []
    warnings: list[str] = []
    for i, row in frame.iterrows():
        stageplaats = value("stageplaats", row)
        if not stageplaats:
            continue  # e.g. stray continuation rows without a placement name
        row_no = header_index + 2 + i  # 1-based Excel row number
        postcode, plaats = split_postcode(value("location", row))
        mail, tel, n_emails = split_contact(value("contact", row))
        semesters, specialisatie = parse_semesters_spec(value("sem_spec", row))
        if not postcode and plaats:
            warnings.append(f"row {row_no} ({stageplaats}): no Dutch postcode in '{plaats}'")
        if n_emails > 1:
            warnings.append(f"row {row_no} ({stageplaats}): multiple mail addresses: {mail}")
        records.append(
            {
                "stageplaats": stageplaats,
                "stagebegeleider": value("stagebegeleider", row),
                "postcode": postcode,
                "plaats": plaats,
                "mailadres": mail,
                "telefoonnummer": tel,
                "semesters": semesters,
                "specialisatie": specialisatie,
            }
        )
    if not records:
        raise SystemExit(f"No placement records found in {input_path}.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} records to {output_path}")
    for warning in warnings:
        print(f"  warning: {warning}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Convert the data/ Excel sheet to the tool's JSON format.")
    parser.add_argument(
        "input", nargs="?", type=Path, default=None, help="Excel file (default: the single .xlsx in data/)"
    )
    parser.add_argument(
        "output", nargs="?", type=Path, default=Path("data/stageplaatsen.json"), help="JSON output path"
    )
    args = parser.parse_args(argv)
    convert(args.input or find_single_xlsx(), args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
