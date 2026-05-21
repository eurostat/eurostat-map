#!/usr/bin/env python3
"""
extract_json.py
Reads an Excel sheet and outputs one JSON file per value column,
each as a flat {NUTS: value} dict.

Usage: python extract_json.py
Input:  input/<INPUT_FILENAME>  (sheet SHEET_NAME)
Output: output/<ColumnName>.json  (one per value column)
"""

import json
import sys
from pathlib import Path

import pandas as pd

# --- Configuration -----------------------------------------------------------
INPUT_FILENAME = "RYB2026 CH03 Education and training-for maps.xlsx"
SHEET_NAME     = "CH03M2"
NUTS_COL       = "NUTS"
SKIP_COLS      = {"NUTS", "Region name","Flag","Year","MAPTYPE"}   # columns to exclude from output
# -----------------------------------------------------------------------------


def main():
    path = Path("input") / INPUT_FILENAME
    if not path.exists():
        sys.exit(f"ERROR: File not found at {path}")

    print(f"Input: {path}")
    print(f"Sheet: {SHEET_NAME}\n")

    # Read with header=None, then find the header row (contains "NUTS")
    df = pd.read_excel(str(path), sheet_name=SHEET_NAME, header=None)

    header_row = None
    for i, row in df.iterrows():
        vals = [str(v).strip() for v in row if pd.notna(v)]
        if "NUTS" in vals:
            header_row = i
            break

    if header_row is None:
        sys.exit("ERROR: Could not find a header row containing 'NUTS'.")

    df.columns = [str(v).strip() if pd.notna(v) else f"_col{i}" for i, v in enumerate(df.iloc[header_row])]
    df = df.iloc[header_row + 1:].reset_index(drop=True)
    df = df[df[NUTS_COL].notna()]
    # Keep only rows where NUTS looks like a real code (not stray text)
    df = df[df[NUTS_COL].astype(str).str.match(r"^[A-Z]{2}", na=False)]

    value_cols = [c for c in df.columns if c not in SKIP_COLS and not c.startswith("_")]
    print(f"NUTS codes: {len(df)}")
    print(f"Value columns: {value_cols}\n")

    out_dir = Path("output")
    out_dir.mkdir(parents=True, exist_ok=True)

    for col in value_cols:
        result = {}
        for _, row in df.iterrows():
            nuts = str(row[NUTS_COL]).strip()
            val = row[col]
            if pd.isna(val):
                result[nuts] = ":"
            elif val == ":":
                result[nuts] = ":"
            else:
                try:
                    result[nuts] = float(val)
                except (ValueError, TypeError):
                    result[nuts] = str(val)

        out_path = out_dir / f"{col}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False)

        print(f"Wrote {len(result)} entries to {out_path}")


if __name__ == "__main__":
    main()