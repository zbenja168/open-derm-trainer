"""Download metadata for every openly licensed (CC-0 / CC-BY) dermoscopic or clinical ISIC image.

Writes data/raw/isic/metadata.csv (one row per image, flattened) and keeps the raw pages in
data/raw/isic/pages.jsonl so an interrupted run resumes from the last cursor.
Images are not downloaded here; the licence is read per image, never from collection membership.
"""
import csv
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "raw" / "isic"
PAGES = OUT / "pages.jsonl"
CURSOR = OUT / "next_url.txt"
CSV_OUT = OUT / "metadata.csv"

QUERY = ('(copyright_license:CC-0 OR copyright_license:CC-BY) AND (image_type:dermoscopic OR '
         'image_type:"clinical: close-up" OR image_type:"clinical: overview")')
START = "https://api.isic-archive.com/api/v2/images/search/?" + urllib.parse.urlencode(
    {"query": QUERY, "limit": 100})


def get(url, tries=5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # retry 5xx/429/timeouts
            wait = 2 ** i
            print(f"  retry {i + 1} after {e} (sleep {wait}s)", file=sys.stderr)
            time.sleep(wait)
    raise SystemExit(f"failed: {url}")


def fetch():
    OUT.mkdir(parents=True, exist_ok=True)
    url = CURSOR.read_text().strip() if CURSOR.exists() else START
    if url == "DONE":
        return
    total = None
    with PAGES.open("a", encoding="utf-8") as f:
        while url:
            page = get(url)
            total = page.get("count") or total
            f.write(json.dumps(page["results"]) + "\n")
            f.flush()
            url = page["next"]
            CURSOR.write_text(url or "DONE")
            done = sum(1 for _ in PAGES.open())
            print(f"\r{done} pages" + (f" of ~{-(-total // 100)}" if total else ""), end="")
    print()


def flatten():
    rows, seen = [], set()
    for line in PAGES.open(encoding="utf-8"):
        for img in json.loads(line):
            if img["isic_id"] in seen:
                continue
            seen.add(img["isic_id"])
            md = img.get("metadata", {})
            row = {"isic_id": img["isic_id"], "copyright_license": img["copyright_license"],
                   "attribution": img["attribution"], "url": img["files"]["full"]["url"]}
            for section in ("acquisition", "clinical"):
                row.update(md.get(section, {}))
            rows.append(row)
    cols = sorted({k for r in rows for k in r}, key=lambda c: (c not in rows[0], c))
    with CSV_OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} images -> {CSV_OUT}")
    return len(rows)


if __name__ == "__main__":
    fetch()
    n = flatten()
    expected = get(START.replace("limit=100", "limit=1"))["count"]
    if n != expected:
        raise SystemExit(f"INCOMPLETE: have {n}, API reports {expected}")
