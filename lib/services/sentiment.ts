export interface SentimentResult {
  sentimentScore: number
  sentimentLabel: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED"
}

export interface SentimentSummary {
  totalComments: number
  analyzed: number
  distribution: { label: string; count: number; percentage: number }[]
  averageScore: number | null
}

export async function analyzeComment(_comment: string): Promise<SentimentResult> {
  return { sentimentScore: 0.75, sentimentLabel: "POSITIVE" }
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
