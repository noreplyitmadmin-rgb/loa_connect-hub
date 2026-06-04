import { supabase } from "@/lib/supabase"

async function analyzeSentiment(text: string): Promise<{ score: number; label: string }> {
  const apiKey = process.env.SENTIMENT_API_KEY
  const apiUrl = process.env.SENTIMENT_API_URL || "https://api.openai.com/v1/chat/completions"

  if (!apiKey) {
    return { score: 0, label: "neutral" }
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Analyze the sentiment of the following evaluation comment. Respond with a JSON object containing 'score' (a decimal between -1.0 and 1.0) and 'label' (one of: positive, negative, neutral).",
          },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    })

    if (!res.ok) {
      console.error("[sentiment] API error:", res.status, await res.text())
      return { score: 0, label: "neutral" }
    }

    const body = await res.json()
    const content = body.choices?.[0]?.message?.content
    if (!content) return { score: 0, label: "neutral" }

    const parsed = JSON.parse(content)
    return { score: parsed.score ?? 0, label: parsed.label ?? "neutral" }
  } catch (err) {
    console.error("[sentiment] Analysis failed:", err)
    return { score: 0, label: "neutral" }
  }
}

export async function analyzeEvaluationComment(evaluationId: string, comment: string) {
  const result = await analyzeSentiment(comment)
  const { error } = await supabase
    .from("evaluation_comments")
    .update({
      sentimentScore: result.score,
      sentimentLabel: result.label,
      sentimentAnalyzedAt: new Date().toISOString(),
    })
    .eq("evaluationId", evaluationId)
    .eq("comment", comment)
  if (error) throw error
  return result
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
    const sentiment = await analyzeSentiment(row.comment)
    results.push({ id: row.id, ...sentiment })
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
