"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useApiGet, invalidate } from "@/lib/api/client"
import { IosSkeletonCard } from "@/components/ui/IosSkeleton"
import IosButton from "@/components/ui/IosButton"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

interface RubricItem {
  id: string
  categoryId: string
  text: string
  displayOrder: number
  weight: number
}

interface RubricCategory {
  id: string
  name: string
  semesterId: string
  items: RubricItem[]
}

interface Period {
  id: string
  name?: string
  title?: string
  isActive?: boolean
}

export default function RubricsPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")
  const [categories, setCategories] = useState<RubricCategory[]>([])
  const [saving, setSaving] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [lockedEndpoint, setLockedEndpoint] = useState("")

  const { data: periodsData, error: periodsError, isLoading: periodsLoading } = useApiGet<{ periods: Period[] }>("/api/evaluation-periods")

  const periods = useMemo(() => periodsData?.periods ?? [], [periodsData])

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const active = periods.find((p: Period) => p.isActive)
      if (active) Promise.resolve().then(() => setSelectedPeriodId(active.id))
    }
  }, [periods, selectedPeriodId])

  useEffect(() => {
    if (periodsError?.message?.includes("403")) Promise.resolve().then(() => setLockedEndpoint("/api/evaluation-periods"))
  }, [periodsError])

  const rubricUrl = selectedPeriodId ? `/api/evaluation-periods/${selectedPeriodId}/rubric` : null
  const { data: rubricData, error: rubricError, isLoading: rubricLoading } = useApiGet<{ rubric: RubricCategory[] }>(rubricUrl)

  useEffect(() => {
    if (rubricData?.rubric) Promise.resolve().then(() => setCategories(rubricData.rubric))
  }, [rubricData])

  useEffect(() => {
    if (rubricError?.message?.includes("403")) Promise.resolve().then(() => setLockedEndpoint(`/api/evaluation-periods/${selectedPeriodId}/rubric`))
  }, [rubricError, selectedPeriodId])

  const loading = periodsLoading || (!!rubricUrl && rubricLoading)

  const errorMessage =
    (periodsError && !periodsError.message.includes("403") ? periodsError.message : "") ||
    (rubricError && !rubricError.message.includes("403") ? rubricError.message : "")

  const addItem = useCallback(async (categoryId: string) => {
    const text = prompt("Item text:")
    if (!text || !rubricUrl) return
    try {
      const res = await fetch(`/api/evaluation-periods/${selectedPeriodId}/rubrics/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, text, displayOrder: 99, weight: 1 }),
      })
      const data = await res.json()
      if (data.item) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId ? { ...c, items: [...c.items, data.item] } : c
          )
        )
        invalidate(rubricUrl)
      }
    } catch {
      alert("Failed to add item")
    }
  }, [selectedPeriodId, rubricUrl])

  const updateItem = useCallback(async (itemId: string, categoryId: string, currentText: string) => {
    const text = prompt("Edit item text:", currentText)
    if (!text || text === currentText || !rubricUrl) return
    try {
      const res = await fetch(`/api/evaluation-periods/${selectedPeriodId}/rubrics/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.item) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId
              ? { ...c, items: c.items.map((i) => (i.id === itemId ? data.item : i)) }
              : c
          )
        )
        invalidate(rubricUrl)
      }
    } catch {
      alert("Failed to update item")
    }
  }, [selectedPeriodId, rubricUrl])

  const deleteItem = useCallback(async (itemId: string, categoryId: string) => {
    if (!confirm("Delete this item?") || !rubricUrl) return
    try {
      const res = await fetch(`/api/evaluation-periods/${selectedPeriodId}/rubrics/items/${itemId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
          )
        )
        invalidate(rubricUrl)
      }
    } catch {
      alert("Failed to delete item")
    }
  }, [selectedPeriodId, rubricUrl])

  // updateCategoryName and deleteCategory available for future use

  const saveAll = useCallback(async () => {
    if (!rubricUrl) return
    setSaving(true)
    try {
      const res = await fetch(`/api/evaluation-periods/${selectedPeriodId}/rubric`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      })
      const data = await res.json()
      if (data.rubric) {
        setCategories(data.rubric)
        invalidate(rubricUrl)
        alert("Rubric saved")
      }
    } catch {
      alert("Failed to save rubric")
    } finally {
      setSaving(false)
    }
  }, [selectedPeriodId, categories, rubricUrl])

  if (lockedEndpoint) {
    return (
      <div className="w-full space-y-8 pb-12 px-4 animate-ios-slide-in">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
    <div className="w-full space-y-6 pb-12 animate-ios-slide-in">
      <div className="flex items-start justify-between gap-4 px-4">
        <div>
          <h1 className="text-[28px] font-bold text-[var(--color-text)] tracking-tight">Rubric Editor</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Manage evaluation categories and items</p>
        </div>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="input text-sm min-w-[160px]"
        >
          <option value="">Select period...</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.name || p.title || p.id}</option>
          ))}
        </select>
      </div>

      {errorMessage && (
        <div className="px-4">
          <ErrorState message={errorMessage} onRetry={() => { setLockedEndpoint(""); invalidate("/api/evaluation-periods"); if (rubricUrl) invalidate(rubricUrl) }} />
        </div>
      )}

      {!errorMessage && <div className="px-4">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="ios-table-row w-full gap-2 !min-h-[44px]"
        >
          <svg className="w-4 h-4 text-[var(--color-system-blue)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[15px] text-[var(--color-text)] flex-1 text-left">How scoring works</span>
          <svg
            className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 ${showInfo ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showInfo && (
          <div className="ios-table-section mt-1">
            <div className="px-4 py-3 space-y-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              <p>
                <strong className="text-[var(--color-text)]">Fixed matrix.</strong> Each category contains items (criteria).
                Students rate every item on a <strong className="text-[var(--color-text)]">1–5 scale</strong>.
              </p>
              <p>
                <strong className="text-[var(--color-text)]">Category score</strong> = mean of all item ratings within that
                category across all responding students. Each item contributes equally.
              </p>
              <p>
                <strong className="text-[var(--color-text)]">General rating</strong> = mean of all 8 category scores.
                Every category carries equal weight.
              </p>
              <div className="border-t border-[var(--color-border)] pt-3">
                <p className="font-semibold text-[var(--color-text)] mb-1">Remarks</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span>≥ 4.50</span><span className="text-[var(--color-system-green)]">Outstanding</span>
                  <span>≥ 3.50</span><span className="text-[var(--color-system-blue)]">Very Satisfactory</span>
                  <span>≥ 2.50</span><span className="text-[var(--color-system-orange)]">Satisfactory</span>
                  <span>≥ 1.50</span><span className="text-[var(--color-system-yellow)]">Unsatisfactory</span>
                  <span>&lt; 1.50</span><span className="text-[var(--color-system-red)]">Poor</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>}

      {!errorMessage && (loading ? (
        <div className="space-y-3 px-4">
          <IosSkeletonCard />
          <IosSkeletonCard />
        </div>
      ) : categories.length === 0 ? (
        <div className="ios-table-section p-12 text-center mx-4">
          <p className="text-sm text-[var(--color-text-muted)]">No rubric configured for this period.</p>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {categories.map((cat) => (
            <div key={cat.id} className="ios-table-section">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{cat.name}</h3>
                <div className="flex gap-1">
                  {/* <IosButton variant="plain" size="xs" onClick={() => updateCategoryName(cat.id, cat.name)}>
                    Rename
                  </IosButton>
                  <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => deleteCategory(cat.id)}>
                    Delete
                  </IosButton> */}
                </div>
              </div>
              <div>
                {cat.items.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No items</p>
                ) : (
                  cat.items.map((item) => (
                    <div key={item.id} className="ios-table-row justify-between">
                      <span className="text-[15px] text-[var(--color-text)]">{item.text}</span>
                      <div className="flex gap-1 shrink-0">
                        <IosButton variant="plain" size="xs" onClick={() => updateItem(item.id, cat.id, item.text)}>
                          Edit
                        </IosButton>
                        <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => deleteItem(item.id, cat.id)}>
                          Remove
                        </IosButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-[var(--color-border)]">
                <button
                  onClick={() => addItem(cat.id)}
                  className="btn-ios-plain w-full text-sm font-semibold h-10"
                >
                  + Add item
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <IosButton onClick={saveAll} loading={saving} variant="primary">
              Save Rubric
            </IosButton>
          </div>
        </div>
      ))}
    </div>
    </ErrorBoundary>
  )
}
