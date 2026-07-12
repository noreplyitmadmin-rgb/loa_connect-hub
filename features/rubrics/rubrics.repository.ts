import { supabase } from "@/lib/db"
import type { RubricCategoryData, IRubricRepository } from "@/lib/types"

export const rubricRepository: IRubricRepository = {
  async getCategoriesWithItems(evaluationPeriodId) {
    const { data, error } = await supabase
      .from("rubric_categories")
      .select("*, items:rubric_items(*)")
      .eq("evaluation_period_id", evaluationPeriodId)
      .order("displayOrder", { ascending: true })
    if (error) throw error
    return data as unknown as RubricCategoryData[]
  },

  async replaceRubric(evaluationPeriodId, categories) {
    const { data: existingCats, error: fetchErr } = await supabase
      .from("rubric_categories")
      .select("id, name")
      .eq("evaluation_period_id", evaluationPeriodId)
    if (fetchErr) throw fetchErr

    const oldCatIds = existingCats.map((c) => c.id)
    if (oldCatIds.length > 0) {
      const { error: delItemsErr } = await supabase.from("rubric_items").delete().in("categoryId", oldCatIds)
      if (delItemsErr) throw delItemsErr
      const { error: delCatsErr } = await supabase.from("rubric_categories").delete().in("id", oldCatIds)
      if (delCatsErr) throw delCatsErr
    }

    const createdCats: RubricCategoryData[] = []
    for (const cat of categories) {
      const { data: newCat, error: catErr } = await supabase
        .from("rubric_categories")
        .insert({ evaluation_period_id: evaluationPeriodId, name: cat.name, displayOrder: cat.displayOrder })
        .select("*")
        .single()
      if (catErr) throw catErr

      const itemsToInsert = cat.items.map((item) => ({
        categoryId: newCat.id,
        text: item.text,
        displayOrder: item.displayOrder,
        weight: item.weight ?? 1,
      }))
      const { error: itemsErr } = await supabase.from("rubric_items").insert(itemsToInsert)
      if (itemsErr) throw itemsErr

      createdCats.push(newCat as RubricCategoryData)
    }

    return createdCats
  },

  async copyFromSource(evaluationPeriodId, sourcePeriodId) {
    const { data: srcCats, error: fetchCatsErr } = await supabase
      .from("rubric_categories")
      .select("*")
      .eq("evaluation_period_id", sourcePeriodId)
      .order("displayOrder", { ascending: true })
    if (fetchCatsErr) throw fetchCatsErr

    const { data: srcItems, error: fetchItemsErr } = await supabase
      .from("rubric_items")
      .select("*")
      .in(
        "categoryId",
        srcCats.map((c) => c.id)
      )
      .order("displayOrder", { ascending: true })
    if (fetchItemsErr) throw fetchItemsErr

    const catIdMap = new Map<string, string>()
    const createdCats: RubricCategoryData[] = []
    for (const cat of srcCats) {
      const { data: newCat, error: catErr } = await supabase
        .from("rubric_categories")
        .insert({ evaluation_period_id: evaluationPeriodId, name: cat.name, displayOrder: cat.displayOrder })
        .select("*")
        .single()
      if (catErr) throw catErr
      catIdMap.set(cat.id, newCat.id)
      createdCats.push(newCat as RubricCategoryData)
    }

    const itemsToInsert = srcItems
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

    return createdCats
  },

  async deleteCategory(id) {
    const { error } = await supabase.from("rubric_categories").delete().eq("id", id)
    if (error) throw error
  },

  async deleteItem(id) {
    const { error } = await supabase.from("rubric_items").delete().eq("id", id)
    if (error) throw error
  },
}
