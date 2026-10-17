import type { Card } from 'ts-fsrs'
import type { Counterbalance, Progress } from './types'

// Prototype storage: one browser, localStorage. The trial will need a server-side log (Firestore or
// Postgres) so responses survive cleared browsers and reach the analysis.
const KEY = 'open-derm-trainer/v1'

function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function newProgress(counterbalance?: Counterbalance): Progress {
  return {
    participant: {
      key: randomKey(),
      counterbalance: counterbalance ?? (Math.random() < 0.5 ? 'A-spaced' : 'B-spaced'),
      createdAt: new Date().toISOString(),
    },
    cards: {},
    massedDone: [],
    log: [],
  }
}

export function load(): Progress | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Progress
    for (const c of Object.values(p.cards) as Card[]) {
      c.due = new Date(c.due)
      if (c.last_review) c.last_review = new Date(c.last_review)
    }
    return p
  } catch {
    return null
  }
}

export function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // storage full or blocked; the in-memory session carries on, and export still works
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

export function logAsCsv(p: Progress) {
  const cols = ['participant', 'sessionId', 'itemId', 'classId', 'answer', 'correct', 'confidence', 'latencyMs',
    'condition', 'zoomed', 'rating', 'stabilityBefore', 'stabilityAfter', 'shownAt', 'answeredAt'] as const
  const rows = p.log.map((r) => cols.map((c) => String(r[c] ?? '')).join(','))
  return [cols.join(','), ...rows].join('\n')
}
