import { NextRequest, NextResponse } from "next/server"
import { analyzeComment } from "@/lib/services/sentiment"

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text")

  if (text) {
    try {
      const result = await analyzeComment(text)
      return NextResponse.json({
        text,
        sentimentScore: result.sentimentScore,
        sentimentLabel: result.sentimentLabel,
      })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  const start = Date.now()
  let sentimentReady = false
  let sentimentError: string | null = null

  try {
    await analyzeComment("warmup")
    sentimentReady = true
  } catch (e) {
    sentimentError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    status: "ok",
    uptimeMs: start,
    sentiment: {
      ready: sentimentReady,
      engine: process.env.SENTIMENT_ENGINE ?? "custom",
      error: sentimentError,
    },
  })
}
