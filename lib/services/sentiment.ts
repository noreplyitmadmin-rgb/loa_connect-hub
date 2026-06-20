import { BayesClassifier } from "natural"
import seedData from "./sentiment-seed.json"

export interface SentimentResult {
  sentimentScore: number
  sentimentLabel: "positive" | "negative" | "neutral"
}

export interface SentimentSummary {
  totalComments: number
  analyzed: number
  distribution: { label: string; count: number; percentage: number }[]
  averageScore: number | null
}

let classifier: BayesClassifier | null = null

function getClassifier(): BayesClassifier {
  if (!classifier) {
    classifier = new BayesClassifier()
    for (const doc of seedData as { text: string; label: string }[]) {
      classifier.addDocument(doc.text.toLowerCase(), doc.label)
    }
    classifier.train()
  }
  return classifier
}

export async function analyzeComment(text: string): Promise<SentimentResult> {
  const cl = getClassifier()
  const classifications = cl.getClassifications(text.toLowerCase())
  const byLabel = Object.fromEntries(classifications.map((c) => [c.label, c.value]))
  const positive = byLabel["positive"] ?? 0
  const negative = byLabel["negative"] ?? 0
  const score = parseFloat((positive - negative).toFixed(4))
  const top = classifications.reduce((best, c) => (c.value > best.value ? c : best))
  return { sentimentScore: score, sentimentLabel: top.label as SentimentResult["sentimentLabel"] }
}

export async function batchAnalyze(_periodId?: string): Promise<number> {
  return 0
}

export async function getSentimentSummary(_periodId?: string, _departmentId?: string, _facultyId?: string): Promise<SentimentSummary> {
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
