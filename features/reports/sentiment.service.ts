import { supabase } from "@/lib/db"
import { analyzeComment } from "@/lib/services/sentiment"

export async function analyzeEvaluationComment(evaluationId: string, comment: string) {
  const result = await analyzeComment(comment)
  const { error } = await supabase
    .from("evaluation_comments")
    .update({
      sentimentScore: result.sentimentScore,
      sentimentLabel: result.sentimentLabel,
      sentimentAnalyzedAt: new Date().toISOString(),
    })
    .eq("evaluationId", evaluationId)
    .eq("comment", comment)
  if (error) throw error
  return { score: result.sentimentScore, label: result.sentimentLabel }
}

export async function batchAnalyzeUnanalyzedComments() {
  const { data, error } = await supabase
    .from("evaluation_comments")
    .select("id, comment")
    .is("sentimentAnalyzedAt", null)
    .limit(50)
  if (error) throw error

  const results: { id: string; score: number; label: string }[] = []
  for (const row of data) {
    const sentiment = await analyzeComment(row.comment)
    results.push({ id: row.id, score: sentiment.sentimentScore, label: sentiment.sentimentLabel })
  }

  for (const r of results) {
    const { error: upErr } = await supabase
      .from("evaluation_comments")
      .update({
        sentimentScore: r.score,
        sentimentLabel: r.label,
        sentimentAnalyzedAt: new Date().toISOString(),
      })
      .eq("id", r.id)
    if (upErr) console.error("[sentiment] batch update failed:", upErr)
  }

  return { analyzed: results.length }
}
