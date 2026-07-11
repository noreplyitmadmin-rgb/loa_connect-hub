import { supabase } from "@/lib/db"
import fs from "fs"
import path from "path"

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ""
  let inDollarQuote = false
  let dollarTag = ""

  const lines = sql.split("\n")
  for (const line of lines) {
    const trimmed = line.trim()

    if (!inDollarQuote) {
      if (trimmed.startsWith("--")) {
        continue
      }
      if (trimmed === "") {
        continue
      }
    }

    current += line + "\n"

    if (inDollarQuote) {
      if (trimmed.includes(dollarTag)) {
        inDollarQuote = false
        dollarTag = ""
      }
    } else {
      const dollarMatch = trimmed.match(/\$([^$]*)\$/g)
      if (dollarMatch) {
        for (const d of dollarMatch) {
          if (!inDollarQuote) {
            inDollarQuote = true
            dollarTag = d
            break
          }
        }
      }
    }

    if (!inDollarQuote && trimmed.endsWith(";")) {
      const stmt = current.trim()
      if (stmt && stmt !== ";") {
        statements.push(stmt)
      }
      current = ""
    }
  }

  const leftover = current.trim()
  if (leftover && leftover !== ";") {
    statements.push(leftover)
  }

  return statements
}

export async function resetDatabase(): Promise<{ success: boolean; statementsExecuted: number; error?: string }> {
  const schemaPath = path.join(process.cwd(), "supabase-schema.sql")
  const sql = fs.readFileSync(schemaPath, "utf-8")

  const statements = splitSqlStatements(sql)

  let executed = 0
  for (const stmt of statements) {
    const { error } = await supabase.rpc("exec_sql", { sql_text: stmt })
    if (error) {
      return {
        success: false,
        statementsExecuted: executed,
        error: `Statement ${executed + 1} failed: ${error.message}\n\nStatement:\n${stmt.slice(0, 200)}...`,
      }
    }
    executed++
  }

  return { success: true, statementsExecuted: executed }
}
