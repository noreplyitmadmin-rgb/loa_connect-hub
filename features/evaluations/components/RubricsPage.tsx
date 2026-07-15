"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useApiGet, invalidate } from "@/lib/api/client"
import IosButton from "@/components/ui/IosButton"
import LockedTab from "@/components/ui/LockedTab"
import type { RubricGroupData, RubricGroupWithCategories, RubricItemData } from "@/lib/types"

export default function RubricsPage() {
  const router = useRouter()
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [group, setGroup] = useState<RubricGroupWithCategories | null>(null)
  const [loadingGroup, setLoadingGroup] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const { data: groupsData, error: groupsError, isLoading: groupsLoading } = useApiGet<{ groups: RubricGroupData[] }>("/api/rubric-groups")

  const groups = groupsData?.groups ?? []

  useEffect(() => {
    if (groupsError?.message?.includes("403")) Promise.resolve().then(() => setLockedEndpoint("/api/rubric-groups"))
  }, [groupsError])

  const loadGroup = useCallback(async (groupId: string) => {
    if (!groupId) { setGroup(null); return }
    setLoadingGroup(true); setError("")
    try {
      const res = await fetch(`/api/rubric-groups/${groupId}`)
      if (!res.ok) throw new Error("Failed to load rubric group")
      const data = await res.json()
      setGroup(data.group)
    } catch (err) { setError((err as Error).message) }
    setLoadingGroup(false)
  }, [])

  useEffect(() => {
    if (selectedGroupId) Promise.resolve().then(() => loadGroup(selectedGroupId))
  }, [selectedGroupId, loadGroup])

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 4000)
  }

  const handleDuplicate = (groupId: string, currentName: string) => {
    router.push(`/admin/evaluations/rubrics/new?sourceId=${groupId}&name=${encodeURIComponent(currentName + " (Copy)")}`)
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Delete this rubric group? This cannot be undone.")) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/rubric-groups/${groupId}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      if (selectedGroupId === groupId) { setSelectedGroupId(""); setGroup(null) }
      showSuccessMessage("Rubric group deleted!")
      invalidate("/api/rubric-groups")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const addCategory = async () => {
    if (!selectedGroupId) return
    const name = prompt("Category name:")
    if (!name) return
    setSaving(true); setError("")
    try {
      const displayOrder = (group?.categories.length ?? 0) + 1
      const res = await fetch(`/api/rubric-groups/${selectedGroupId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayOrder }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      await loadGroup(selectedGroupId)
      showSuccessMessage("Category added!")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!selectedGroupId || !confirm("Delete this category and all its items?")) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/rubric-groups/${selectedGroupId}/categories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      await loadGroup(selectedGroupId)
      showSuccessMessage("Category deleted!")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const addItem = async (categoryId: string) => {
    if (!selectedGroupId) return
    const text = prompt("Item text:")
    if (!text) return
    setSaving(true); setError("")
    try {
      const cat = group?.categories.find((c) => c.id === categoryId)
      const displayOrder = (cat?.items?.length ?? 0) + 1
      const res = await fetch(`/api/rubric-groups/${selectedGroupId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, text, displayOrder, weight: 1 }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      await loadGroup(selectedGroupId)
      showSuccessMessage("Item added!")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const updateItem = async (itemId: string, currentText: string) => {
    if (!selectedGroupId) return
    const text = prompt("Edit item text:", currentText)
    if (!text || text === currentText) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/rubric-groups/${selectedGroupId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      await loadGroup(selectedGroupId)
      showSuccessMessage("Item updated!")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const deleteItem = async (itemId: string) => {
    if (!selectedGroupId || !confirm("Delete this item?")) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/rubric-groups/${selectedGroupId}/items/${itemId}`, {
        method: "DELETE",
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      await loadGroup(selectedGroupId)
      showSuccessMessage("Item deleted!")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  if (lockedEndpoint) {
    return (
      <div className="w-full space-y-8 pb-12 px-4 animate-ios-slide-in">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 pb-12 animate-ios-slide-in">
      <div className="flex items-start justify-between gap-4 px-4">
        <div>
          <h1 className="text-[28px] font-bold text-[var(--color-text)] tracking-tight">Rubric Groups</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Create and manage reusable rubric groups</p>
        </div>
        <IosButton variant="primary" size="sm" onClick={() => router.push("/admin/evaluations/rubrics/new")}>New Group</IosButton>
      </div>

      {(error || success) && (
        <div className="px-4 space-y-1">
          {error && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          {success && <p className="text-xs font-medium text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}
        </div>
      )}

      <div className="px-4">
        {groupsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-dim rounded-xl animate-pulse-soft" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--color-text-muted)]">No rubric groups yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <div
                key={g.id}
                className={`ios-table-row cursor-pointer ${selectedGroupId === g.id ? "bg-amber-50 border-amber-200" : ""}`}
                onClick={() => setSelectedGroupId(selectedGroupId === g.id ? "" : g.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px] font-semibold text-[var(--color-text)] truncate">{g.name}</span>
                    {g.seed && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Default</span>}
                    {g.description && <span className="text-xs text-[var(--color-text-muted)] truncate hidden sm:inline">{g.description}</span>}
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <IosButton variant="plain" size="xs" onClick={() => handleDuplicate(g.id, g.name)} disabled={saving}>Duplicate</IosButton>
                    {!g.seed && (
                      <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => handleDeleteGroup(g.id)} disabled={saving}>Delete</IosButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedGroupId && (
        <div className="px-4">
          {loadingGroup ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-24 bg-surface-dim rounded-xl animate-pulse-soft" />
              ))}
            </div>
          ) : group ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--color-text)]">{group.name}</h2>
                  {group.seed && <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Default</span>}
                </div>
                {!group.seed && (
                  <IosButton variant="tinted" size="sm" onClick={addCategory} disabled={saving}>+ Add Category</IosButton>
                )}
              </div>

              {group.categories.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-[var(--color-border)] rounded-xl">
                  <p className="text-sm text-[var(--color-text-muted)]">No categories yet. Add one to start building your rubric.</p>
                </div>
              ) : (
                group.categories
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((cat) => (
                    <div key={cat.id} className="ios-table-section">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                        <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{cat.name}</h3>
                        {!group.seed && (
                          <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => deleteCategory(cat.id)} disabled={saving}>Delete</IosButton>
                        )}
                      </div>
                      <div>
                        {(cat.items ?? []).length === 0 ? (
                          <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No items</p>
                        ) : (
                          (cat.items ?? [])
                            .sort((a: RubricItemData, b: RubricItemData) => a.displayOrder - b.displayOrder)
                            .map((item: RubricItemData) => (
                              <div key={item.id} className="ios-table-row justify-between">
                                <span className="text-[15px] text-[var(--color-text)]">{item.text}</span>
                                {!group.seed && (
                                  <div className="flex gap-1 shrink-0">
                                    <IosButton variant="plain" size="xs" onClick={() => updateItem(item.id, item.text)} disabled={saving}>Edit</IosButton>
                                    <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => deleteItem(item.id)} disabled={saving}>Remove</IosButton>
                                  </div>
                                )}
                              </div>
                            ))
                        )}
                      </div>
                      {!group.seed && (
                        <div className="border-t border-[var(--color-border)]">
                          <button onClick={() => addItem(cat.id)} className="btn-ios-plain w-full text-sm font-semibold h-10" disabled={saving}>+ Add item</button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
