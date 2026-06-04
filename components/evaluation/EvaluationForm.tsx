"use client"

import { RatingScale } from "./RatingScale"
import { CategoryProgressBar } from "./CategoryProgressBar"
import { useState } from "react"

interface RubricItem {
  id: string
  text: string
  displayOrder: number
  weight: number
}

interface RubricCategory {
  id: string
  name: string
  displayOrder: number
  items: RubricItem[]
}

interface EvaluationFormProps {
  categories: RubricCategory[]
  ratings: Record<string, number>
  onRatingChange: (itemId: string, value: number) => void
  comment: string
  onCommentChange: (value: string) => void
  onSubmit: () => void
  onSaveDraft: () => void
  submitting: boolean
}

export function EvaluationForm({
  categories,
  ratings,
  onRatingChange,
  comment,
  onCommentChange,
  onSubmit,
  onSaveDraft,
  submitting,
}: EvaluationFormProps) {
  const [showComment, setShowComment] = useState(false)

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0)
  const answeredItems = Object.keys(ratings).length
  const allAnswered = answeredItems === totalItems

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">Progress</span>
          <span className="text-xs text-tertiary">{answeredItems}/{totalItems} answered</span>
        </div>
        {categories.map((cat) => {
          const answered = cat.items.filter((i) => ratings[i.id] !== undefined).length
          return (
            <CategoryProgressBar
              key={cat.id}
              categoryName={cat.name}
              answered={answered}
              total={cat.items.length}
            />
          )
        })}
      </div>

      <div className="space-y-8">
        {categories.map((cat) => (
          <div key={cat.id}>
            <h3 className="text-sm font-bold text-primary mb-3">{cat.name}</h3>
            <div className="space-y-4">
              {cat.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4">
                  <p className="text-sm text-secondary flex-1 leading-relaxed">{item.text}</p>
                  <RatingScale
                    value={ratings[item.id] ?? null}
                    onChange={(v) => onRatingChange(item.id, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => setShowComment(!showComment)}
          className="text-sm text-blue-600 font-medium"
        >
          {showComment ? "Remove Comment" : "Add a Comment (Optional)"}
        </button>
        {showComment && (
          <textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Share your feedback about this faculty member..."
            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-h-24 resize-none"
          />
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={submitting}
          className="flex-1 py-2.5 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-secondary hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !allAnswered}
          className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Evaluation"}
        </button>
      </div>
    </div>
  )
}
