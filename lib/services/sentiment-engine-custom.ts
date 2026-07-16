import positiveSeed from "../../data/sentiment/positive.json"
import negativeSeed from "../../data/sentiment/negative.json"
import neutralSeed from "../../data/sentiment/neutral.json"
import gibberishEncoded from "../../data/sentiment/gibberish.encoded.json"
import inappropriateEncoded from "../../data/sentiment/inappropriate.encoded.json"
import lexicon from "../../data/sentiment/lexicon.json"

const INAPPROPRIATE = new Set(
  (inappropriateEncoded as string[]).map((w) =>
    decodeURIComponent(w)
  )
)
const LEXICON = lexicon as Record<string, number>

export interface SentimentResult {
  sentimentScore: number
  sentimentLabel: "positive" | "negative" | "neutral" | "gibberish"
}

export interface SentimentSummary {
  totalComments: number
  analyzed: number
  distribution: { label: string; count: number; percentage: number }[]
  averageScore: number | null
}

let centroids: Record<string, number[]> | null = null
let vocab: string[] | null = null

const NGRAM_RANGE: [number, number] = [2, 5]
const NEGATION_WORDS = new Set([
  "not", "no", "never", "neither", "nor", "nowhere",
  "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't",
  "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't",
  "n't",
  "di", "hindi", "wala", "ayaw", "huwag", "walang",
])
const CONTRAST_WORDS = /\b(pero|but|however|although|though|subalit|gayunpaman|gayunman|samantala|whereas|while|yet|nevertheless|on the other hand|sa kabila nito)\b/gi

function decodeGibberish(): { text: string; label: string }[] {
  return (gibberishEncoded as { text: string; label: string }[]).map((d) => ({
    ...d,
    text: Buffer.from(d.text, "base64").toString("utf-8"),
  }))
}

function loadSeed(): { text: string; label: string }[] {
  return [
    ...(positiveSeed as { text: string; label: string }[]),
    ...(negativeSeed as { text: string; label: string }[]),
    ...(neutralSeed as { text: string; label: string }[]),
    ...decodeGibberish(),
  ]
}

function applyNegation(text: string): string {
  const words = text.toLowerCase().split(/\s+/)
  const result: string[] = []
  let negateNext = 0
  for (const word of words) {
    if (negateNext > 0) {
      result.push(`NOT_${word}`)
      negateNext--
    } else {
      result.push(word)
    }
    if (NEGATION_WORDS.has(word.replace(/[^a-z']/g, ""))) {
      negateNext = 2
    }
  }
  return result.join(" ")
}

function preprocess(text: string): { segments: string[]; weights: number[] } {
  const negated = applyNegation(text)
  const parts = negated.split(CONTRAST_WORDS)
  if (parts.length <= 1) {
    return { segments: [negated], weights: [1] }
  }
  return {
    segments: [parts[0].trim(), parts.slice(2).join(" ").trim()],
    weights: [1, 2],
  }
}

function extractNgrams(text: string, weight: number = 1): string[] {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s_]/g, "")
  const ngrams: string[] = []
  for (let w = 0; w < weight; w++) {
    for (let len = NGRAM_RANGE[0]; len <= NGRAM_RANGE[1]; len++) {
      for (let i = 0; i <= cleaned.length - len; i++) {
        ngrams.push(cleaned.slice(i, i + len))
      }
    }
  }
  return ngrams
}

function vectorize(text: string, vocabulary: string[]): number[] {
  const { segments, weights } = preprocess(text)
  const counts = new Map<string, number>()
  for (let i = 0; i < segments.length; i++) {
    const ngrams = extractNgrams(segments[i], weights[i])
    for (const ng of ngrams) {
      counts.set(ng, (counts.get(ng) || 0) + 1)
    }
  }
  const vec = vocabulary.map((w) => Math.log(1 + (counts.get(w) || 0)))
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  if (norm === 0) return vec
  return vec.map((v) => v / norm)
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

function train(): { vocabulary: string[]; centroids: Record<string, number[]> } {
  const docs = loadSeed()

  const ngramSet = new Set<string>()
  const labelDocs: Record<string, number[][]> = {}

  for (const doc of docs) {
    const { segments, weights } = preprocess(doc.text)
    for (let i = 0; i < segments.length; i++) {
      const ngrams = extractNgrams(segments[i], weights[i])
      for (const ng of ngrams) ngramSet.add(ng)
    }
    if (!labelDocs[doc.label]) labelDocs[doc.label] = []
  }

  const vocabulary = Array.from(ngramSet)

  for (const doc of docs) {
    const vec = vectorize(doc.text, vocabulary)
    labelDocs[doc.label].push(vec)
  }

  const centroids: Record<string, number[]> = {}
  for (const [label, vecs] of Object.entries(labelDocs)) {
    const dim = vecs[0].length
    const avg = new Array(dim).fill(0)
    for (const v of vecs) {
      for (let i = 0; i < dim; i++) avg[i] += v[i]
    }
    for (let i = 0; i < dim; i++) avg[i] /= vecs.length
    const norm = Math.sqrt(avg.reduce((s, v) => s + v * v, 0))
    for (let i = 0; i < dim; i++) avg[i] /= norm || 1
    centroids[label] = avg
  }

  return { vocabulary, centroids }
}

function getModel(): { vocabulary: string[]; centroids: Record<string, number[]> } {
  if (!vocab || !centroids) {
    const model = train()
    vocab = model.vocabulary
    centroids = model.centroids
  }
  return { vocabulary: vocab, centroids }
}

function computeLexiconScore(text: string): number {
  const { segments } = preprocess(text)
  let total = 0
  let count = 0
  for (const segment of segments) {
    for (const word of segment.split(/\s+/)) {
      const negated = word.startsWith("NOT_")
      const root = negated ? word.slice(4) : word
      const polarity = LEXICON[root]
      if (polarity !== undefined) {
        total += negated ? -polarity : polarity
        count++
      }
    }
  }
  return count > 0 ? total / count : 0
}

export async function analyzeComment(text: string): Promise<SentimentResult> {
  const lower = text.toLowerCase()
  if (Array.from(INAPPROPRIATE).some((word) => lower.includes(word))) {
    return { sentimentScore: -0.5, sentimentLabel: "gibberish" }
  }

  const { vocabulary, centroids } = getModel()
  const queryVec = vectorize(text, vocabulary)

  const sims: Record<string, number> = {}
  for (const [label, centroid] of Object.entries(centroids)) {
    sims[label] = cosineSim(queryVec, centroid)
  }

  const lexiconScore = computeLexiconScore(text)

  const positive = sims["positive"] ?? 0
  const negative = sims["negative"] ?? 0
  const centroidScore = positive - negative

  const blendedScore = centroidScore * 0.7 + lexiconScore * 0.3

  const adjusted: Record<string, number> = {}
  for (const [label, sim] of Object.entries(sims)) {
    let bias = 0
    if (label === "positive") bias = lexiconScore * 0.2
    else if (label === "negative") bias = -lexiconScore * 0.2
    adjusted[label] = sim + bias
  }

  const top = Object.entries(adjusted).reduce((best, curr) => (curr[1] > best[1] ? curr : best))
  return { sentimentScore: parseFloat(blendedScore.toFixed(4)), sentimentLabel: top[0] as SentimentResult["sentimentLabel"] }
}

export async function batchAnalyze(_periodId?: string): Promise<number> {
  return 0
}

export async function getSentimentSummary(
  _periodId?: string,
  _departmentId?: string,
  _facultyId?: string,
): Promise<SentimentSummary> {
  return {
    totalComments: 0,
    analyzed: 0,
    distribution: [
      { label: "POSITIVE", count: 0, percentage: 0 },
      { label: "NEGATIVE", count: 0, percentage: 0 },
      { label: "NEUTRAL", count: 0, percentage: 0 },
      { label: "MIXED", count: 0, percentage: 0 },
    ],
    averageScore: null,
  }
}
