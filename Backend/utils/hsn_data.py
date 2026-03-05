# Load GST HSN codes from CSV for HS Code page (same format as Impexinfo).
# File: data/all_hs_codes_with_hscodes_fixed.csv
# Columns: hsn_code, name, type, tax_rate, cgst_rate, sgst_rate, cess_rate

import os
import csv

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_CSV_PATH = os.path.join(_THIS_DIR, "..", "data", "all_hs_codes_with_hscodes_fixed.csv")

_GST_HSN_CODES = None


def load_gst_hsn_codes():
    """Load GST HSN codes from CSV into a dict keyed by hsn_code. Cached after first load."""
    global _GST_HSN_CODES
    if _GST_HSN_CODES is not None:
        return _GST_HSN_CODES
    hsn_dict = {}
    if not os.path.exists(_CSV_PATH):
        return hsn_dict
    with open(_CSV_PATH, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row.get("hsn_code", "").strip()
            if not code:
                continue
            hsn_dict[code] = {
                "name": (row.get("name") or "").strip(),
                "type": (row.get("type") or "").strip(),
                "tax_rate": (row.get("tax_rate") or "").strip(),
                "cgst_rate": (row.get("cgst_rate") or "").strip(),
                "sgst_rate": (row.get("sgst_rate") or "").strip(),
                "cess_rate": (row.get("cess_rate") or "").strip(),
            }
    _GST_HSN_CODES = hsn_dict
    return hsn_dict


def get_gst_hsn_codes():
    """Return the cached GST HSN dict (loads from CSV on first call)."""
    return load_gst_hsn_codes()
