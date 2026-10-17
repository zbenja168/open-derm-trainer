# Teaching-class mapping: first pass (2026-10-17)

Files:
- `classes.csv`: the mapping. Each class has a diagnosis-path match rule, a confirmation rule and its
  confusable partners.
- `scripts/fetch_isic_metadata.py`: downloads metadata for every CC-0/CC-BY dermoscopic or clinical ISIC
  image into `data/raw/isic/metadata.csv`. That came to 73,004 images on 2026-10-17, matching the API count.
  The licence is read from each image's own `copyright_license`, never from the collection it sits in.
- `scripts/count_classes.py`: the counter. Its output is `data/class_counts.csv`.

Scope: lesions only, with no SCIN (decided 2026-10-17). PAD-UFES-20 and HIBA are already inside ISIC
under CC-BY, so ISIC is the only source needed for now.

## Rules used
- **Matching.** A class matches on the ISIC path `diagnosis_3>diagnosis_4>diagnosis_5`, by prefix, with
  explicit excludes. The counter exits with an error if any image matches two classes; none do.
- **Confirmation.** Classes where the label *is* a histological call require `diagnosis_confirm_type ==
  histopathology`. These are dysplastic nevus, Spitz, every melanoma, BCC, SCC and Bowen. Benign classes
  with few biopsies also accept expert-consensus and serial-imaging labels: hemangioma (54 histo), DF (87),
  angiokeratoma (26), SK, AK and the common nevus. The confirm type is stored per item and should be shown
  in the credits.
- **Independent cases, not images.** `lesion_id` is missing on about 60% of matched images, and Imperial
  College and MSK uploads hold several images per patient. So the lesion count is an upper bound. The
  conservative figure is **units**: distinct patients, plus each image that has no patient ID. Train and
  test items must be patient-disjoint.
- **Common nevus excludes bare "Nevus" NOS.** 14,506 images have no subtype; the 4,244 subtyped ones are
  plenty.

## Result (units = conservative independent cases; full table in `data/class_counts.csv`)

| Verdict | Classes (units) |
|---|---|
| **Plenty (100+)** | common nevus 1,243; dysplastic nevus 1,035; congenital nevus 381; melanoma (flat) 1,894; lentigo maligna 110; solar lentigo 329; LPLK 274; SK 1,135; AK 352; SCC 435; BCC 912; DF 178; all six clinical classes (150-643) |
| **Adequate (40-100)** | blue nevus 60; Spitz/Reed 47; hemangioma 97; Bowen 91; acrochordon 85; verruca 83 |
| **Thin (20-30); keep with care** | nodular melanoma 26 (90 images, one patient has 16); superficial BCC 26; angiokeratoma 24; melanoma metastasis 23 |
| **Dropped** | acral nevus and acral melanoma (7 + 11; BALD is NC), halo nevus 7, clear cell acanthoma 9, sebaceous hyperplasia 7, Paget 11, pyogenic granuloma 11, Kaposi 16, atypical Spitz tumour 5 |

That gave **28 classes** on the first pass. Melanoma metastasis was then dropped (see Decided), which
leaves **27**: 21 dermoscopic and 6 clinical. A review of about 20 per class is about 540 images.

**Skin tone.** Fitzpatrick type is recorded for almost no dermoscopic images. The clinical arm has it for
most images (PAD-UFES-20). Dark-skin (IV-VI) lesions per class are at most 17, in clinical BCC. So the
literature check's verdict stands: report skin type descriptively; there is no stratified map.

## A/B split (column `set`; proposed, not yet approved)

| Set | Classes (n) | Clusters kept together |
|---|---|---|
| A: melanocytic, flat-pigmented and vascular (13) | NEV_DYS, NEV_CONG, NEV_BLUE, NEV_SPITZ, MEL, LM, MEL_NOD, MEL_MET, SL, LPLK, HEMANG, ANGIOK, C_MEL | nevus vs melanoma; Spitz vs melanoma; blue nevus vs nodular melanoma vs metastasis; lentigo maligna vs solar lentigo vs LPLK; hemangioma vs angiokeratoma vs nodular melanoma |
| B: keratinocytic and other (13) | SK, AK, BOWEN, SCC, BCC, BCC_SUP, DF, ACROCH, VERRUCA, C_BCC, C_AK, C_SCC, C_SK | AK vs Bowen vs superficial BCC; SCC vs BCC vs verruca; SK vs verruca |
| both | NEV_COMMON, C_NEV | the "normal" foils, outside the contrast |

- **Each clinical class sits in the same set as its dermoscopic counterpart.** Otherwise practising BCC in
  one modality would train it for the other.
- **Confusions that still cross the sets:** SK vs melanoma, pigmented BCC vs melanoma, LPLK vs BCC, and
  DF vs nevus. Report confusion-matrix cells for these pairs. SK vs melanoma is the most important; it
  cannot be kept inside one set without moving SK, which would unbalance the split.
- **The sets differ in difficulty.** Set A holds most of the hard melanocytic discriminations. The
  counterbalancing still gives an unbiased overall effect, but pre-register a condition-by-set
  interaction, as for ECG.

## Decided 2026-10-17
- Melanoma merged into one flat class (in situ + invasive + NOS); subtype kept per item for feedback.
- Melanoma metastasis dropped.
- Option (a): both the dermoscopy and the clinical arm are in the trial, with a short dermoscopy primer
  before practice starts.
- A/B split approved: A 12, B 13, plus NEV_COMMON and C_NEV in both.

## Decisions as put to him (resolved above)
1. **One flat-melanoma class** (in situ + invasive + NOS) rather than separate MIS and invasive classes.
   Telling them apart on dermoscopy is a specialist skill, and 1,100 images are "NOS" anyway. The subtype
   stays on each item for the feedback text.
2. **Melanoma metastasis** (23 units, 39 images): keep or drop.
3. **Dermoscopy versus clinical photos for M1/M2 students.** Most of the open data is dermoscopy. Students
   mostly see lesions with the naked eye, and dermoscopy is a specialist tool. Options:
   - (a) Run as proposed: both arms, with a dermoscopy primer.
   - (b) Make the 6-class clinical arm the trial and keep dermoscopy as practice-only.
   - (c) Aim the trial at dermatology-interested students or residents.

   (b) is closer to what students need, but six classes with three pairs is a thin contrast.
4. **Approve the A/B split.**

## Sample check
- `scripts/sample_images.py` writes `samples/index.html` (git-ignored): 10 images per class, one per
  patient, seeded, with diagnosis path, confirm type, skin type, site and licence under each image.
  270 images were downloaded with 0 failures; they are awaiting his check.
- **Resolution differs a lot by source.** Dermoscopic images have a median width of 3,264 px, so the item
  builder must downscale them. Clinical close-ups have a median width of 1,276 px; the smallest are about
  150 px (PAD-UFES crops), so set a minimum size for the clinical arm.

## Item bank (2026-10-17; he approved the samples)
`scripts/build_items.py` writes:
- `web/public/data/items.json` and `classes.json`;
- `web/public/derm/*.jpg`, with the long side at most 1,200 px (58.8 MB, git-ignored);
- `data/items_manifest.csv`, which is the review sheet, with blank `reviewer_ok` and `reviewer_note`
  columns.

**Result: 533 items, 108 test and 425 practice.** The test items come from 107 patients, because one
patient supplies test items in two classes. Every class has 4 test items and 16 practice items,
except angiokeratoma (4 + 9).

Rules:
- One image per patient per class.
- The test split is patient-disjoint from practice across the whole bank, checked: 0 overlap.
- Test items come only from images that carry a patient_id.
- Classes are filled thinnest first.
- Within a class, patients are drawn in a seeded random order, with histopathology-confirmed images
  first.
- Minimum short side: 600 px for dermoscopic images, 300 px for clinical.
- **Images with no recorded confirm type are excluded.** That removed 7 Imperial College angiokeratomas
  and halved the hemangioma pool.

So all 533 items happen to be histopathology-confirmed. Licences: 325 CC-0 and 208 CC-BY.

Limits:
- 220 practice items have no patient_id, so they cannot be proven disjoint from a test patient. The risk
  is low but not zero.
- Skin type is unknown for 77% of items.
- Angiokeratoma has only 13 eligible patients. Keep it as a thin class, or drop it before the trial.

## Next
1. Web app ported and deployed (see `HANDOFF.md`).
2. Ask ISIC (support@isic-archive.com) which CC BY version the bare "CC-BY" label means.
3. Write the item builder: patient-disjoint split, one image per lesion, and attribution stored per item.
