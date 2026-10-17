import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSession, conditionOf, gradeFor, nextDue, practiceItems, review, spacedSet, type QueueEntry } from './scheduler'
import { clear, download, load, logAsCsv, newProgress, save } from './storage'
import { useTheme } from './theme'
import type { DermClass, Item, Progress, ResponseLog } from './types'

type Screen = 'home' | 'practice' | 'done' | 'credits' | 'about'

const LICENSE_URL: Record<Item['license'], string> = {
  'CC-0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC-BY': 'https://creativecommons.org/licenses/by/4.0/',
}

export default function App() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [classes, setClasses] = useState<DermClass[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<Progress>(() => load() ?? newProgress())
  const [screen, setScreen] = useState<Screen>('home')
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [pos, setPos] = useState(0)
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    Promise.all([fetch('data/items.json'), fetch('data/classes.json')])
      .then(async ([a, b]) => {
        if (!a.ok || !b.ok) throw new Error('item bank failed to load')
        setItems(await a.json())
        setClasses(await b.json())
      })
      .catch((e) => setError(String(e)))
  }, [])

  useEffect(() => save(progress), [progress])

  if (error) return <Shell onNav={setScreen}><p className="text-danger">Could not load the item bank: {error}</p></Shell>
  if (!items) return <Shell onNav={setScreen}><p>Loading…</p></Shell>

  const start = () => {
    const q = buildSession(items, classes, progress, new Date())
    setQueue(q)
    setPos(0)
    setSessionId(new Date().toISOString())
    setScreen(q.length ? 'practice' : 'done')
  }

  const record = (entry: QueueEntry, response: ResponseLog) => {
    const id = entry.item.id
    let card = progress.cards[id]
    let log = response
    if (entry.condition === 'spaced') {
      const grade = gradeFor(log.correct, log.confidence)
      card = review(progress.cards[id], grade, new Date(log.answeredAt))
      log = { ...log, rating: grade, stabilityBefore: progress.cards[id]?.stability, stabilityAfter: card.stability }
    }
    const blockFinished = entry.condition === 'massed' && !queue.slice(pos + 1).some((q) => q.condition === 'massed')
    setProgress((p) => ({
      ...p,
      log: [...p.log, log],
      cards: entry.condition === 'spaced' ? { ...p.cards, [id]: card } : p.cards,
      massedDone: blockFinished && !p.massedDone.includes(entry.item.classId)
        ? [...p.massedDone, entry.item.classId] : p.massedDone,
    }))
  }

  const advance = () => (pos + 1 < queue.length ? setPos(pos + 1) : setScreen('done'))

  return (
    <Shell onNav={setScreen}>
      {screen === 'home' && (
        <Home items={items} classes={classes} progress={progress} onStart={start}
          onReset={(cb) => { clear(); setProgress(newProgress(cb)) }} />
      )}
      {screen === 'practice' && queue[pos] && (
        <Practice key={`${sessionId}-${pos}`} entry={queue[pos]} classes={classes} index={pos} total={queue.length}
          participant={progress.participant.key} sessionId={sessionId} onAnswer={record} onNext={advance} />
      )}
      {screen === 'done' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Session complete</h2>
          <p>{queue.length ? `${queue.length} images reviewed.` : 'Nothing is due right now.'}</p>
          <button className="btn" onClick={() => setScreen('home')}>Back to overview</button>
        </div>
      )}
      {screen === 'credits' && <Credits items={items} classes={classes} />}
      {screen === 'about' && <About />}
    </Shell>
  )
}

function Shell({ children, onNav }: { children: React.ReactNode; onNav: (s: Screen) => void }) {
  const { theme, cycle } = useTheme()
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <button className="text-2xl font-semibold tracking-tight" onClick={() => onNav('home')}>Open Derm Trainer</button>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-xs text-muted">prototype · items not yet dermatologist-reviewed</span>
          <button className="btn-quiet text-xs" onClick={() => onNav('about')}>About</button>
          <button className="btn-quiet text-xs" onClick={() => onNav('credits')}>Image credits</button>
          <button className="btn-quiet text-xs" onClick={cycle} title="Switch colour theme">
            Theme: {theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>
      {children}
      <footer className="mt-10 border-t border-line pt-3 text-xs text-muted">
        Images: ISIC Archive (isic-archive.com), each under its contributor's CC0 or CC BY licence; see Image
        credits. Not for clinical use. Code MIT.
      </footer>
    </div>
  )
}

function Home({ items, classes, progress, onStart, onReset }: {
  items: Item[]; classes: DermClass[]; progress: Progress
  onStart: () => void; onReset: (cb: Progress['participant']['counterbalance']) => void
}) {
  const practice = practiceItems(items)
  const due = nextDue(items, progress)
  const now = new Date()
  const dueCount = practice.filter((i) => conditionOf(i, progress) === 'spaced' && progress.cards[i.id]
    && new Date(progress.cards[i.id].due) <= now).length
  const byClass = useMemo(() => {
    const m = new Map<string, { n: number; right: number }>()
    for (const r of progress.log) {
      const s = m.get(r.classId) ?? { n: 0, right: 0 }
      s.n++
      if (r.correct) s.right++
      m.set(r.classId, s)
    }
    return m
  }, [progress.log])
  const spaced = spacedSet(progress)

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm text-muted">
          Participant <code>{progress.participant.key}</code> · set {spaced} spaced, set {spaced === 'A' ? 'B' : 'A'} massed
          · {progress.log.length} responses logged
        </p>
        <p className="mt-1 text-sm text-muted">
          {dueCount} spaced reviews due now
          {due && dueCount === 0 ? `; next due ${due.toLocaleString()}` : ''} · massed blocks done {progress.massedDone.length}
          · {practice.length} practice images, {items.length - practice.length} held out for testing
        </p>
        <button className="btn mt-4" onClick={onStart}>Start session</button>
      </section>

      {(['dermoscopic', 'clinical'] as const).map((t) => (
        <section key={t}>
          <h2 className="mb-2 font-semibold">{t === 'dermoscopic' ? 'Dermoscopy' : 'Clinical photographs'}: accuracy by class</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th>Class</th><th>Set</th><th>Seen</th><th>Correct</th></tr></thead>
            <tbody>
              {classes.filter((c) => c.available && c.imageType === t).map((c) => {
                const s = byClass.get(c.id)
                return (
                  <tr key={c.id} className="border-t border-line-soft">
                    <td className="py-1">{c.name}</td><td>{c.set}</td><td>{s?.n ?? 0}</td>
                    <td>{s ? `${Math.round((100 * s.right) / s.n)}%` : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ))}

      <section className="flex flex-wrap gap-2 text-sm">
        <button className="btn-quiet" onClick={() => download('responses.csv', logAsCsv(progress), 'text/csv')}>Export log (CSV)</button>
        <button className="btn-quiet" onClick={() => download('progress.json', JSON.stringify(progress, null, 1), 'application/json')}>Export everything (JSON)</button>
        <button className="btn-quiet" onClick={() => onReset('A-spaced')}>Reset as A-spaced</button>
        <button className="btn-quiet" onClick={() => onReset('B-spaced')}>Reset as B-spaced</button>
      </section>
    </div>
  )
}

function Practice({ entry, classes, index, total, participant, sessionId, onAnswer, onNext }: {
  entry: QueueEntry; classes: DermClass[]; index: number; total: number; participant: string; sessionId: string
  onAnswer: (e: QueueEntry, log: ResponseLog) => void; onNext: () => void
}) {
  const shownAt = useRef(new Date())
  const [answer, setAnswer] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [result, setResult] = useState<ResponseLog | null>(null)
  const [zoomOpen, setZoomOpen] = useState(false)
  const zoomed = useRef(false)
  const { item } = entry
  // a clinical photo is answered from the clinical classes, a dermoscopic image from the dermoscopic ones
  const options = classes.filter((c) => c.available && c.imageType === item.imageType)
  const groups = [...new Set(options.map((c) => c.group))]
  const nameOf = (id: string) => classes.find((c) => c.id === id)?.name ?? id

  const submit = () => {
    const answeredAt = new Date()
    const log: ResponseLog = {
      participant, sessionId, itemId: item.id, classId: item.classId, answer,
      correct: item.acceptable.includes(answer), confidence,
      latencyMs: answeredAt.getTime() - shownAt.current.getTime(),
      shownAt: shownAt.current.toISOString(), answeredAt: answeredAt.toISOString(),
      condition: entry.condition, zoomed: zoomed.current,
    }
    onAnswer(entry, log)
    setResult(log)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Image {index + 1} of {total} · {item.imageType === 'dermoscopic' ? 'dermoscopy' : 'clinical photograph'}
      </p>
      <button className="block w-full" onClick={() => { zoomed.current = true; setZoomOpen(true) }} title="Open zoom">
        {/* latency is timed from when the image is visible, not from when the screen mounted */}
        <img src={item.image} alt={item.imageType === 'dermoscopic' ? 'Dermoscopic image of a skin lesion' : 'Clinical photograph of a skin lesion'}
          className="mx-auto h-[min(60vh,560px)] w-full cursor-zoom-in rounded border border-line bg-black object-contain"
          onLoad={() => { shownAt.current = new Date() }} />
      </button>
      <p className="-mt-2 text-center text-xs text-muted">Tap the image to zoom</p>
      {zoomOpen && <Zoom src={item.image} onClose={() => setZoomOpen(false)} />}

      {!result ? (
        <>
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g}>
                <p className="text-xs uppercase tracking-wide text-muted">{g}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {options.filter((c) => c.group === g).map((c) => (
                    <button key={c.id} onClick={() => setAnswer(c.id)}
                      className={`chip ${answer === c.id ? 'chip-on' : ''}`}>{c.name}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Confidence</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setConfidence(n)}
                className={`chip w-9 justify-center ${confidence === n ? 'chip-on' : ''}`}>{n}</button>
            ))}
            <span className="text-xs text-muted">1 = guessing, 5 = certain</span>
          </div>
          <button className="btn" disabled={!answer || !confidence} onClick={submit}>Check</button>
        </>
      ) : (
        <div className={`rounded-lg border p-4 ${result.correct ? 'border-ok-line bg-ok' : 'border-bad-line bg-bad'}`}>
          <p className="font-semibold">{result.correct ? 'Correct' : `Not quite: you said ${nameOf(result.answer)}`}</p>
          <p className="mt-1">Label: <strong>{nameOf(item.classId)}</strong></p>
          <p className="mt-1 text-sm">Source diagnosis: {item.diagnosis} ({item.confirmType})</p>
          <p className="mt-1 text-xs text-muted">
            <a className="underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.id}</a> ·{' '}
            {item.attribution} · <a className="underline" href={LICENSE_URL[item.license]} target="_blank" rel="noreferrer">{item.license}</a>
            {item.site && <> · site: {item.site}</>}
          </p>
          <button className="btn mt-3" onClick={onNext} autoFocus>Next</button>
        </div>
      )}
    </div>
  )
}

/** Full-screen viewer: click or tap toggles 3x magnification centred on that point; move to pan; Esc closes. */
function Zoom({ src, onClose }: { src: string; onClose: () => void }) {
  const [mag, setMag] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-label="Zoomed image">
      <div className="flex items-center justify-between px-4 py-2 text-sm text-white">
        <span>{mag ? 'Move to pan · click to zoom out' : 'Click to magnify'}</span>
        <button className="rounded border border-white/40 px-3 py-1 hover:bg-white/10" onClick={onClose}>Close (Esc)</button>
      </div>
      <div className={`relative flex-1 overflow-hidden ${mag ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        onPointerMove={(e) => mag && at(e)}
        onClick={(e) => { at(e as unknown as React.PointerEvent<HTMLDivElement>); setMag((m) => !m) }}>
        <img src={src} alt="Zoomed lesion" draggable={false}
          className="h-full w-full select-none object-contain transition-transform duration-150"
          style={{ transform: mag ? 'scale(3)' : 'none', transformOrigin: origin }} />
      </div>
    </div>
  )
}

function Credits({ items, classes }: { items: Item[]; classes: DermClass[] }) {
  const nameOf = (id: string) => classes.find((c) => c.id === id)?.name ?? id
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id))
  const byLicense = items.reduce<Record<string, number>>((m, i) => ({ ...m, [i.license]: (m[i.license] ?? 0) + 1 }), {})
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Image credits</h2>
      <p className="text-sm">
        All {items.length} images come from the <a className="underline" href="https://www.isic-archive.com" target="_blank" rel="noreferrer">ISIC Archive</a>,
        each under the licence its contributor chose: {Object.entries(byLicense).map(([k, v]) => `${v} ${k}`).join(', ')}.
        Images were resized for the web; nothing else was changed. Clinical photographs are largely from PAD-UFES-20
        (Pacheco et al., Data in Brief 2020) and Hospital Italiano de Buenos Aires. Images under non-commercial licences
        are excluded.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted"><th>Image</th><th>Class</th><th>Licence</th><th>Attribution</th></tr></thead>
          <tbody>
            {sorted.map((i) => (
              <tr key={i.id} className="border-t border-line-soft align-top">
                <td className="py-1 pr-2"><a className="underline" href={i.sourceUrl} target="_blank" rel="noreferrer">{i.id}</a></td>
                <td className="pr-2">{nameOf(i.classId)}</td>
                <td className="pr-2"><a className="underline" href={LICENSE_URL[i.license]} target="_blank" rel="noreferrer">{i.license}</a></td>
                <td>{i.attribution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function About() {
  return (
    <div className="max-w-3xl space-y-3 text-sm leading-relaxed">
      <h2 className="text-xl font-semibold">About</h2>
      <p>
        Open Derm Trainer teaches recognition of common and important skin lesions from openly licensed,
        mostly biopsy-confirmed images. Spaced items are scheduled with FSRS; the rest are practised in blocks, so a
        planned study can compare the two within each student.
      </p>
      <p>
        <strong>Two kinds of image.</strong> Clinical photographs show the lesion as the eye sees it. Dermoscopic
        images are taken through a dermatoscope, a lit magnifier pressed on or held over the skin, which shows pigment
        and blood-vessel patterns below the surface. Each image is answered from the classes of its own kind.
      </p>
      <p className="text-muted">
        A dermoscopy primer, written and reviewed with a dermatologist, will go here before any study begins. Items
        have not yet been dermatologist-reviewed; this is a teaching prototype, not a diagnostic tool.
      </p>
      <p>
        Source: <a className="underline" href="https://github.com/zbenja168/open-derm-trainer" target="_blank" rel="noreferrer">github.com/zbenja168/open-derm-trainer</a>.
        Progress stays in this browser only.
      </p>
    </div>
  )
}
