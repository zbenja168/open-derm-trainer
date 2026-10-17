import type { Card } from 'ts-fsrs'

export type SetId = 'A' | 'B'
export type ImageType = 'dermoscopic' | 'clinical'

export interface DermClass {
  id: string
  group: string
  name: string
  set: SetId | 'both'
  imageType: ImageType
  available: boolean
}

export interface Item {
  /** ISIC image id */
  id: string
  classId: string
  acceptable: string[]
  set: SetId | 'both'
  /** test items are held out for the retention test and never served in practice */
  split: 'practice' | 'test'
  source: string
  imageType: ImageType
  /** ISIC diagnosis path, e.g. "Melanoma in situ > Melanoma in situ, Lentigo maligna type" */
  diagnosis: string
  confirmType: string
  fitzpatrick: string | null
  site: string | null
  patient: string | null
  license: 'CC-0' | 'CC-BY'
  attribution: string
  sourceUrl: string
  image: string
}

/** A = set A spaced and set B massed; B = the reverse. */
export type Counterbalance = 'A-spaced' | 'B-spaced'
export type Condition = 'spaced' | 'massed' | 'foil'

export interface Participant {
  key: string
  counterbalance: Counterbalance
  createdAt: string
}

export interface ResponseLog {
  participant: string
  itemId: string
  classId: string
  answer: string
  correct: boolean
  confidence: number
  latencyMs: number
  shownAt: string
  answeredAt: string
  condition: Condition
  sessionId: string
  /** whether the viewer opened the zoom before answering */
  zoomed?: boolean
  /** FSRS rating given to the scheduler (spaced items only) */
  rating?: number
  stabilityBefore?: number
  stabilityAfter?: number
}

export interface Progress {
  participant: Participant
  cards: Record<string, Card>
  massedDone: string[]
  log: ResponseLog[]
}
