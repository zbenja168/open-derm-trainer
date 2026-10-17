# Open Derm Trainer: web prototype

Ported from the [Open ECG Trainer](https://github.com/zbenja168/open-ecg-trainer) web app: React + Vite +
Tailwind, static, with no backend. Progress and the response log live in this browser's localStorage, and can be
exported as CSV or JSON from the overview screen.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (relative paths, GitHub Pages ready)
```

The item bank is generated, not hand-edited. Run `.venv/Scripts/python scripts/build_items.py` from the project
root. It writes `public/derm/*.jpg` (git-ignored; deployed only on `gh-pages`), `public/data/items.json` and
`public/data/classes.json`.

How a session works (`src/scheduler.ts`):
- **Practice items only.** Items with `split: "test"` are held out for the retention test and never served.
- **Spaced set:** due FSRS reviews, plus up to 10 new items, interleaved.
- **Massed set:** the next unfinished class, served as one contiguous block.
- **Common nevi:** two per session as foils, outside the spaced/massed contrast.
- **Answer options** are the classes of the image's own kind, so a clinical photograph is answered from the six
  clinical classes and a dermoscopic image from the dermoscopic ones.
- **FSRS grade:** a wrong answer is Again. A right answer is Hard at confidence 1-2, Good at 3-4 and Easy at 5.
  ts-fsrs runs with default v6 parameters.
- **Zoom:** tapping the image opens a full-screen viewer with 3x magnification; the log records whether the
  viewer was opened before answering (`zoomed`).

Not built yet: a server-side log, trial calendar dates for the massed blocks, the pre/post-test mode (which will
serve the `test` split), participant enrolment and the dermoscopy primer.
