import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs'
import type { Condition, DermClass, Item, Progress } from './types'

// Default FSRS v6 parameters at launch; refitting on collected logs is a pre-registered secondary.
const scheduler = fsrs(generatorParameters({ enable_fuzz: true }))

export const NEW_PER_SESSION = 10
export const FOILS_PER_SESSION = 2

export interface QueueEntry {
  item: Item
  condition: Condition
}

export function spacedSet(p: Progress) {
  return p.participant.counterbalance === 'A-spaced' ? 'A' : 'B'
}

export function conditionOf(item: Item, p: Progress): Condition {
  if (item.set === 'both') return 'foil'
  return item.set === spacedSet(p) ? 'spaced' : 'massed'
}

/**
 * Map a response to an FSRS grade. Perceptual diagnosis has no self-graded recall, so
 * correctness plus confidence stands in: wrong = Again; right at confidence 1-2 = Hard,
 * 3-4 = Good, 5 = Easy.
 */
export function gradeFor(correct: boolean, confidence: number): Grade {
  if (!correct) return Rating.Again
  if (confidence <= 2) return Rating.Hard
  if (confidence <= 4) return Rating.Good
  return Rating.Easy
}

export function review(card: Card | undefined, grade: Grade, now: Date) {
  return scheduler.next(card ?? createEmptyCard(now), now, grade).card
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * One session:
 * 1. due spaced reviews, interleaved;
 * 2. up to NEW_PER_SESSION new spaced items;
 * 3. the next massed class as a single contiguous block;
 * 4. a couple of common-nevus foils, scattered through.
 * Held-out test items (split 'test') are never served here.
 * In the trial the massed blocks are pinned to calendar dates; here it is one block per session.
 */
export function buildSession(allItems: Item[], classes: DermClass[], p: Progress, now: Date): QueueEntry[] {
  const items = practiceItems(allItems)
  const spaced = items.filter((i) => conditionOf(i, p) === 'spaced')
  const due = spaced.filter((i) => p.cards[i.id] && new Date(p.cards[i.id].due) <= now)
  const fresh = shuffle(spaced.filter((i) => !p.cards[i.id])).slice(0, NEW_PER_SESSION)
  const spacedQueue: QueueEntry[] = shuffle([...due, ...fresh]).map((item) => ({ item, condition: 'spaced' }))

  const massedClass = classes.find(
    (c) => c.available && c.set !== 'both' && c.set !== spacedSet(p) && !p.massedDone.includes(c.id),
  )
  const massedQueue: QueueEntry[] = massedClass
    ? shuffle(items.filter((i) => i.classId === massedClass.id)).map((item) => ({ item, condition: 'massed' }))
    : []

  const foils: QueueEntry[] = shuffle(items.filter((i) => i.set === 'both'))
    .slice(0, FOILS_PER_SESSION)
    .map((item) => ({ item, condition: 'foil' }))

  const queue = [...spacedQueue]
  for (const f of foils) queue.splice(Math.floor(Math.random() * (queue.length + 1)), 0, f)
  return [...queue, ...massedQueue]
}

export function practiceItems(items: Item[]) {
  return items.filter((i) => i.split === 'practice')
}

export function nextDue(items: Item[], p: Progress): Date | null {
  const dues = practiceItems(items)
    .filter((i) => conditionOf(i, p) === 'spaced' && p.cards[i.id])
    .map((i) => new Date(p.cards[i.id].due).getTime())
  return dues.length ? new Date(Math.min(...dues)) : null
}
