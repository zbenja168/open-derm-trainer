"""Build the item bank: practice and held-out test items per teaching class, for the web app.

This is a PROTOTYPE bank with no dermatologist review. One image per patient per class, so a class's
items are independent cases. Images with no patient_id count as their own patient.

Split (patient-disjoint across the whole bank, not only within a class):
- test: TEST_PER_CLASS items per class, drawn only from images that HAVE a patient_id, so the
  disjointness can actually be checked. Every patient used in any test item is barred from practice.
- practice: up to --per-class items per class from the remaining patients.
Classes are filled thinnest first, so the scarce classes get first pick of patients.

Within a class, patients are drawn in a seeded random order (representative, not cherry-picked), with
histopathology-confirmed images ranked ahead for classes that also accept consensus labels.
Images whose short side is under MIN_SHORT px, or with no recorded confirm type, are left out.

Writes:
- web/public/derm/<isic_id>.jpg   (long side at most MAX_LONG px)
- web/public/data/items.json
- web/public/data/classes.json
- data/items_manifest.csv         (one row per item: the review sheet and the credits source)

Usage: .venv/Scripts/python scripts/build_items.py [--per-class N]   (from the project root)
"""
import argparse
import csv
import hashlib
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from count_classes import pats, path  # noqa: E402

WEB = ROOT / "web" / "public"
TEST_PER_CLASS = 4
MIN_SHORT = {"dermoscopic": 600, "clinical": 300}
MAX_LONG = 1200
SEED = "open-derm-trainer-v1"


def kind(r):
    return "dermoscopic" if r["image_type"] == "dermoscopic" else "clinical"


def matches(c, r):
    p = path(r)
    if c["image_type"] != kind(r):
        return False
    if not any(p.startswith(m) for m in pats(c["match"])) or any(p.startswith(x) for x in pats(c["exclude"])):
        return False
    if not r["diagnosis_confirm_type"]:
        return False  # no record of how the diagnosis was made
    return c["confirm"] != "histopathology" or r["diagnosis_confirm_type"] == "histopathology"


def short_side(r):
    try:
        return min(int(r["pixels_x"]), int(r["pixels_y"]))
    except ValueError:
        return 0


def h(*parts):
    return hashlib.sha256("|".join((SEED,) + parts).encode()).hexdigest()


def best_image(imgs):
    """Per patient: histopathology first, unaltered, then larger, then a stable tiebreak."""
    return min(imgs, key=lambda r: (r["diagnosis_confirm_type"] != "histopathology",
                                    r.get("image_manipulation") == "altered", -short_side(r), r["isic_id"]))


def fetch(item):
    out = WEB / item["image"]
    if out.exists():
        return None
    try:
        with urllib.request.urlopen(item["_url"], timeout=120) as resp:
            im = Image.open(BytesIO(resp.read()))
            im = im.convert("RGB")
        im.thumbnail((MAX_LONG, MAX_LONG), Image.LANCZOS)
        im.save(out, "JPEG", quality=85, optimize=True)
        return None
    except Exception as e:
        return f"{item['id']}: {e}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=16, help="practice items per class")
    n_practice = ap.parse_args().per_class

    classes = list(csv.DictReader(open(ROOT / "classes.csv", encoding="utf-8")))
    rows = list(csv.DictReader(open(ROOT / "data/raw/isic/metadata.csv", encoding="utf-8")))

    pools = {}
    for c in classes:
        by_unit = {}
        for r in rows:
            if matches(c, r) and short_side(r) >= MIN_SHORT[c["image_type"]]:
                by_unit.setdefault(r["patient_id"] or r["isic_id"], []).append(r)
        pools[c["class_id"]] = by_unit

    used_test, used_practice = set(), set()  # patient units
    picks = {}
    for c in sorted(classes, key=lambda c: len(pools[c["class_id"]])):
        cid = c["class_id"]
        units = pools[cid]
        histo_rank = c["confirm"] != "histopathology"  # only matters where consensus labels are allowed
        order = sorted(units, key=lambda u: (
            histo_rank and best_image(units[u])["diagnosis_confirm_type"] != "histopathology", h(cid, u)))
        test = [u for u in order if units[u][0]["patient_id"] and u not in used_practice][:TEST_PER_CLASS]
        used_test.update(test)
        practice = [u for u in order if u not in used_test][:n_practice]
        used_practice.update(practice)
        picks[cid] = [(u, "test") for u in test] + [(u, "practice") for u in practice]
        print(f"{cid:11} set {c['set']:4} test {len(test)}  practice {len(practice):2}  "
              f"(eligible patients {len(units)})")

    clash = used_test & used_practice
    if clash:
        sys.exit(f"patient in both splits: {sorted(clash)[:5]}")

    items = []
    for c in classes:
        for unit, split in picks[c["class_id"]]:
            r = best_image(pools[c["class_id"]][unit])
            items.append({
                "id": r["isic_id"],
                "classId": c["class_id"],
                "acceptable": [c["class_id"]],
                "set": c["set"],
                "split": split,
                "source": "ISIC Archive",
                "imageType": kind(r),
                "diagnosis": " > ".join(x for x in (r["diagnosis_3"], r["diagnosis_4"], r["diagnosis_5"]) if x),
                "confirmType": r["diagnosis_confirm_type"],
                "fitzpatrick": r["fitzpatrick_skin_type"] or None,
                "site": r["anatom_site_1"] or None,
                "patient": r["patient_id"] or None,
                "license": r["copyright_license"],
                "attribution": r["attribution"],
                "sourceUrl": f"https://api.isic-archive.com/images/{r['isic_id']}/",
                "image": f"derm/{r['isic_id']}.jpg",
                "_url": r["url"],
            })

    (WEB / "derm").mkdir(parents=True, exist_ok=True)
    (WEB / "data").mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(8) as ex:
        errors = [e for e in ex.map(fetch, items) if e]
    for it in items:
        del it["_url"]
    if errors:
        print("\n".join(errors))
        sys.exit(f"{len(errors)} images failed; rerun to retry (finished images are skipped)")

    (WEB / "data" / "items.json").write_text(json.dumps(items, indent=1), encoding="utf-8")
    (WEB / "data" / "classes.json").write_text(json.dumps([
        {"id": c["class_id"], "group": c["group"], "name": c["teaching_class"], "set": c["set"],
         "imageType": c["image_type"], "available": bool(picks[c["class_id"]])} for c in classes], indent=1),
        encoding="utf-8")
    with open(ROOT / "data" / "items_manifest.csv", "w", newline="", encoding="utf-8") as f:
        cols = [k for k in items[0] if k != "acceptable"]
        w = csv.DictWriter(f, fieldnames=cols + ["reviewer_ok", "reviewer_note"], extrasaction="ignore")
        w.writeheader()
        w.writerows(items)
    n_test = sum(it["split"] == "test" for it in items)
    print(f"\n{len(items)} items ({n_test} test, {len(items) - n_test} practice) -> {WEB / 'data' / 'items.json'}")


if __name__ == "__main__":
    main()
