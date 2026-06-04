"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

interface Category {
  id: string
  name: string
  displayOrder: number
  items: Item[]
}

interface Item {
  id: string
  text: string
  displayOrder: number
  weight: number
}

export default function RubricPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/evaluation-periods/${params.id}/rubric`)
      .then((r) => r.json())
      .then((data) => setCategories(data.rubric || []))
      .catch(() => alert("Failed to load rubric"))
      .finally(() => setLoading(false))
  }, [params.id])

  function addCategory() {
    setCategories([
      ...categories,
      {
        id: `new-${Date.now()}`,
        name: "",
        displayOrder: categories.length + 1,
        items: [],
      },
    ])
  }

  function removeCategory(index: number) {
    setCategories(categories.filter((_, i) => i !== index))
  }

  function updateCategory(index: number, name: string) {
    const updated = [...categories]
    updated[index] = { ...updated[index], name }
    setCategories(updated)
  }

  function addItem(catIndex: number) {
    const updated = [...categories]
    updated[catIndex] = {
      ...updated[catIndex],
      items: [
        ...updated[catIndex].items,
        {
          id: `new-${Date.now()}-${catIndex}`,
          text: "",
          displayOrder: updated[catIndex].items.length + 1,
          weight: 1,
        },
      ],
    }
    setCategories(updated)
  }

  function removeItem(catIndex: number, itemIndex: number) {
    const updated = [...categories]
    updated[catIndex] = {
      ...updated[catIndex],
      items: updated[catIndex].items.filter((_, i) => i !== itemIndex),
    }
    setCategories(updated)
  }

  function updateItem(catIndex: number, itemIndex: number, text: string) {
    const updated = [...categories]
    updated[catIndex] = {
      ...updated[catIndex],
      items: updated[catIndex].items.map((item, i) =>
        i === itemIndex ? { ...item, text } : item
      ),
    }
    setCategories(updated)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/evaluation-periods/${params.id}/rubric`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      })
      if (!res.ok) throw new Error("Failed to save")
      router.refresh()
    } catch {
      alert("Failed to save rubric")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-tertiary text-center py-12">Loading...</p>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Rubric Configuration</h1>
          <p className="text-sm text-tertiary mt-1">Manage evaluation criteria and items</p>
        </div>
        <button
          onClick={addCategory}
          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Add Category
        </button>
      </div>

      <div className="space-y-6">
        {categories.map((cat, catIndex) => (
          <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <input
                value={cat.name}
                onChange={(e) => updateCategory(catIndex, e.target.value)}
                placeholder="Category name (e.g. Professional Manner)"
                className="font-bold text-sm text-primary border-b border-transparent focus:border-blue-400 focus:outline-none px-1 -ml-1 flex-1"
              />
              <button
                onClick={() => removeCategory(catIndex)}
                className="text-xs text-rose-600 font-medium hover:text-rose-700"
              >
                Remove
              </button>
            </div>

            <div className="space-y-2">
              {cat.items.map((item, itemIndex) => (
                <div key={item.id} className="flex items-center gap-3">
                  <input
                    value={item.text}
                    onChange={(e) => updateItem(catIndex, itemIndex, e.target.value)}
                    placeholder="Rubric item text..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                  <button
                    onClick={() => removeItem(catIndex, itemIndex)}
                    className="text-xs text-rose-600 font-medium hover:text-rose-700 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem(catIndex)}
                className="text-xs text-blue-600 font-medium hover:text-blue-700"
              >
                + Add Item
              </button>
            </div>
          </div>
        ))}
      </div>

      {categories.length > 0 && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Rubric"}
        </button>
      )}
    </div>
  )
}
