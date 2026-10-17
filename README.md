# Open Derm Trainer

An open-source skin-lesion recognition trainer for medical students, built only on openly licensed (CC0 / CC BY)
images from the ISIC Archive, with spaced repetition (FSRS) and full response logging. It is the dermatology
sibling of [Open ECG Trainer](https://github.com/zbenja168/open-ecg-trainer).
**Prototype: the teaching items have not yet been reviewed by a dermatologist.**

**Try it:** https://zbenja168.github.io/open-derm-trainer/ (progress is stored in your own browser only).

## What is here

| Path | What it does |
|---|---|
| `classes.csv` | Maps ISIC diagnosis paths to 27 teaching classes (21 dermoscopic, 6 clinical photo), split into two counterbalanced sets for a within-student spaced-vs-massed design. |
| `scripts/fetch_isic_metadata.py` | Downloads metadata for every CC-0 / CC-BY dermoscopic or clinical ISIC image. The licence is read per image, never from collection membership. |
| `scripts/count_classes.py` | Counts candidate images, lesions and independent patients per class (`data/class_counts.csv`). |
| `scripts/sample_images.py` | Builds a 10-per-class contact sheet for an eyeball check. |
| `scripts/build_items.py` | Builds the item bank: one image per patient per class, a patient-disjoint held-out test split, images resized for the web, and a review sheet (`data/items_manifest.csv`). |
| `web/` | The trainer (React, Vite, ts-fsrs), ported from Open ECG Trainer. See `web/README.md`. |
| `notes/` | Literature and licence check; class-mapping notes. |

## Rebuild from scratch

```bash
python -m venv .venv && .venv/Scripts/pip install pillow   # or .venv/bin/pip
.venv/Scripts/python scripts/fetch_isic_metadata.py
.venv/Scripts/python scripts/count_classes.py
.venv/Scripts/python scripts/build_items.py
```

## Data and licences

- **Code:** MIT.
- **Images:** ISIC Archive (https://www.isic-archive.com), each under its own contributor-chosen licence, CC0 or
  CC BY; the licence and attribution of every image are stored with its item. Images under CC BY-NC are
  excluded, which rules out HAM10000, BCN20000, MILK10k and others. Clinical photos come largely from
  PAD-UFES-20 (Pacheco et al., *Data Brief* 2020; CC BY 4.0) and Hospital Italiano de Buenos Aires, both via ISIC.
- **Deliberately excluded:** Fitzpatrick17k, DDI, DermNet, Derm7pt, DermaMNIST and other datasets under
  non-commercial, no-derivatives or data-use-agreement terms, which would prevent an open release.
