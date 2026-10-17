"""Count candidate images, lesions and patients per teaching class (output: data/class_counts.csv).

A row matches a class when its diagnosis path "dx3>dx4>dx5" starts with one of the class's `match`
patterns and none of its `exclude` patterns. Images are grouped by lesion_id: several images of one
lesion are one teaching item, and train/test splits must be lesion- and patient-disjoint.
lesion_id is missing on many images (Imperial College and MSK uploads especially), so `lesions` is an
upper bound; `units` (distinct patients, plus each image with no patient_id) is the conservative count
of independent cases.
"""
import csv
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DARK = {"IV", "V", "VI"}


def path(r):
    return ">".join(r.get(f"diagnosis_{i}", "") for i in (3, 4, 5))


def pats(s):
    return [p for p in (s or "").split("|") if p]


def main():
    classes = list(csv.DictReader(open(ROOT / "classes.csv", encoding="utf-8")))
    rows = list(csv.DictReader(open(ROOT / "data/raw/isic/metadata.csv", encoding="utf-8")))
    hits = defaultdict(list)
    claimed = defaultdict(list)
    for r in rows:
        kind = "dermoscopic" if r["image_type"] == "dermoscopic" else "clinical"
        p = path(r)
        for c in classes:
            if c["image_type"] != kind:
                continue
            if any(p.startswith(m) for m in pats(c["match"])) and not any(p.startswith(x) for x in pats(c["exclude"])):
                histo = r["diagnosis_confirm_type"] == "histopathology"
                if c["confirm"] == "histopathology" and not histo:
                    continue
                hits[c["class_id"]].append(r)
                claimed[r["isic_id"]].append(c["class_id"])
    overlaps = {k: v for k, v in claimed.items() if len(v) > 1}
    if overlaps:
        sys.exit(f"{len(overlaps)} images match more than one class, e.g. {next(iter(overlaps.items()))}")

    out = []
    for c in classes:
        rs = hits[c["class_id"]]
        lesions = {r["lesion_id"] or r["isic_id"] for r in rs}
        dark_lesions = {r["lesion_id"] or r["isic_id"] for r in rs if r["fitzpatrick_skin_type"] in DARK}
        out.append({
            "class_id": c["class_id"], "set": c["set"], "confirm_rule": c["confirm"],
            "images": len(rs), "lesions": len(lesions),
            "patients": len({r["patient_id"] for r in rs if r["patient_id"]}),
            "patient_id_missing": sum(1 for r in rs if not r["patient_id"]),
            "units": len({r["patient_id"] or r["isic_id"] for r in rs}),
            "max_images_one_patient": max(Counter(r["patient_id"] for r in rs if r["patient_id"]).values(), default=0),
            "histopathology": sum(r["diagnosis_confirm_type"] == "histopathology" for r in rs),
            "cc0": sum(r["copyright_license"] == "CC-0" for r in rs),
            "ccby": sum(r["copyright_license"] == "CC-BY" for r in rs),
            "fst_known": sum(bool(r["fitzpatrick_skin_type"]) for r in rs),
            "fst_iv_vi_lesions": len(dark_lesions),
        })
    with open(ROOT / "data/class_counts.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)
    for o in out:
        print(f"{o['class_id']:11} {o['set']:4} img {o['images']:5} les<= {o['lesions']:5} units {o['units']:5} "
              f"maxpt {o['max_images_one_patient']:3} histo {o['histopathology']:5} FST-known {o['fst_known']:4} "
              f"IV-VI {o['fst_iv_vi_lesions']}")


if __name__ == "__main__":
    main()
