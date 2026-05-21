#!/usr/bin/env python3
"""
merge_ports.py
Merges port statistics from an Excel file with lat/lon coordinates from a GeoJSON file.

Excel columns expected (sheet CH11M05):
  NUTS | Region name | Total (million tonnes) | Inward (%) | Outward (%)

GeoJSON feature properties expected:
  UNLOCODE | CNTR_ID | PORT_NAME | POINT_X | POINT_Y

Matching logic:
  Excel NUTS code like "BE_0BE003" -> extract suffix after "_0" -> "BE003"
  This should match the UNLOCODE in the GeoJSON (e.g. "BE003")
"""

import json
import re
import sys
from pathlib import Path

import openpyxl
import pandas as pd


def extract_unlocode_from_nuts(nuts: str) -> str | None:
    """
    Extract the UNLOCODE-like suffix from a NUTS code.
    e.g. "BE_0BE003" → "BE003"
         "ES_2ESSCT" → "ESSCT"
    Strips the country prefix and the _<digit> separator.
    """
    match = re.search(r"_\d(.+)$", nuts)
    if match:
        return match.group(1)
    parts = nuts.split("_")
    if len(parts) >= 2:
        return parts[-1]
    return None


def load_excel(path: str, sheet_name: str = "CH11M5") -> pd.DataFrame:
    """Load the Excel sheet containing port statistics."""
    wb = openpyxl.load_workbook(path, read_only=True)
    print(f"Sheets found: {wb.sheetnames}")

    df = pd.read_excel(path, sheet_name=sheet_name, header=None)

    # Find the row containing "NUTS" to use as header
    header_row = None
    for i, row in df.iterrows():
        row_vals = [str(v).strip() for v in row if pd.notna(v)]
        if any("NUTS" in v for v in row_vals):
            header_row = i
            break

    if header_row is None:
        raise ValueError(f"Could not find a header row with 'NUTS' in sheet '{sheet_name}'.")

    df.columns = df.iloc[header_row]
    df = df.iloc[header_row + 1:].reset_index(drop=True)
    df = df.dropna(subset=[df.columns[0]])
    print(f"  -> Using sheet '{sheet_name}', header at row {header_row}")
    print(f"  -> Columns: {list(df.columns)}")
    return df


def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename columns to canonical names regardless of exact header text."""
    rename_map = {}
    for col in df.columns:
        col_str = str(col).strip().lower()
        if "nuts" in col_str:
            rename_map[col] = "nuts"
        elif "region" in col_str or "name" in col_str:
            rename_map[col] = "region_name"
        elif "total" in col_str:
            rename_map[col] = "total_mt"
        elif "inward" in col_str or "disembarked" in col_str:
            rename_map[col] = "inward_pct"
        elif "outward" in col_str or "embarked" in col_str:
            rename_map[col] = "outward_pct"
    df = df.rename(columns=rename_map)
    required = {"nuts", "region_name", "total_mt", "inward_pct", "outward_pct"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Could not map these required columns: {missing}\nActual columns: {list(df.columns)}")
    return df


def load_geojson(path: str) -> dict:
    """Load GeoJSON and return a dict keyed by UNLOCODE."""
    with open(path, encoding="utf-8") as f:
        gj = json.load(f)
    index = {}
    for feature in gj.get("features", []):
        props = feature.get("properties", {})
        unlocode = props.get("UNLOCODE")
        if unlocode:
            index[unlocode] = props
    print(f"Loaded {len(index)} features from GeoJSON.")
    return index


def build_output(df: pd.DataFrame, geo_index: dict) -> list[dict]:
    records = []
    unmatched = []

    for _, row in df.iterrows():
        nuts = str(row["nuts"]).strip()
        region_name = str(row["region_name"]).strip()

        try:
            total_mt = float(row["total_mt"])
        except (ValueError, TypeError):
            print(f"  Skipping '{nuts}': invalid total value '{row['total_mt']}'")
            continue
        try:
            inward_pct = float(row["inward_pct"])
            outward_pct = float(row["outward_pct"])
        except (ValueError, TypeError):
            print(f"  Skipping '{nuts}': invalid percentage values")
            continue

        # Convert million tonnes -> tonnes, then split by percentage
        total_tonnes = round(total_mt * 1_000_000)
        inward_tonnes = round(total_tonnes * inward_pct / 100)
        outward_tonnes = round(total_tonnes * outward_pct / 100)

        # Extract country from NUTS prefix (e.g. "BE" from "BE_0BE003")
        country = nuts.split("_")[0] if "_" in nuts else nuts[:2]

        # Build output code e.g. "BE_0BE003" -> "BE00BE003"
        code_suffix = extract_unlocode_from_nuts(nuts)
        output_code = f"{country}0{code_suffix}" if code_suffix else nuts.replace("_", "")

        # Match to GeoJSON by UNLOCODE
        geo_props = geo_index.get(code_suffix) if code_suffix else None

        if geo_props is None:
            unmatched.append(nuts)
            print(f"  No GeoJSON match for NUTS '{nuts}' (tried UNLOCODE '{code_suffix}')")
            continue

        lat = round(float(geo_props["POINT_Y"]), 6)
        lon = round(float(geo_props["POINT_X"]), 6)

        records.append({
            "country": country,
            "code": output_code,
            "name": region_name,
            "total": total_tonnes,
            "disembarked": inward_tonnes,
            "embarked": outward_tonnes,
            "lat": lat,
            "lon": lon,
        })

    print(f"\nMatched: {len(records)} | Unmatched: {len(unmatched)}")
    if unmatched:
        print(f"Unmatched NUTS codes: {unmatched}")
    return records


def main():
    excel_path = Path("input/RYB2026 CH11 Transport-for maps.xlsx")
    geojson_path = Path("input/ports.geojson")

    if not excel_path.exists():
        sys.exit(f"ERROR: Excel file not found at {excel_path}")
    if not geojson_path.exists():
        sys.exit(f"ERROR: GeoJSON file not found at {geojson_path}")

    print(f"Excel:   {excel_path}")
    print(f"GeoJSON: {geojson_path}")

    df = load_excel(str(excel_path))
    df = normalise_columns(df)
    print(f"Loaded {len(df)} rows from Excel.")
    print(df.head(3).to_string())

    geo_index = load_geojson(str(geojson_path))

    output = build_output(df, geo_index)

    out_path = Path("output/ports_data.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {len(output)} records to {out_path}")


if __name__ == "__main__":
    main()