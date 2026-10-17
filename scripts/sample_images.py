"""Download 10 images per teaching class (one per patient, seeded) and write samples/index.html for an eyeball check.

Re-uses the matching rules in count_classes.py. Images are CC-0/CC-BY; credits are shown under each one.
"""
import csv
import html
import random
import urllib.request
from collections import defaultdict
from pathlib import Path

import count_classes as cc

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "samples"
PER_CLASS = 10


def matches(c, r):
    kind = "dermoscopic" if r["image_type"] == "dermoscopic" else "clinical"
    p = cc.path(r)
    if c["image_type"] != kind:
        return False
    if not any(p.startswith(m) for m in cc.pats(c["match"])) or any(p.startswith(x) for x in cc.pats(c["exclude"])):
        return False
    return c["confirm"] != "histopathology" or r["diagnosis_confirm_type"] == "histopathology"


def main():
    classes = list(csv.DictReader(open(ROOT / "classes.csv", encoding="utf-8")))
    rows = list(csv.DictReader(open(ROOT / "data/raw/isic/metadata.csv", encoding="utf-8")))
    rng = random.Random(20261017)
    OUT.mkdir(exist_ok=True)
    picked = defaultdict(list)
    for c in classes:
        pool = [r for r in rows if matches(c, r)]
        rng.shuffle(pool)
        seen = set()
        for r in pool:
            unit = r["patient_id"] or r["isic_id"]
            if unit in seen:
                continue
            seen.add(unit)
            picked[c["class_id"]].append(r)
            if len(picked[c["class_id"]]) == PER_CLASS:
                break
    failed = []
    for cid, rs in picked.items():
        for r in rs:
            dest = OUT / f"{r['isic_id']}.jpg"
            if dest.exists():
                continue
            try:
                urllib.request.urlretrieve(r["url"], dest)
            except Exception as e:
                failed.append((r["isic_id"], e))
    parts = ["<!doctype html><meta charset='utf-8'><title>Derm sample check</title><style>"
             "body{font:14px system-ui;margin:16px;background:#fafafa;color:#222}"
             "h2{margin:28px 0 4px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}"
             "figure{margin:0;background:#fff;border:1px solid #ddd;padding:6px}img{width:100%;height:200px;object-fit:contain;background:#000}"
             "figcaption{font-size:11px;color:#555;margin-top:4px}</style>",
             "<h1>Open Derm Trainer: sample check (10 per class, one per patient)</h1>"]
    for c in classes:
        parts.append(f"<h2>{html.escape(c['class_id'])}: {html.escape(c['teaching_class'])} "
                     f"<small>(set {c['set']}, {c['image_type']})</small></h2><div class='g'>")
        for r in picked[c["class_id"]]:
            dx = " &gt; ".join(html.escape(r[f"diagnosis_{i}"]) for i in (3, 4, 5) if r[f"diagnosis_{i}"])
            parts.append(f"<figure><a href='{r['isic_id']}.jpg'><img loading='lazy' src='{r['isic_id']}.jpg'></a>"
                         f"<figcaption><b>{r['isic_id']}</b> {dx}<br>{html.escape(r['diagnosis_confirm_type'])}; "
                         f"FST {r['fitzpatrick_skin_type'] or '?'}; {r['anatom_site_1'] or 'site ?'}<br>"
                         f"{r['copyright_license']}, {html.escape(r['attribution'])}</figcaption></figure>")
        parts.append("</div>")
    (OUT / "index.html").write_text("\n".join(parts), encoding="utf-8")
    print(f"{sum(len(v) for v in picked.values())} images, {len(failed)} failed -> {OUT / 'index.html'}")
    for f in failed:
        print("FAILED", *f)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
