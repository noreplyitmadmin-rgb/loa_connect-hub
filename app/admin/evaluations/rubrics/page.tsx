"use client"

import { useState, useEffect, useCallback } from "react"
import Skeleton from "@/components/ui/Skeleton"
import SubmitButton from "@/components/ui/SubmitButton"

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

export default function AdminRubricsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")
  const [categories, setCategories] = useState<RubricCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const res = await fetch("/api/evaluation-periods")
        const data = await res.json()
        const list: Period[] = data.periods || []
        setPeriods(list)
        const active = list.find((p: Period) => p.isActive)
        if (active) setSelectedPeriodId(active.id)
      } catch {
        alert("Failed to load periods")
      } finally {
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedPeriodId) return
    Promise.resolve().then(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/evaluation-periods/${selectedPeriodId}/rubric`)
        const data = await res.json()
        setCategories(data.rubric || [])
      } catch {
        alert("Failed to load rubric")
      } finally {
        setLoading(false)
      }
    })
  }, [selectedPeriodId])

  const addItem = useCallback(async (categoryId: string) => {
    const text = prompt("Item text:")
    if (!text) return
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
      }
    } catch {
      alert("Failed to add item")
    }
  }, [selectedPeriodId])

  const updateItem = useCallback(async (itemId: string, categoryId: string, currentText: string) => {
    const text = prompt("Edit item text:", currentText)
    if (!text || text === currentText) return
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
      }
    } catch {
      alert("Failed to update item")
    }
  }, [selectedPeriodId])

  const deleteItem = useCallback(async (itemId: string, categoryId: string) => {
    if (!confirm("Delete this item?")) return
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
      }
    } catch {
      alert("Failed to delete item")
    }
  }, [selectedPeriodId])

  const updateCategoryName = useCallback(async (categoryId: string, currentName: string) => {
    const name = prompt("Edit category name:", currentName)
    if (!name || name === currentName) return
    try {
      const res = await fetch(`/api/evaluation-periods/${selectedPeriodId}/rubrics/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (data.category) {
        setCategories((prev) =>
          prev.map((c) => (c.id === categoryId ? data.category : c))
        )
      }
    } catch {
      alert("Failed to update category")
    }
  }, [selectedPeriodId])

  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!confirm("Delete this category and all items?")) return
    try {
      const res = await fetch(`/api/evaluation-periods/${selectedPeriodId}/rubrics/categories/${categoryId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId))
      }
    } catch {
      alert("Failed to delete category")
    }
  }, [selectedPeriodId])

  const saveAll = useCallback(async () => {
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
        alert("Rubric saved")
      }
    } catch {
      alert("Failed to save rubric")
    } finally {
      setSaving(false)
    }
  }, [selectedPeriodId, categories])

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Rubric Editor</h1>
          <p className="text-sm text-tertiary mt-1">Manage evaluation categories and items</p>
        </div>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-primary"
        >
          <option value="">Select period...</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.name || p.title || p.id}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-sm text-tertiary">No rubric configured for this period.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-primary">{cat.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateCategoryName(cat.id, cat.name)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {cat.items.length === 0 ? (
                  <p className="px-5 py-3 text-xs text-tertiary">No items</p>
                ) : (
                  cat.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-primary">{item.text}</span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => updateItem(item.id, cat.id, item.text)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item.id, cat.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-5 py-3 border-t border-slate-100">
                <button
                  onClick={() => addItem(cat.id)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  + Add item
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <SubmitButton onClick={saveAll} loading={saving}>
              Save Rubric
            </SubmitButton>
          </div>
        </div>
      )}
    </div>
  )
}
