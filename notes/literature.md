# Open-source dermatology image trainer (FSRS) on openly licensed images: data, licence and novelty check

Date: 2026-10-17. Method:
- Live queries of the ISIC Archive API v2 (`/api/v2/images/facets/` and `/api/v2/images/search/`, run 2026-10-17 00:20-00:35 CDT).
- Download and parsing of the SCIN label/case CSVs from Google's public bucket.
- Licence pages and dataset APIs: Mendeley Data, Harvard Dataverse, GitHub, DDI, DermNet, SFU, MedMNIST, PASSION.
- Wikimedia Commons API (category counts, licence sampling).
- Europe PMC REST (citation verification, abstracts, CC BY case-report counts).
- Web search.

Each claim is marked **Confirmed** (with the URL or API call it came from) or **Unconfirmed**. The licence rule is the same one used for the ECG project: **code MIT; images CC BY 4.0 or CC0 only.** Anything NC, ND, NC-SA, research-only or DUA-gated is excluded from the app and from the release. Raw query outputs are in the session scratchpad and are reproducible with the calls quoted below.

## Verdict

**The gap is real, and the data supports a lesion-recognition trainer. It does not yet support a general-derm or skin-of-colour trainer.**

- **Licensing is not a blocker for skin lesions.** The ISIC Archive holds 553,019 images. Every image carries a per-image licence: CC-BY 258,980, CC-BY-NC 245,288 and CC-0 48,751 (Confirmed, ISIC API facets).
  - The API filters by licence directly: `query=copyright_license:CC-0 OR copyright_license:CC-BY`.
  - Restricting to dermoscopic images under CC0/CC-BY leaves **68,975 images**, of which **14,969 are histopathology-confirmed**.
  - Those images fill about **22-25 lesion classes with at least 20 items each**, including melanoma subtypes, lentigo maligna, Bowen disease, LPLK, blue nevus and Spitz nevus.
  - PAD-UFES-20 is CC BY 4.0, adding 2,298 smartphone clinical photos; 58% of them are biopsy-proven, including all cancers. HIBA adds CC-BY dermoscopic and clinical pairs. Together they make a 6-class clinical-photo module possible.
- **The best-known lesion sets are out.** HAM10000, BCN20000, MILK10k, DermaMNIST, BALD, most of ISIC 2018-2019, the NC half of ISIC 2020 and standard SLICE-3D are all **CC BY-NC** (Confirmed). They must be excluded. Their CC0/CC-BY siblings in ISIC (MSK-1 to MSK-5, SONIC, IMA++, DERM12345, HIBA, PROVe-AI, the ISIC 2016/2017 challenges) replace them.
- **General clinical derm (rashes) has no clean CC BY source with expert labels.**
  - Fitzpatrick17k (CC BY-NC-SA 3.0), DDI (Stanford research-use agreement), DermNet (CC BY-NC-ND 4.0, AI use banned), Derm7pt (CC BY-NC-ND 4.0), PASSION (NC, no reposting), DermaCon-IN (CC BY-NC-SA 4.0) and Derm1M (CC BY-NC 4.0) are all excluded (Confirmed).
  - The only large candidate is **Google SCIN**, under a *custom* "SCIN Data Use Public License". That licence permits sharing and adaptation with attribution and has no NC clause, but it is **not CC BY**. Including SCIN needs a deliberate decision.
  - SCIN would give **22 inflammatory/infectious classes with at least 20 cases** where dermatologists' top differential carries weight of at least 0.5. Its labels are differential-diagnosis weights from up to three dermatologists, with no biopsy.
  - CC BY case reports in PMC are plentiful for some conditions (for example psoriasis 380 and bullous pemphigoid 181 CC BY case reports) and thin for common primary-care rashes (impetigo 6, tinea versicolor 2, pityriasis rosea 16). Using them is manual figure curation, not a dataset.
- **A skin-of-colour stratified difficulty map is not feasible for lesions.**
  - Among open-licence ISIC images, only 2,496 carry Fitzpatrick IV-VI, and 2,346 of those are diagnosis-less benign images from the MSKCC Skin Tone Labeling Dataset.
  - Only **98** are histopathology-confirmed (88 FST IV, 9 FST V, 1 FST VI). Only nevus, BCC, SK and AK reach 12 or more dark-skin items, nearly all of them PAD-UFES clinical photos.
  - For clinical derm, SCIN gives **11 classes with at least 12 FST IV-VI cases**, but only **2 classes (eczema, urticaria) with at least 12 FST V-VI**. FST is dermatologist-estimated from photos.
  - Skin tone is therefore a secondary, descriptive aim (accuracy on FST I-III vs IV-VI in a handful of rash classes), not the headline.
- **Prior work leaves the same kind of gap as in ECG.**
  - Perceptual/adaptive learning in dermatology is established: Rimoin/Kellman 2015 PALMs, effect sizes 1.1-2.2, retention at 1 year; Salava & Salmela 2022-2024 Finnish PLM cohorts; Kellman 2023 skin-cancer PALM with SDT-based sequencing.
  - All of these platforms are proprietary, use non-open images and release no item data.
  - The only spaced-education dermatology trial is Boespflug 2015. It recruited dermatologists and senior residents, used sequential (not randomised) cohorts and found a tiny effect: 148.1 vs 145.7 of 160 points.
  - No open-source spaced-repetition derm trainer was found. No individually randomised spaced-vs-massed trial of derm image recognition in medical students was found. No public per-diagnosis difficulty map on open images was found.
  - Skin-tone bias in student diagnosis is documented (Fenton 2020: SCC in SOC 14.9% vs 45.6%). It has been mitigated once in a randomised curriculum study (Hardin 2023), and a 2026 systematic review (8 studies, 667 participants) found **no long-term retention data** in any SOC educational intervention.

**Recommended scope:** skin lesions, meaning dermoscopy plus a smaller clinical-photo arm, in about 24 classes built only from CC0/CC-BY ISIC collections and PAD-UFES-20. An optional "rash" module can be added later if SCIN's licence is accepted. Report skin-tone results descriptively and do not promise a stratified map.

## 1. Datasets

### 1a. ISIC Archive (the core source)

All figures were Confirmed via the ISIC API, `https://api.isic-archive.com/api/v2/images/facets/`, with the `query=` or `collections=` filters shown.

- **Terms:** Confirmed, https://www.isic-archive.com/terms-conditions.
  - s3.1: contributors must choose CC0, CC BY or CC BY-NC for each image.
  - s4.2: each image is available "under the Contributor License chosen by the contributor".
  - s4.3: annotations are CC0, and a combined annotation+image work takes the image's licence.
  - So **licensing is per image, not per dataset**.
  - Each image record carries `copyright_license` and `attribution` fields; the attribution is the institution name, for example "Memorial Sloan Kettering Cancer Center".
- **Licence filter:** Confirmed. `GET /api/v2/images/search/?query=copyright_license:CC-0` returns count 48,751 with full-image S3 URLs.
- **Unconfirmed:** the Creative Commons *version* behind the bare "CC-BY" label (assumed 4.0; the terms do not state it).
- **Unconfirmed:** how the terms' s3.1 restriction on "commercial use of Site" interacts with per-image CC BY. Our use is non-commercial in any case.

| Slice (ISIC, live 2026-10-17) | Images | Notes |
|---|---|---|
| All | 553,019 | CC-BY 258,980; CC-BY-NC 245,288; CC-0 48,751 |
| Open (CC0+CC-BY), dermoscopic | 68,975 | confirm type: expert consensus 27,163; histopathology 14,969; serial imaging 10,500; single clinician 3,699 |
| Open, dermoscopic, histopathology | 14,969 | CC-0 9,483; CC-BY 5,486 |
| Open, clinical close-up/overview | 4,029 | histopathology 1,779; mostly PAD-UFES-20 + HIBA |
| Open, 3D-TBP tiles (SLICE-3D permissive part) | 217,477 | only 744 histopathology; 15 mm low-res crops; poor teaching value |
| Open, Fitzpatrick IV-VI | 2,496 (IV 922 / V 823 / VI 751, across all licences; all open) | 1,838 dermoscopic, 658 clinical; **2,346 "single contributor clinical assessment", mostly no specific diagnosis** |
| Open, FST IV-VI, histopathology | **98** (IV 88, V 9, VI 1) | nevus 37, BCC 25, AK 10, SK 7, SCC 5, melanoma 7 |

**Open dermoscopic counts by diagnosis.** These are ISIC `diagnosis_3` (with `diagnosis_4` subtypes) over the 68,975 open dermoscopic images; the histopathology-confirmed count follows in brackets.

- Nevus 27,570 [5,238]
  - dysplastic/Clark 7,958; junctional 1,857; compound 1,442; dermal 832; congenital 556; lentiginous 113; recurrent 78; blue nevus 73; combined 68; Spitz 55; Reed 14; halo 7; acral 7
- Seborrheic keratosis 1,817 [1,039]
- Basal cell carcinoma 1,810 [1,795]
  - superficial 71; infiltrating 39; nodular 20; morpheaform 9
- Melanoma in situ 1,179 [1,175]
  - lentigo maligna type 163; associated with nevus 84; superficial spreading 46; acral 7
- Melanoma NOS 1,100 [1,100]
- Invasive melanoma 924 [922]
  - superficial spreading 141; nodular 90; nevus-associated 54; lentigo maligna melanoma 37; acral 4
- SCC NOS 660 [660]; SCC in situ 253 [253], of which Bowen disease 49; invasive SCC 38, of which keratoacanthoma-type 35
- Actinic keratosis 567 [475]
- Solar lentigo 407 [325]
- Lichen planus-like keratosis 347 [335]
- Fibroepithelial polyp 301 [267]
- Dermatofibroma 294 [87]
- Lentigo NOS 261
- Hemangioma 227 [54]
- Atypical melanocytic neoplasm 210
- AIMP 171
- Verruca 97 [93]
- Lentigo simplex 84
- Angiokeratoma 65 [26]
- Lymphangioma 56
- Melanoma metastasis 39
- Scar 35
- Neurofibroma 26
- Kaposi sarcoma 16
- Vascular spider 14
- Ink-spot lentigo 13
- Pyogenic granuloma 11
- Paget disease 11
- Clear cell acanthoma 9
- Sebaceous hyperplasia 7
- Acral site flag: 1,363 open dermoscopic images, mostly undiagnosed

**Per-collection licences.** Confirmed via ISIC API `facets/?collections=<id>`.

| Collection (ISIC id) | Licence(s) | Images | Content |
|---|---|---|---|
| HAM10000 (212) | **CC-BY-NC** | 11,720 | 7 pigmented classes; >50% histopathology (Tschandl 2018, *Sci Data* 5:180161, doi:10.1038/sdata.2018.161, PMID 30106392). The Dataverse terms also say CC BY-NC 4.0: https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DBW86T (API). **Excluded.** |
| BCN20000 (249) | **CC-BY-NC** | 18,946 | Barcelona 2010-16 (Hernández-Pérez 2024, *Sci Data* 11:641, doi:10.1038/s41597-024-03387-w). The *paper* is CC BY; the *images* in ISIC are NC. **Excluded.** |
| Challenge 2018 Task 3 (66) | CC-BY-NC | 10,015 | = HAM10000. Excluded. |
| Challenge 2019 train (65) / test (72) | NC 22,428 + CC-0 2,903 / NC 8,238 | 25,331 / 8,238 | Only the CC-0 2,903 are usable. |
| Challenge 2020 train (70) / test (68) | CC-BY 19,557 + NC 13,569 / CC-BY 7,175 + NC 3,807 | 33,126 / 10,982 | Mostly nevi; the CC-BY part is usable. |
| Challenge 2016 (74, 61), 2017 (60, 71, 69) | **CC-0** | 900+379, 2,000+150+600 | Nevus / melanoma / SK. Usable. |
| Challenge 2024 = SLICE-3D (390) | CC-BY 188,812; NC 183,582; CC-0 28,665 | 401,059 | TBP crops (Kurtansky 2024, *Sci Data* 11:884, doi:10.1038/s41597-024-03743-w, PMID 39143096). The "standard" release is CC BY-NC per ISIC citation text (Unconfirmed on the live page: GitHub ImageMarkup/stade PR text via search). Low teaching value. |
| MILK10k (425) | **CC-BY-NC** | 10,480 | Paired dermoscopic+clinical. **Excluded**, a real loss. |
| BALD acral (410) | **CC-BY-NC** | 666 | Acral nevus/melanoma. **Excluded**, so no open acral class. |
| Repeated melanocytic (328) | CC-BY-NC | 585 | Excluded. |
| DERM12345 (399) | **CC-BY** | 12,345 | Türkiye, 3 centres; 40 subclasses. Malignant lesions all biopsy-proven; benign by 2-dermatologist consensus or follow-up. Also on Harvard Dataverse doi:10.7910/DVN/DAXZ7P under CC BY. No skin type field (Yilmaz 2024, *Sci Data*, doi:10.1038/s41597-024-04104-3, https://pmc.ncbi.nlm.nih.gov/articles/PMC11604664/). Usable. |
| IMA++ (482) | CC-0 14,639 + NC 328 | 14,967 | Nevus 12,820; melanoma ~1,400. Usable. |
| SONIC (293) | CC-0 | 9,251 | All nevi. Usable. |
| MSK-1 to MSK-5 (289, 290, 288, 287, 286) | CC-0 | 1,678 / 4,880 / 466 / 2,050 / 111 | Mixed lesions incl. BCC, SCCis, MIS, fibroepithelial polyp. Usable. |
| ISIC-DICM-17K (469) | NC 7,468; CC-0 5,683; CC-BY 3,909 | 17,060 | Filter by licence. |
| Melanoma/nevus histopathology (294) | NC 10,442; CC-0 5,298; CC-BY 2,393 | 18,133 | Filter by licence. |
| HIBA Buenos Aires (175/176/251) | CC-BY | 1,635 | Dermoscopic 1,280 + clinical 355; FST I-IV. Usable. |
| PAD-UFES-20 in ISIC (406) | CC-BY | 2,298 | See 1b. |
| MSKCC Skin Tone Labeling (413) | CC-BY | 4,879 | 64 adults, FST I-VI evenly spread (IV 783, V 813, VI 750); **no diagnoses beyond "benign"** (Weir 2025, *NPJ Digit Med*, doi:10.1038/s41746-025-02245-2, PMID 41429926). Useful only as dark-skin benign foils. |
| MEL-SELF (485) | CC-BY | 3,008 | Mostly FST I, few diagnoses. |
| PROVe-AI (218), EASY (166), consecutive biopsies 2020 (216), new-vs-old melanoma (215), BCC subtype (487), clonal SK (534) | CC-0 / CC-BY | 603 / 248 / 1,295 / 187 / 126 / 150 | Usable; biopsy-heavy. |

### 1b. Other datasets

| Dataset | Licence (primary source) | Type, size | Labels | Skin tone labels | Redistributable here? |
|---|---|---|---|---|---|
| **PAD-UFES-20** | **CC BY 4.0**. Confirmed, Mendeley Data API `data.mendeley.com/public-api/datasets/zr7vgbcyr2` (`data_licence.short_name: "CC BY 4.0"`) | Smartphone clinical close-ups; 2,298 images, 1,641 lesions, 1,373 patients | BCC 845, AK 730, nevus 244, SK 235, SCC+Bowen 192, melanoma 52 (ISIC counts). 58.4% biopsy-proven including 100% of cancers; rest by dermatologist consensus (Pacheco 2020, *Data Brief* 32:106221, doi:10.1016/j.dib.2020.106221, PMID 32939378) | FST per lesion: I 153, II 876, III 392, IV 62, V 10, VI 1 | **Yes** |
| **Google SCIN** | **Custom "SCIN Data Use Public License"**. Confirmed, https://github.com/google-research-datasets/scin and its LICENSE. Grants a worldwide, royalty-free right to "reproduce and Share", including Adapted Material; attribution and change notice required; no NC clause; bans re-identification; no added terms downstream | 5,033 cases / 10,407 images in the released CSVs (the paper reports 5,749 submissions). US crowdsourced smartphone photos | Up to 3 dermatologists give weighted differentials (three gradability columns in `scin_labels.csv`); **no biopsy**. Ward 2024, *JAMA Netw Open* 7:e2446615, doi:10.1001/jamanetworkopen.2024.46615, PMID 39565619 | Self-reported FST, dermatologist-estimated FST (I 391, II 1,432, III 1,332, IV 719, V 359, VI 69, blank 731), layperson Monk | **Permissive but not CC BY.** Usable only if the project accepts a non-CC licence for one module. Decision needed. |
| Fitzpatrick17k | **CC BY-NC-SA 3.0**. Confirmed, https://github.com/mattgroh/fitzpatrick17k | 16,577 clinical images, 114 conditions (53-653 each), scraped from DermaAmin and Atlas Dermatologico | Atlas labels; FST by Scale AI/Centaur crowd | FST I-VI | **No** |
| DDI (Stanford) | **Research Use Agreement**: non-commercial research only, no redistribution, no derivatives. Confirmed, https://ddi-dataset.github.io/ | 656 images / 570 patients | All biopsy-proven (Daneshjou 2022, *Sci Adv* 8:eabq6147, doi:10.1126/sciadv.abq6147, PMID 35960806) | FST I-II vs V-VI matched | **No** |
| DermNet | **CC BY-NC-ND 4.0** for watermarked images; AI training banned (cl. 25). Confirmed, https://dermnetnz.org/image-licence | ~25k+ clinical (count Unconfirmed) | Curated atlas | Not systematic | **No** |
| Derm7pt | **CC BY-NC-ND 4.0**, password request form. Confirmed, https://derm.cs.sfu.ca/Download.html (page refers to the "Atlas of Dermoscopy", 2,045 images; that this *is* Derm7pt is Unconfirmed, though the count matches) | ~1,011 cases, clinical+dermoscopic | 7-point criteria | None | **No** |
| PH2 | "Freely available for research and benchmarking" after registration; no CC licence found. **Unconfirmed**, https://www.fc.up.pt/addi/ph2%20database.html not read directly | 200 dermoscopic (80 common nevi, 80 atypical, 40 melanoma) | Histology + clinical | None | **No** (no grant to redistribute) |
| MRA-MIDAS (Stanford AIMI) | AIMI datasets are free "for non-commercial research use", with a commercial licence otherwise. Confirmed, https://aimi.stanford.edu/shared-datasets. Dataset-specific DUA **Unconfirmed** | 3,830 images, 1,290 lesions, 796 patients, dermoscopic + 15/30 cm clinical (Chiou et al. medRxiv 2024, doi:10.1101/2024.06.27.24309562; numbers via search, Unconfirmed) | Histopathology by 3 dermatopathologists | Patient FST recorded | **No** |
| SD-198 | No licence found; images from DermQuest (now Derm101). **Unconfirmed** | 6,584 clinical, 198 classes | Expert labels | None | **No** (no grant) |
| DermaMNIST | **CC BY-NC 4.0** (the rest of MedMNIST is CC BY). Confirmed, https://medmnist.com/ | Downsampled HAM10000 | — | — | **No** |
| PASSION (Sub-Saharan Africa, paediatric) | "PASSION data public license": non-commercial, no reposting. Confirmed, https://passionderm.github.io/ | 4,901 images / 1,653 patients; eczema, fungal, scabies, impetigo (Gottfrois et al., MICCAI 2024, arXiv 2411.04584) | Not described | FST V-VI by design (Unconfirmed counts) | **No**. The biggest loss for skin of colour. |
| DermaCon-IN (India) | **CC BY-NC-SA 4.0**. Confirmed, https://arxiv.org/html/2506.06099v2; Harvard Dataverse doi:10.7910/DVN/W7OUZM | 5,450 images / ~3,000 patients, 245 diagnoses | 4 dermatologists; consensus or follow-up; no biopsy | FST 3-4 / MST 4-9 predominant | **No** |
| Derm1M | **CC BY-NC 4.0** (GitHub SiyuanYan1/Derm1M and HF card, via search; Unconfirmed by direct read) | 403k images from YouTube, PubMed, forums | Text-derived | — | **No** |
| SkinCAP | Personal non-commercial research only (HF card, via search; Unconfirmed) | Derived from Fitzpatrick17k + DDI | — | — | **No** |
| Wikimedia Commons | Per file. Sampled licences (Confirmed, Commons API, 2026-10-17): Psoriasis 149 files, of which CC BY-SA 69, PD 29, CC BY 19, CC0 13; Atopic dermatitis 52, of which BY-SA 38, CC BY 11, PD 2; Urticaria 76, of which BY-SA 35, CC BY 18, PD 12, CC0 6 | Small: e.g. tinea corporis 20, pityriasis rosea 24, erythema migrans 19, impetigo 43 files | **Uploader-assigned; no verification**. Many diagrams/micrographs | None | Only the CC BY/CC0/PD subset, about 30-50% of files. **BY-SA is excluded by the stated rule.** Each image needs expert re-review. Supplement only. |
| PMC Open Access case reports / Open-i | Per article. Europe PMC `LICENSE:"cc by"` is an exact filter (checked: 380/380 psoriasis hits returned `license: "cc by"`). Confirmed | See section 2 table | Author diagnosis, often biopsy-backed | Rarely stated (0-5 per condition mention SOC/Black/Fitzpatrick in the abstract) | **Yes, legally, per figure.** Labour-intensive. Check figure-level third-party credits; crop identifiable features. |
| CDC PHIL | Public domain for most images (**Unconfirmed**: https://wwwn.cdc.gov/phil/About.aspx redirect not read) | Classic infectious rashes (measles, varicella, syphilis, smallpox, mpox) | CDC captions | — | Likely yes, per image. Verify per image. |

## 2. Viability by scope (redistributable images only)

**(a) Lesions / dermoscopy.** This scope is supported.

- About **22-25 classes reach at least 20 open dermoscopic items**, most of them histopathology-confirmed (counts in 1a).
- Thin or absent classes:
  - Pyogenic granuloma 11, Kaposi 16 and Paget 11 sit at the 12-20 margin.
  - Clear cell acanthoma, sebaceous hyperplasia and halo nevus have fewer than 12.
  - **Acral nevus vs acral melanoma is not fillable**: 7 + 11 open items, and BALD is NC.
  - Nodular BCC has only 20 subtyped; most BCCs are "NOS", so subtype classes need re-review or must stay "BCC".
- A **clinical-photo arm** (PAD-UFES-20 + HIBA + ISIC clinical) fills 6 classes with at least 20: BCC 999, AK 747, nevus 332, SCC 263, SK 256, melanoma 175. Dermatofibroma 22 is borderline.

**(b) General clinical derm (inflammatory, infectious, rashes).** No CC BY dataset with expert labels exists.

- **SCIN**, if its licence is accepted. Cases where the top weighted dermatologist label is at least 0.5 (2,224 cases):
  - 22 classes with at least 20 cases; 35 classes with at least 12.
  - Eczema 373; allergic contact dermatitis 232; urticaria 182; insect bite 144; folliculitis 101; psoriasis 65; tinea 61; herpes zoster 54; HSV 51; acne 50; pigmented purpuric eruption 45; impetigo 37; acute dermatitis NOS 37; pityriasis rosea 34; irritant contact dermatitis 33; tinea versicolor 32; ecchymoses 27; rosacea 25; leukocytoclastic vasculitis 24; keratosis pilaris 23; LSC 22; drug rash 20; molluscum 18; purpura 17; lichen planus 17; granuloma annulare 16; verruca 13; seborrheic dermatitis 13.
  - Absent or too thin for exam-relevant classes: scabies 8, SJS/TEN, secondary syphilis, erythema migrans, bullous pemphigoid, pemphigus, measles, varicella, HS, vitiligo.
- **CC BY case reports** (Europe PMC: title match, case report, OA, CC BY/CC0; figures not yet counted). Many reports will have no clinical photo, so the usable yield is lower than these counts.

| Condition | CC BY/CC0 case reports |
|---|---|
| Psoriasis | 380 |
| Dermatomyositis | 352 |
| Cellulitis | 268 |
| Herpes zoster | 217 |
| Pyoderma gangrenosum | 201 |
| Bullous pemphigoid | 181 |
| Lichen planus | 174 |
| Atopic dermatitis | 162 |
| SJS | 141 |
| Hidradenitis suppurativa | 135 |
| Vitiligo | 131 |
| DRESS | 106 |
| Pemphigus vulgaris | 101 |
| Erythema multiforme | 84 |
| Secondary syphilis | 77 |
| Morphea | 63 |
| Mpox | 62 |
| Scabies | 59 |
| Sweet syndrome | 59 |
| Erythema nodosum | 58 |
| Granuloma annulare | 53 |
| Discoid lupus | 40 |
| Urticarial vasculitis | 26 |
| Molluscum | 25 |
| Acanthosis nigricans | 25 |
| Pityriasis rosea | 16 |
| Tinea corporis | 15 |
| Dermatitis herpetiformis | 10 |
| Erythema migrans | 8 |
| Impetigo | 6 |
| Tinea versicolor | 2 |

  - These reports skew toward rare and severe presentations, the opposite of the common-rash gap that SCIN covers.
- **Combined estimate:** SCIN plus curated case reports could fill about **25-30 rash classes**. That would take hundreds of hours of figure curation and expert re-labelling, and labels would be weaker than the lesion arm's biopsy ground truth.

**Dark skin (Fitzpatrick IV-VI) per class:**

- **Lesions:** FST IV-VI open items with any diagnosis: nevus 59, BCC 25, SK 15, AK 13, SCC 5, melanoma 7, DF 2. Only 4 classes reach 12, and they are almost all PAD-UFES clinical photos. **Not feasible.**
- **SCIN** (dermatologist-estimated FST, top-label weight of at least 0.5):

| Class | FST IV-VI cases |
|---|---|
| Eczema | 84 |
| Allergic contact dermatitis | 42 |
| Urticaria | 41 |
| Folliculitis | 28 |
| Insect bite | 16 |
| HSV | 16 |
| Tinea | 14 |
| Acne | 14 |
| Chronic dermatitis NOS | 14 |
| Pityriasis rosea | 13 |
| Psoriasis | 12 |

  - That is **11 classes with at least 12 FST IV-VI cases**. Only eczema (35) and urticaria (13) reach 12 at **FST V-VI**. Monk 7 or above reaches 12 in one class.
  - With any top label (no weight threshold) the figures are 15 classes at IV-VI and 3 at V-VI.
- **Verdict:** a stratified (FST I-III vs IV-VI) difficulty comparison is feasible for about **10 rash classes**, and only with SCIN. It is not feasible for lesions. A V-VI-specific map is not feasible with open data. The datasets built for skin of colour (DDI, PASSION, DermaCon-IN, Fitzpatrick17k) are all NC or DUA-gated.

**Recommendation:** build the lesion trainer (about 24 dermoscopic classes plus a 6-class clinical arm). Treat skin tone as a reported covariate in the clinical arm and in a SCIN-based optional rash module. If a skin-of-colour paper is wanted, the realistic route is new consented CC BY photography at AWSOM clinics, or asking the PASSION or DDI owners for a CC BY subset. Both routes are partnerships, not downloads.

## 3. Prior work

### Tools

| Tool | Open source? | Images | Spaced repetition / adaptive | Item data released | Evidence |
|---|---|---|---|---|---|
| **Dermatology PALMs** (Kellman, Krasne; Insight Learning Technology) - https://insightlt.com/site/research-dermatology.php | No (commercial) | Proprietary | Adaptive sequencing + category retirement (ARTS) | No | Rimoin L, Altieri L, Craft N, Krasne S, Kellman PJ. *J Am Acad Dermatol* 2015;72(3):489-95. doi:10.1016/j.jaad.2014.11.016, PMID 25592621. Confirmed via Europe PMC. Preclerkship students; controlled before-after; ES 1.1-2.2, p<.0001; retention at 1 year; self-selected, single school. Kellman PJ, Krasne S, Massey CM, Mettler EW. *CogSci* 2023, PMID 38174054, PMC10764053. Confirmed: skin-cancer PALM, 10 cancer and confusable lesion types; SDT-based sequencing and retirement; undergraduates; adaptive >> video control. Botswana PALM poster (Slaught 2016), no data available (Confirmed: https://digitalcommons.providence.org/publications/10188). |
| **Finnish dermatology PLMs** (Salava, Salmela) | No | Not stated | Repeated PLMs, not scheduled | No | *Clin Exp Dermatol* 2022, doi:10.1111/ced.15201, PMID 35340060 (n=39; accuracy 66 to 94%). *JEADV* 2023, doi:10.1111/jdv.19058, PMID 36950946 (n=105; retained at 6-12 mo, n=33; hardest quartile reached 60%). *Clin Exp Dermatol* 2024, doi:10.1093/ced/llae063, PMID 38391032 (n=142; errors are systematic confusions between differentials, i.e. "similarity" errors). All Confirmed via Europe PMC. **The closest thing to a per-diagnosis difficulty analysis, but on unreleased images and data.** |
| Anki derm decks (Dermki etc.) | Anki is AGPL; decks are user content | DermNet/Dermoscopedia-derived, i.e. NC | Yes (SM-2/FSRS) | No | Azhar AF. *Cutis* 2023, doi:10.12788/cutis.0813, PMID 37611297. Review of 3 resident decks, no outcomes (Confirmed). |
| DermNet quizzes - https://dermnetnz.org/quizzes | No; CC BY-NC-ND | DermNet | No (10-case quizzes) | No | None |
| VisualDx | No; subscription (about $240/yr individual via AOA store, per search) | 14,000+ SOC images claimed (Unconfirmed) | No | No | Not an education trial |
| ETH Zürich "Dermoscopy Trainer" | Unconfirmed | Melanoma vs nevi | Unconfirmed | Unconfirmed | Search result only |
| ACTRA (radiology, Apache 2.0) | Yes | User-supplied | Yes | — | Search result only; not derm |
| ISIC education tools | None found; ISIC is a data archive, and no trainer was seen on isic-archive.com | — | — | — | Unconfirmed absence |

Conclusion on tools: every adaptive or perceptual derm trainer with evidence (PALM, the Finnish PLMs) is closed. Every deck with real images rests on NC images. **No open-source FSRS or spaced-repetition derm trainer on openly licensed images was found.**

### Spacing / scheduling in dermatology

- Boespflug A, Guerra J, Dalle S, Thomas L. Enhancement of customary dermoscopy education with spaced education e-learning: a prospective controlled trial. *JAMA Dermatol* 2015;151(8):847-53. doi:10.1001/jamadermatol.2015.0214, PMID 25902339. Confirmed (abstract via Europe PMC; page range from memory, Unconfirmed).
  - Participants were dermatologists and senior residents in Lyon CME, in sequential cohorts (control 2010-11, n=95; intervention 2012-13, n=96), so the study was **not randomised**.
  - Post-test at 4 months: 148.1 vs 145.7 of 160 (p=.02). A ceiling effect is evident.
- Seiverling EV et al. Distance learning and spaced review to complement dermoscopy training for primary care. *Dermatol Pract Concept* 2021;11(2):e2021009 (article number Unconfirmed). doi:10.5826/dpc.1102a30, PMID 33954013. Confirmed.
  - n=27 primary-care clinicians; observational; 30-image test 20.3 to 24.6 to 27.6.
- No RCT of algorithmically scheduled (FSRS/SM-2) vs massed practice for derm image recognition in medical students was found (Europe PMC title searches for spaced/Anki/flashcard and interleaving combined with dermatology or skin returned none). Confirmed absence within those queries.
- Xu B, Rourke L, Robinson JK, Tanaka JW. Training melanoma detection in photographs using the perceptual expertise training approach. *Appl Cogn Psychol* 2016;30(5). Confirmed via author PDF (https://onlineacademiccommunity.uvic.ca/differentmindslab/wp-content/uploads/sites/3462/2020/02/Xu_Melanoma.pdf); DOI Unconfirmed.
  - Lay participants trained to 95%; better melanoma detection, fewer false alarms; retained at 1 week.
- Guégan S, Steichen O, Soria A. Literature review of perceptual learning modules in medical education: what can we conclude regarding dermatology? *Ann Dermatol Venereol* 2021. doi:10.1016/j.annder.2020.01.023, PMID 32654795. Confirmed.
  - Only 5 PLM studies in all of medicine to 2017; 2 randomised.

### Skin tone: representation and student accuracy

- **Fenton A, Elliott E, Shahbandi A, et al.** Medical students' ability to diagnose common dermatologic conditions in skin of color. *J Am Acad Dermatol* 2020;83(3):957-8. doi:10.1016/j.jaad.2019.12.078. Confirmed: https://pmc.ncbi.nlm.nih.gov/articles/PMC7447081.
  - 177 completers at Tulane and Oklahoma; 10 conditions, randomised to light or SOC versions.
  - SOC vs light accuracy: SCC 14.9% vs 45.6%; urticaria 57.5% vs 82.2%; atopic dermatitis 74.4% vs 86.2%. Tinea versicolor was *better* in SOC (62.1% vs 42.2%). 34% called SCC in SOC melanoma. Response rate was 16%.
- **Diao JA, Adamson AS.** Representation and misdiagnosis of dark skin in a large-scale visual diagnostic challenge. *J Am Acad Dermatol* 2022;86(4):950-1. doi:10.1016/j.jaad.2021.03.088, PMID 33812954. Citation Confirmed via Europe PMC.
  - The figures (NEJM Image Challenge; accuracy dark 44.3% vs intermediate 50.5% vs light 50.4%) come from a secondary citation (doi:10.36849/JDD.7581). The full text was paywalled (403), so **the numbers are Unconfirmed**.
- **Groh M, Badri O, Daneshjou R, et al.** Deep learning-aided decision support for diagnosis of skin disease across skin tones. *Nat Med* 2024;30:573-83. doi:10.1038/s41591-023-02728-3, PMID 38317019, PMC10878981. Confirmed.
  - 389 dermatologists and 459 PCPs; 364 images, 46 diseases.
  - Top-4 accuracy was 38% for specialists and 19% for generalists, both **4 points worse on dark skin**. AI support widened the generalists' gap.
- **Hardin J, Mourad A, Desy J, et al.** Mitigating diagnostic performance bias in a skin-tone balanced dermatology curriculum. *Clin Teach* 2023. doi:10.1111/tct.13613, PMID 37649356. Confirmed.
  - Randomised, first-year students, 92 participants; week-1 SOC vs light-skin "cards", then combined training.
  - The skin-tone gap fell from 5.8% to -1.4% and from 7.8% to -4.0%. Two weeks only; **no retention test**.
- **Lee AD, Thandi A, Choi J, et al.** Training medical students/medical practitioners to diagnose dermatologic conditions in skin of color: a systematic review of educational interventions. *J Cutan Med Surg* 2026. doi:10.1177/12034754251408403, PMID 41571279, PMC13478447. Confirmed.
  - 8 studies, 667 participants; mostly single-session; mostly self-report; **"absence of long-term retention data"**; melanoma in dark skin is persistently hard.
- Han J et al. *Dermatol Online J* 2023. doi:10.5070/d329662989, PMID 38478660. Confirmed: 1-hour SOC lecture, n=43, pre/post.
- **Adelekun A, Onyekaba G, Lipoff JB.** Skin color in dermatology textbooks: an updated evaluation and analysis. *J Am Acad Dermatol* 2021;84(1):194-6. doi:10.1016/j.jaad.2020.04.084, PMID 32335181. Citation Confirmed; **numbers Unconfirmed**, since the full text was 403 and the letter has no abstract.
- **Louie P, Wilkes R.** Representations of race and skin tone in medical textbook imagery. *Soc Sci Med* 2018;202:38-42. doi:10.1016/j.socscimed.2018.02.023, PMID 29501717. Confirmed abstract: 4,146 images in 4 anatomy/physical-exam texts; 74.5% light, 21% medium, **4.5% dark** skin tone.
- Alvarado SM, Feng H. Representation of dark skin images of common dermatologic conditions in educational resources. *J Am Acad Dermatol* 2021;84(5):1427-31. doi:10.1016/j.jaad.2020.06.041, PMID 32565205. Citation Confirmed.
- Rattan R, Wang RX, Chu L, Kaunitz G. Skin tone representation in preclinical dermatology education: a cross-sectional curricular audit. *J Natl Med Assoc* 2026. doi:10.1016/j.jnma.2026.06.010, PMID 42436072. Confirmed: UCSD, 507 images; 60% light, 29% medium, 11% dark.
- SkinMap (arXiv 2601.00840, 2026): across more than 1.1M public derm images, FST V-VI make up 5.8%. Confirmed from the abstract.

### What remains open (the gap)

1. An **individually randomised (within-student) FSRS-spaced vs massed** trial of derm image recognition in medical students with delayed retention of at least 8 weeks. The only spacing study (Boespflug) is non-randomised, in dermatologists, with a ceiling effect.
2. A **public per-diagnosis difficulty and confusion map** for students on openly licensed, biopsy-confirmed lesion images. Salava 2024 shows confusions are systematic, but on closed images.
3. **Released learner-response logs** over CC0/CC-BY images. No derm education study releases item data.
4. **Retention of skin-tone gains.** Lee 2026 found no long-term data. This is answerable only descriptively in a rash module (SCIN) and not at all for lesions on open data.
5. An open replication of PALM-style adaptive perceptual learning (Rimoin 2015) with an open scheduler and open data.

## 4. Recommended scope, classes, sources, risks

**Scope:** an open lesion-recognition trainer.

- The **dermoscopy arm** has 24 classes. The **clinical-photo arm** has 6 classes on the same diagnoses.
- Within-student spaced-vs-massed design, as in the ECG project.
- Normal-variant foils: common nevi, plus MSKCC Skin Tone benign images on dark skin.
- Optional later module: SCIN rashes (about 20 classes), only if the SCIN licence is accepted as compatible.

**Candidate classes.** n = open dermoscopic count [histopathology-confirmed].

| # | Class | n | Main confusable partner(s) | Sources |
|---|---|---|---|---|
| 1 | Common (banal) nevus: junctional/compound/dermal | 27,570 total; subtyped 4,131 | dysplastic nevus; dermal nevus vs acrochordon | SONIC, MSK, DERM12345, IMA++ |
| 2 | Dysplastic (atypical/Clark) nevus | 7,958 | melanoma in situ | IMA++, DERM12345, ISIC 2016/17 |
| 3 | Congenital nevus | 556 | melanoma arising in nevus | ISIC CC0/CC-BY |
| 4 | Blue nevus | 73 | nodular melanoma, melanoma metastasis | ISIC |
| 5 | Spitz/Reed nevus | 69 | melanoma | ISIC |
| 6 | Melanoma in situ (non-LM) | ~1,000 | dysplastic nevus | ISIC (histo) |
| 7 | Lentigo maligna (MIS, LM type) | 163 | solar lentigo, pigmented AK, LPLK | ISIC (histo) |
| 8 | Invasive melanoma, superficial spreading | 141 (+ NOS ~1,100 to subtype) | dysplastic nevus, SK | ISIC (histo) |
| 9 | Nodular melanoma | 90 | blue nevus, hemangioma, pyogenic granuloma, nodular BCC | ISIC (histo) |
| 10 | Melanoma metastasis (cutaneous) | 39 | blue nevus, hemangioma | ISIC |
| 11 | Seborrheic keratosis | 1,817 [1,039] | melanoma; verruca | MSK, DERM12345, ISIC 2017 |
| 12 | Solar lentigo | 407 [325] | lentigo maligna | ISIC |
| 13 | Lichen planus-like keratosis | 347 [335] | BCC, MIS, regressing melanoma | MSK |
| 14 | Dermatofibroma | 294 | nevus, scar | DERM12345, HIBA, MSK |
| 15 | Hemangioma (cherry and other) | 227 | angiokeratoma, nodular melanoma | DERM12345, MSK |
| 16 | Angiokeratoma | 65 | hemangioma, melanoma | DERM12345, ISIC |
| 17 | Acrochordon (fibroepithelial polyp) | 301 [267] | dermal nevus, neurofibroma (26) | MSK-2 |
| 18 | Verruca | 97 [93] | SK, SCC | MSK-3 |
| 19 | Actinic keratosis | 567 [475] | Bowen, superficial BCC, LM | MSK, DERM12345 (+ PAD-UFES clinical 730) |
| 20 | Bowen disease (SCC in situ) | 253 [253] | AK, superficial BCC, psoriasis plaque | MSK-2 |
| 21 | Invasive SCC incl. keratoacanthoma-type | 660 + 35 | nodular BCC, hypertrophic AK, verruca | ISIC, DERM12345 |
| 22 | BCC (pigmented/nodular) | 1,810 (subtype-specific 20 nodular) | melanoma, LPLK, dermal nevus | MSK, DERM12345, HIBA |
| 23 | Superficial BCC | 71 | Bowen, AK, LPLK | ISIC |
| 24 | Kaposi sarcoma / pyogenic granuloma (merge or drop) | 16 / 11 | hemangioma, nodular melanoma | DERM12345; below threshold |
| C1-C6 | Clinical-photo arm: BCC, AK, SCC (incl. Bowen), SK, nevus, melanoma | 999 / 747 / 263 / 256 / 332 / 175 | same as above | PAD-UFES-20 (CC BY 4.0), HIBA (CC-BY), ISIC clinical |

Dropped for lack of open data: acral nevus vs acral melanoma (BALD is NC), halo nevus, clear cell acanthoma, sebaceous hyperplasia, Paget disease.

**Optional rash module (SCIN, if accepted), about 20 classes with at least 20 cases:**

- Eczema; allergic contact dermatitis; irritant contact dermatitis; urticaria; insect bite; folliculitis; acne; rosacea; psoriasis; tinea; tinea versicolor; pityriasis rosea; herpes zoster; herpes simplex; impetigo; pigmented purpuric eruption; leukocytoclastic vasculitis; keratosis pilaris; lichen simplex chronicus; drug rash.
- Fewer than 20 cases: molluscum, lichen planus, granuloma annulare.

Confusable sets:
- tinea vs nummular eczema vs psoriasis
- pityriasis rosea vs tinea
- zoster vs HSV vs impetigo
- folliculitis vs acne
- urticaria vs insect bite vs drug rash
- ACD vs ICD

Classic exam rashes need curated CC BY case-report figures or CDC PHIL: SJS, secondary syphilis, erythema migrans, BP vs pemphigus, measles, varicella.

**Main risks:**

1. **Licence hygiene at the image level.**
   - The ISIC collections that matter mix licences (ISIC-DICM-17K, the melanoma/nevus histopathology collection, the 2019 and 2020 challenges), so the bank must be built from `copyright_license`, never from collection membership.
   - Store `isic_id`, `copyright_license` and `attribution` for every item, and generate the credits page from them.
   - The CC BY version behind "CC-BY" is Unconfirmed; ask support@isic-archive.com.
2. **SCIN is not CC BY.** It is permissive and redistributable, but it carries a re-identification ban and "no additional terms". Bundling it means the release is "CC BY + SCIN licence", which breaks the "CC BY or CC0 only" rule. Decide explicitly or leave it out.
3. **Label quality.**
   - About half of open dermoscopic labels are "single image expert consensus" or "single contributor clinical assessment", not histopathology.
   - For melanocytic classes, use the histopathology subset (14,969). For benign classes like hemangioma and DF (54 and 87 histo), accept consensus labels with a disclosed confirm type.
   - Subtype labels (BCC, melanoma) are sparse; most are "NOS".
   - A dermatologist must sign off a teaching subset, as the cardiologist did for ECG.
4. **Skin-tone bias baked into the bank.**
   - Open lesion data is overwhelmingly FST I-III, consistent with SkinMap's 5.8% V-VI across all public data.
   - A lesion trainer built from it reproduces the textbook problem that Louie, Adelekun, Alvarado and Rattan document. Reviewers will raise this.
   - Mitigations: state it, report FST where known, and propose new consented CC BY local photography as phase 2.
5. **Image privacy for case-report and Commons images.** CC BY clears copyright, not consent. Use only journal-published, consented figures; crop faces, tattoos and identifying marks; and record figure-level credits, since some CC BY articles reuse third-party images.
6. **The commercial competitor is the evidence base.** PALMs (Insight Learning) have a strong 2015 result and adaptive sequencing already. The novelty is openness (images, code, scheduler, logs) and the randomised spacing design, not "adaptive learning" itself.
7. **Ceiling and floor effects.** Boespflug's post-test sat at 92%, while Salava's hardest-quartile items reached only 60%. Calibrate item difficulty with a pilot, as planned for ECG.
8. **FSRS was fitted on flashcard recall**, not perceptual category learning. Default parameters may mis-schedule, as noted for the ECG project.
9. **Not opened / to verify:**
   - ISIC CC-BY version
   - SCIN licence text (only the fetched summary was read)
   - MRA-MIDAS DUA
   - PH2 and SD-198 terms
   - whether the SFU "Atlas of Dermoscopy" page is Derm7pt
   - Diao 2022 and Adelekun 2021 figures
   - CDC PHIL copyright page
   - Boespflug page range
   - VisualDx image count
   - any ISIC-hosted education tool
   - the Kellman PALM image source and licence
   - per-class figure yield of the CC BY case reports
