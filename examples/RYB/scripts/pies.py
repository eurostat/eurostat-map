import json
from pathlib import Path

import pandas as pd


# ============================================================================
# CONFIG
# ============================================================================

INPUT_FILE = "input/RYB2026 CH02 Health-for maps.xlsx"
SHEET_NAME = "CH02M3 ALT"

OUTPUT_FILES = {
    "Value1": "value1.json",
    "Value2": "value2.json",
    "Value3": "value3.json",
    "Value 4": "value4.json",
}

OUTPUT_DIR = Path("output")


# ============================================================================
# FIND HEADER ROW
# ============================================================================

def find_header_row(excel_file: str, sheet_name: str) -> int:
    """
    Find the row containing the 'NUTS' header.
    """

    preview = pd.read_excel(
        excel_file,
        sheet_name=sheet_name,
        header=None,
        engine="openpyxl"
    )

    for idx, row in preview.iterrows():
        values = [str(v).strip() for v in row if pd.notna(v)]

        if "NUTS" in values:
            return idx

    raise ValueError(
        f"Could not locate header row containing 'NUTS' in sheet '{sheet_name}'"
    )


# ============================================================================
# LOAD DATA
# ============================================================================

header_row = find_header_row(INPUT_FILE, SHEET_NAME)

df = pd.read_excel(
    INPUT_FILE,
    sheet_name=SHEET_NAME,
    header=header_row,
    engine="openpyxl"
)

# Clean column names
df.columns = df.columns.astype(str).str.strip()

required_columns = [
    "NUTS",
    "Value1",
    "Value2",
    "Value3",
    "Value 4",
]

missing = [c for c in required_columns if c not in df.columns]

if missing:
    raise ValueError(
        f"Missing columns: {missing}\n"
        f"Found columns: {list(df.columns)}"
    )

# Keep only rows with a valid NUTS code
df = df[df["NUTS"].notna()].copy()

OUTPUT_DIR.mkdir(exist_ok=True)


# ============================================================================
# EXPORT JSON FILES
# ============================================================================

for column_name, output_filename in OUTPUT_FILES.items():

    result = {}

    for _, row in df.iterrows():

        nuts_code = str(row["NUTS"]).strip()

        if not nuts_code:
            continue

        value = row[column_name]

        if pd.isna(value):
            continue

        try:
            result[nuts_code] = float(value)
        except (TypeError, ValueError):
            continue

    output_path = OUTPUT_DIR / output_filename

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            result,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(
        f"Created {output_filename} "
        f"({len(result)} regions)"
    )

print("\nFinished.")
print(f"Files written to: {OUTPUT_DIR.resolve()}")