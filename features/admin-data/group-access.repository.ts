import { supabase } from "@/lib/db"
import type { GroupAccessData, IGroupAccessRepository } from "@/lib/types"

export const groupAccessRepository: IGroupAccessRepository = {
  async listAll() {
    const { data, error } = await supabase.from("group_access").select("*").order("groupName")
    if (error) throw error
    return (data || []) as GroupAccessData[]
  },

  async findByGroupName(groupName) {
    const { data, error } = await supabase
      .from("group_access")
      .select("*")
      .eq("groupName", groupName)
      .maybeSingle()
    if (error) throw error
    return data as GroupAccessData | null
  },

  async create(groupName) {
    const { data, error } = await supabase
      .from("group_access")
      .insert({ groupName, pages: [], api_overrides: {}, updatedAt: new Date().toISOString() })
      .select("*")
      .single()
    if (error) throw error
    return data as GroupAccessData
  },

  async update(groupName, fields) {
    const { data, error } = await supabase
      .from("group_access")
      .update({ ...fields, updatedAt: new Date().toISOString() })
      .eq("groupName", groupName)
      .select("*")
      .single()
    if (error) throw error
    return data as GroupAccessData
  },

  async delete(groupName) {
    const { error } = await supabase.from("group_access").delete().eq("groupName", groupName)
    if (error) throw error
  },

  async deleteAll() {
    const { error } = await supabase.from("group_access").delete().neq("groupName", "__nonexistent__")
    if (error) throw error
  },

  async insertMany(groups) {
    if (groups.length === 0) return
    const { error } = await supabase.from("group_access").insert(groups)
    if (error) throw error
  },

  async listAllPages() {
    const { data, error } = await supabase.from("group_access").select("pages")
    if (error) throw error
    const paths = new Set<string>()
    for (const g of data || []) {
      if (Array.isArray(g.pages)) {
        for (const p of g.pages) paths.add(p)
      }
    }
    return Array.from(paths)
  },
}
