import { supabase } from "@/lib/db"
import type {
  RubricGroupData,
  RubricGroupWithCategories,
  RubricGroupSnapshotData,
  IRubricGroupRepository,
} from "@/lib/types"

export const rubricGroupRepository: IRubricGroupRepository = {
  async list() {
    const { data, error } = await supabase
      .from("rubric_groups")
      .select("*")
      .order("createdAt", { ascending: false })
    if (error) throw error
    return (data ?? []) as RubricGroupData[]
  },

  async findById(id) {
    const { data: group, error: grpErr } = await supabase
      .from("rubric_groups")
      .select("*")
      .eq("id", id)
      .single()
    if (grpErr) {
      if (grpErr.code === "PGRST116") return null
      throw grpErr
    }

    const { data: cats, error: catErr } = await supabase
      .from("rubric_categories")
      .select("*, items:rubric_items(*)")
      .eq("rubric_group_id", id)
      .order("displayOrder", { ascending: true })
    if (catErr) throw catErr

    return {
      ...group,
      categories: (cats ?? []) as unknown as RubricGroupWithCategories["categories"],
    } as RubricGroupWithCategories
  },

  async create(name, description) {
    const { data, error } = await supabase
      .from("rubric_groups")
      .insert({ name, description: description ?? null })
      .select("*")
      .single()
    if (error) throw error
    return data as RubricGroupData
  },

  async update(id, fields) {
    const { data, error } = await supabase
      .from("rubric_groups")
      .update(fields)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data as RubricGroupData
  },

  async duplicate(id, newName) {
    const source = await this.findById(id)
    if (!source) throw new Error("Rubric group not found")

    const newGroup = await this.create(newName, source.description)

    if (source.categories.length > 0) {
      const catIdMap = new Map<string, string>()

      for (const cat of source.categories) {
        const { data: newCat, error: catErr } = await supabase
          .from("rubric_categories")
          .insert({ rubric_group_id: newGroup.id, name: cat.name, displayOrder: cat.displayOrder })
          .select("id")
          .single()
        if (catErr) throw catErr
        catIdMap.set(cat.id, newCat.id)
      }

      const itemsToInsert = source.categories
        .flatMap((cat) => (cat.items ?? []).map((item) => ({ ...item, categoryId: cat.id })))
        .filter((item) => catIdMap.has(item.categoryId))
        .map((item) => ({
          categoryId: catIdMap.get(item.categoryId)!,
          text: item.text,
          displayOrder: item.displayOrder,
          weight: item.weight,
        }))

      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase.from("rubric_items").insert(itemsToInsert)
        if (itemsErr) throw itemsErr
      }
    }

    return newGroup
  },

  async isLocked(groupId) {
    const { count, error } = await supabase
      .from("evaluation_periods")
      .select("id", { count: "exact", head: true })
      .eq("rubric_group_id", groupId)
      .eq("isActive", true)
    if (error) throw error
    return (count ?? 0) > 0
  },

  async createSnapshot(evaluationPeriodId, groupId) {
    const group = await this.findById(groupId)
    if (!group) throw new Error("Rubric group not found")

    const rows = group.categories
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .flatMap((cat) =>
        (cat.items ?? [])
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((item) => ({
            evaluation_period_id: evaluationPeriodId,
            rubric_group_id: groupId,
            rubric_group_name: group.name,
            category_name: cat.name,
            category_display_order: cat.displayOrder,
            item_text: item.text,
            item_display_order: item.displayOrder,
            item_weight: item.weight,
          }))
      )

    if (rows.length === 0) return

    const { error } = await supabase.from("rubric_group_snapshots").insert(rows)
    if (error) throw error
  },

  async getSnapshot(evaluationPeriodId) {
    const { data, error } = await supabase
      .from("rubric_group_snapshots")
      .select("*")
      .eq("evaluation_period_id", evaluationPeriodId)
      .order("category_display_order", { ascending: true })
      .order("item_display_order", { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as RubricGroupSnapshotData[]
  },
}
