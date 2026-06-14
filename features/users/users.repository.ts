import { supabase } from "@/lib/db"
import type {
  UserData,
  IUserRepository,
} from "@/lib/types"
import { USER_SELECT, singleQueryWithRoles, toUsersWithRoles, toUserWithRole, isMissingUserrole } from "@/lib/db/common"
import type { QueryError, DbRecord } from "@/lib/db/common"
import { auditLogRepository } from "@/features/audit/audit.repository"

// Helper to log user operations
async function logUserAction(email: string, action: string, details?: string) {
  try {
    await auditLogRepository.create({
      email,
      action,
      details,
    })
  } catch (err) {
    console.error("[audit] Failed to log user action:", err)
  }
}

export const userRepository: IUserRepository = {
  async findByEmail(email) {
    const trimmed = email.trim()
    try {
      return await singleQueryWithRoles(
        supabase.from("users").select(USER_SELECT).eq("email", trimmed) as unknown as { single(): Promise<{ data: unknown; error: QueryError | null }> }
      )
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").ilike("email", trimmed + "%").single()
        return data ? { ...data, role: "GUEST" } as UserData : null
      }
      throw err
    }
  },

  async findManyByEmail(emails) {
    const unique = [...new Set(emails.map((e) => e.toLowerCase().trim()))]
    try {
      const { data, error } = await supabase.from("users").select(USER_SELECT).in("email", unique)
      if (error) throw error
      const result = new Map<string, UserData>()
      for (const row of (data || []) as DbRecord[]) {
        result.set((row.email as string).toLowerCase(), toUserWithRole(row))
      }
      return result
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").in("email", unique)
        const result = new Map<string, UserData>()
        for (const row of (data || []) as DbRecord[]) {
          result.set((row.email as string).toLowerCase(), { ...row, role: "GUEST" } as unknown as UserData)
        }
        return result
      }
      throw err
    }
  },
  async findById(id) {
    try {
      return await singleQueryWithRoles(
        supabase.from("users").select(USER_SELECT).eq("id", id) as unknown as { single(): Promise<{ data: unknown; error: QueryError | null }> }
      )
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").eq("id", id).single()
        return data ? { ...data, role: "GUEST" } as UserData : null
      }
      throw err
    }
  },
  async create(input) {
    const { role, ...userFields } = input
    userFields.email = userFields.email?.toLowerCase().trim() ?? userFields.email
    const { data, error } = await supabase.from("users").insert(userFields).select("*").single()
    if (error) throw error

    if (role) {
      const roleNames = role.split("|")
      for (const roleName of roleNames) {
        const { error: roleErr } = await supabase.from("userrole").insert({ userId: data.id, roleName })
        if (roleErr) throw roleErr
      }
    }

    const { data: withRoles } = await supabase.from("users").select(USER_SELECT).eq("id", data.id).single()
    const user = toUserWithRole(withRoles)
    await logUserAction(user.email, "CREATE_USER", `Created ${role} user: ${user.name}`)
    return user
  },

  async createMany(inputs) {
    if (inputs.length === 0) return new Map()
    const userFields = inputs.map(({ role: _role, ...fields }) => ({
      ...fields,
      email: fields.email.toLowerCase().trim(),
    }))
    const { data: users, error: userErr } = await supabase.from("users").insert(userFields).select("*")
    if (userErr) throw userErr

    const roleInserts = (users as DbRecord[]).flatMap((row) => {
      const input = inputs.find((i) => i.email.toLowerCase().trim() === (row.email as string).toLowerCase())
      if (!input?.role) return []
      return input.role.split("|").map((roleName: string) => ({ userId: row.id, roleName }))
    })
    if (roleInserts.length > 0) {
      const { error: roleErr } = await supabase.from("userrole").insert(roleInserts)
      if (roleErr) throw roleErr
    }

    const { data: withRoles } = await supabase.from("users").select(USER_SELECT).in("id", (users as DbRecord[]).map((u) => u.id))
    const result = new Map<string, UserData>()
    for (const row of (withRoles || []) as DbRecord[]) {
      result.set((row.email as string).toLowerCase(), toUserWithRole(row))
    }
    await logUserAction("system", "BULK_CREATE_USERS", `Created ${inputs.length} users via ETL`)
    return result
  },

  async listByRole(role, options) {
    try {
      let query = supabase.from("users").select(USER_SELECT).eq("userrole.roleName", role)
      if (!options?.includeDeleted) {
        query = query.is("deletedAt", null)
      }
      const { data, error } = await query
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        console.warn("[repo] userrole table not found — listByRole returns empty")
        return []
      }
      throw err
    }
  },
  async listByDepartment(departmentId, options) {
    try {
      let query = supabase.from("users").select(USER_SELECT).eq("departmentId", departmentId)
      if (!options?.includeDeleted) {
        query = query.is("deletedAt", null)
      }
      const { data, error } = await query
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").eq("departmentId", departmentId)
        return (data || []).map((u: DbRecord) => ({ ...u, role: "GUEST" })) as unknown as UserData[]
      }
      throw err
    }
  },
  async listByIds(ids, options) {
    try {
      let query = supabase.from("users").select(USER_SELECT).in("id", ids)
      if (!options?.includeDeleted) {
        query = query.is("deletedAt", null)
      }
      const { data, error } = await query
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").in("id", ids)
        return (data || []).map((u: DbRecord) => ({ ...u, role: "GUEST" })) as unknown as UserData[]
      }
      throw err
    }
  },
  async listAll(options) {
    try {
      let query = supabase.from("users").select(USER_SELECT).order("createdAt", { ascending: false })
      if (!options?.includeDeleted) {
        query = query.is("deletedAt", null)
      }
      const { data, error } = await query
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        let query = supabase.from("users").select("*").order("createdAt", { ascending: false })
        if (!options?.includeDeleted) {
          query = query.is("deletedAt", null)
        }
        const { data } = await query
        return (data || []).map((u: DbRecord) => ({ ...u, role: "GUEST" })) as unknown as UserData[]
      }
      throw err
    }
  },
  async update(id, data) {
    const { role, ...userFields } = data
    if (userFields.email) userFields.email = userFields.email.toLowerCase().trim()
    if (Object.keys(userFields).length > 0) {
      const { error } = await supabase.from("users").update(userFields).eq("id", id)
      if (error) throw error
    }
    if (role) {
      const { error: delErr } = await supabase.from("userrole").delete().eq("userId", id)
      if (delErr) throw delErr
      const roleNames = role.split("|")
      for (const roleName of roleNames) {
        const { error: roleErr } = await supabase.from("userrole").insert({ userId: id, roleName })
        if (roleErr) throw roleErr
      }
    }
    const { data: updated, error: fetchErr } = await supabase.from("users").select(USER_SELECT).eq("id", id).single()
    if (fetchErr) throw fetchErr
    const user = toUserWithRole(updated)
    const changes = Object.keys(userFields).concat(role ? ["role"] : []).join(", ")
    await logUserAction(user.email, "UPDATE_USER", `Updated user ${user.name}: ${changes}`)
    return user
  },
  async softDelete(id) {
    const user = await this.findById(id)
    const { error } = await supabase.from("users").update({ deletedAt: new Date().toISOString() }).eq("id", id)
    if (error) throw error
    if (user) await logUserAction(user.email, "DISABLE_USER", `Soft-deleted user: ${user.name}`)
  },
  async restore(id) {
    const user = await this.findById(id)
    const { error } = await supabase.from("users").update({ deletedAt: null }).eq("id", id)
    if (error) throw error
    if (user) await logUserAction(user.email, "ENABLE_USER", `Restored user: ${user.name}`)
  },
  async permanentDelete(id) {
    const user = await this.findById(id)
    const { error } = await supabase.from("users").delete().eq("id", id)
    if (error) throw error
    if (user) await logUserAction(user.email, "DELETE_USER", `Permanently deleted user: ${user.name}`)
  },
  async listDeleted() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(USER_SELECT)
        .not("deletedAt", "is", null)
        .order("deletedAt", { ascending: false })
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").not("deletedAt", "is", null)
        return (data || []).map((u: DbRecord) => ({ ...u, role: "GUEST" })) as unknown as UserData[]
      }
      throw err
    }
  },
}
