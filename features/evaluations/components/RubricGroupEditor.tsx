"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import IosButton from "@/components/ui/IosButton"
import { SkeletonTable } from "@/components/ui/Skeleton"

interface EditorItem {
  id: string
  text: string
  displayOrder: number
  weight: number
}

interface EditorCategory {
  id: string
  name: string
  displayOrder: number
  items: EditorItem[]
}

let nextTempId = 0
function tempId() {
  return `tmp-${++nextTempId}-${Date.now()}`
}

export default function RubricGroupEditor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sourceId = searchParams.get("sourceId")
  const presetName = searchParams.get("name") || ""

  const [groupName, setGroupName] = useState(presetName)
  const [groupDesc, setGroupDesc] = useState("")
  const [categories, setCategories] = useState<EditorCategory[]>([])
  const [loading, setLoading] = useState(!!sourceId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!sourceId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/rubric-groups/${sourceId}`)
        if (!res.ok) throw new Error("Failed to load source group")
        const data = await res.json()
        if (cancelled) return
        const g = data.group
        setGroupName((prev) => prev || g.name)
        setGroupDesc(g.description ?? "")
        setCategories(
          (g.categories ?? []).map((c: { id: string; name: string; displayOrder: number; items?: EditorItem[] }) => ({
            id: c.id,
            name: c.name,
            displayOrder: c.displayOrder,
            items: (c.items ?? []).map((i: EditorItem) => ({ ...i })),
          }))
        )
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [sourceId])

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      { id: tempId(), name: `Category ${prev.length + 1}`, displayOrder: prev.length + 1, items: [] },
    ])
  }

  const updateCategoryName = (catId: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, name } : c)))
  }

  const removeCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId))
  }

  const addItem = (catId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, items: [...c.items, { id: tempId(), text: "", displayOrder: c.items.length + 1, weight: 1 }] }
          : c
      )
    )
  }

  const updateItemText = (catId: string, itemId: string, text: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, text } : i)) } : c
      )
    )
  }

  const removeItem = (catId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      )
    )
  }

  const handleSave = useCallback(async () => {
    if (!groupName.trim()) { setError("Group name is required"); return }
    if (categories.length === 0) { setError("Add at least one category"); return }
    for (const cat of categories) {
      if (!cat.name.trim()) { setError(`Category name is required`); return }
      for (const item of cat.items) {
        if (!item.text.trim()) { setError(`Item text is required in "${cat.name}"`); return }
      }
    }

    setSaving(true); setError("")
    try {
      const res = await fetch("/api/rubric-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim(), description: groupDesc.trim() || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to create group") }
      const { group } = await res.json()

      for (let ci = 0; ci < categories.length; ci++) {
        const cat = categories[ci]
        const catRes = await fetch(`/api/rubric-groups/${group.id}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cat.name.trim(), displayOrder: ci + 1 }),
        })
        if (!catRes.ok) { const d = await catRes.json(); throw new Error(d.error || "Failed to create category") }
        const { category } = await catRes.json()

        for (let ii = 0; ii < cat.items.length; ii++) {
          const item = cat.items[ii]
          const itemRes = await fetch(`/api/rubric-groups/${group.id}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: category.id, text: item.text.trim(), displayOrder: ii + 1, weight: item.weight }),
          })
          if (!itemRes.ok) { const d = await itemRes.json(); throw new Error(d.error || "Failed to create item") }
        }
      }

      router.push("/admin/evaluations/rubrics")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }, [groupName, groupDesc, categories, router])

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-ios-slide-in">
        <SkeletonTable rows={3} cols={2} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-12 px-4 animate-ios-slide-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[var(--color-text)] tracking-tight">
            {sourceId ? "Duplicate Rubric Group" : "New Rubric Group"}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {sourceId ? "Edit the duplicated rubric below and save when ready" : "Define categories and items for your rubric"}
          </p>
        </div>
        <div className="flex gap-2">
          <IosButton variant="gray" onClick={() => router.push("/admin/evaluations/rubrics")}>Cancel</IosButton>
          <IosButton variant="primary" loading={saving} onClick={handleSave}>Save</IosButton>
        </div>
      </div>

      {error && (
        <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-tertiary mb-1">Group Name</label>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. Midterm Evaluation 2025"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tertiary mb-1">Description (Optional)</label>
          <input
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.target.value)}
            className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Brief description"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Categories</h2>
        <IosButton variant="tinted" size="sm" onClick={addCategory}>+ Add Category</IosButton>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--color-border)] rounded-xl">
          <p className="text-sm text-[var(--color-text-muted)]">No categories yet. Add one to start building your rubric.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, ci) => (
            <div key={cat.id} className="ios-table-section">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-text-muted)] w-5">{ci + 1}.</span>
                <input
                  value={cat.name}
                  onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                  className="flex-1 text-[15px] font-semibold text-[var(--color-text)] bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-amber-400 focus:outline-none px-1 py-0.5"
                />
                <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => removeCategory(cat.id)} disabled={saving}>Remove</IosButton>
              </div>
              <div>
                {cat.items.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No items</p>
                ) : (
                  cat.items.map((item, ii) => (
                    <div key={item.id} className="flex items-start gap-2 px-4 py-2 border-b border-[var(--color-border)] last:border-b-0">
                      <span className="text-xs text-[var(--color-text-muted)] mt-2 w-5 shrink-0">{ci + 1}.{ii + 1}</span>
                      <textarea
                        value={item.text}
                        onChange={(e) => updateItemText(cat.id, item.id, e.target.value)}
                        rows={2}
                        className="flex-1 text-sm text-[var(--color-text)] bg-transparent border border-transparent hover:border-[var(--color-border)] focus:border-amber-400 focus:outline-none rounded px-2 py-1 resize-none"
                        placeholder="Enter rubric item text..."
                      />
                      <IosButton variant="plain" size="xs" className="!text-red-500 mt-1 shrink-0" onClick={() => removeItem(cat.id, item.id)} disabled={saving}>Remove</IosButton>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-[var(--color-border)]">
                <button onClick={() => addItem(cat.id)} className="btn-ios-plain w-full text-sm font-semibold h-10" disabled={saving}>+ Add Item</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
