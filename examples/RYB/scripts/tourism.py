#!/usr/bin/env python3
"""
tourism.py
Splits a Eurostat tourism Excel file into DOMESTIC.csv and INTERNATIONAL.csv.

Sheet structure:
  Row 0:   Global header (NUTS, Region name, Total, January ... December)
  Row 1:   "All guests (million nights spent)"       <- section marker
  Row 2+:  data rows
  Row 271: "Domestic guests (million nights spent)"  <- section marker
  Row 272+ data rows  (Total column is blank)
  Row 541: "International guests (million nights spent)" <- section marker
  Row 542+ data rows  (Total column is blank)

Data rows continue until the next section marker.
':' values are preserved as-is.

Usage: python tourism.py
Input:  input/<INPUT_FILENAME>  (sheet SHEET_NAME)
Output: output/INTERNATIONAL.csv
        output/DOMESTIC.csv
"""

import sys
from pathlib import Path

import openpyxl
import pandas as pd

# --- Configuration -----------------------------------------------------------
INPUT_FILENAME = "RYB2026 CH10 Tourism-for maps.xlsx"
SHEET_NAME     = "CH10M6"
# -----------------------------------------------------------------------------

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]
OUTPUT_COLS = ["NUTS", "Region name", "Total"] + MONTHS

SECTION_MARKERS = {
    "international": "international guests",
    "domestic":      "domestic guests",
}


def find_sections(df: pd.DataFrame) -> dict[str, int]:
    """Locate section marker rows by scanning column A. Returns key -> row index."""
    col_a = df.iloc[:, 0].astype(str).str.strip().str.lower()
    results = {}
    for key, marker in SECTION_MARKERS.items():
        matches = col_a[col_a.str.startswith(marker)]
        if not matches.empty:
            results[key] = matches.index[0]
            print(f"  Found '{key}' section at row {matches.index[0]}")

    missing = set(SECTION_MARKERS) - set(results)
    if missing:
        raise ValueError(f"Could not find sections: {missing}")
    return results


def extract_section(df: pd.DataFrame, section_row: int, col_headers: list[str]) -> pd.DataFrame:
    """
    Extract data rows starting immediately after the section marker row.
    Stops at the next section marker or end of data.
    Columns are mapped positionally from col_headers.
    """
    all_markers = {"all guests", "domestic guests", "international guests"}
    data_rows = []

    for i in range(section_row + 1, len(df)):
        row = df.iloc[i]
        first_val = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""

        if not first_val or first_val.lower().startswith(tuple(all_markers)):
            break

        record = {}
        for col_idx, col_name in enumerate(col_headers):
            if col_idx >= len(row):
                record[col_name] = ""
            else:
                val = row.iloc[col_idx]
                record[col_name] = "" if pd.isna(val) else val

        data_rows.append(record)

    return pd.DataFrame(data_rows, columns=col_headers)


def main():
    path = Path("input") / INPUT_FILENAME
    if not path.exists():
        sys.exit(f"ERROR: File not found at {path}")

    print(f"Input: {path}")
    print(f"Sheet: {SHEET_NAME}\n")

    df = pd.read_excel(str(path), sheet_name=SHEET_NAME, header=None)
    print(f"Loaded {len(df)} rows.\n")

    # Row 0 is the global column header — read it to get exact column names
    header_row = [str(v).strip() if pd.notna(v) else "" for v in df.iloc[0]]
    # Trim to OUTPUT_COLS length (15 cols: NUTS + Region name + Total + 12 months)
    col_headers = header_row[:len(OUTPUT_COLS)]
    # Patch any blank headers with our canonical names as fallback
    for i, canonical in enumerate(OUTPUT_COLS):
        if not col_headers[i]:
            col_headers[i] = canonical
    print(f"Columns: {col_headers}\n")

    sections = find_sections(df)

    out_dir = Path("output")
    out_dir.mkdir(parents=True, exist_ok=True)

    for key, csv_name in [("international", "INTERNATIONAL.csv"), ("domestic", "DOMESTIC.csv")]:
        section_df = extract_section(df, sections[key], col_headers)
        out_path = out_dir / csv_name
        section_df.to_csv(out_path, index=False, encoding="utf-8-sig")
        print(f"Wrote {len(section_df)} rows to {out_path}")


if __name__ == "__main__":
    main()