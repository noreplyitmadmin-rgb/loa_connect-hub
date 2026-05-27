import { supabase } from "@/lib/supabase"
import { hash } from "bcryptjs"

async function main() {
  const passwordHash = await hash("password123", 12)

  // Clear existing data in reverse dependency order
  const tables = [
    "appointment_attendees",
    "appointments",
    "faculty_availability_rules",

    "password_reset_tokens",
    "sessions",
    "accounts",
    "users",
    "departments",
  ]
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
    if (error) {
      console.error(`Error clearing ${table}:`, error.message)
    }
  }

  const { data: admin, error: adminErr } = await supabase
    .from("users")
    .insert({ name: "Dr. Admin", email: "admin@econsult.com", passwordHash, hasLoggedInBefore: true })
    .select("*")
    .single()
  if (adminErr) throw adminErr
  await supabase.from("userrole").insert({ userId: admin.id, roleName: "ADMIN" })

  const { data: dean, error: deanErr } = await supabase
    .from("users")
    .insert({ name: "Regie Ellana", email: "regie@itmlyceumalabang.onmicrosoft.com", passwordHash })
    .select("*")
    .single()
  if (deanErr) throw deanErr
  await supabase.from("userrole").insert({ userId: dean.id, roleName: "DEAN" })

  const { data: department, error: deptErr } = await supabase
    .from("departments")
    .insert({ name: "College of Computer Studies", code: "CCS", deanId: dean.id })
    .select("*")
    .single()
  if (deptErr) throw deptErr

  await supabase.from("users").update({ departmentId: department.id }).eq("id", dean.id)

  const { data: faculty1, error: facErr } = await supabase
    .from("users")
    .insert({ name: "Nin Alamo", email: "nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com", passwordHash, departmentId: department.id })
    .select("*")
    .single()
  if (facErr) throw facErr
  await supabase.from("userrole").insert({ userId: faculty1.id, roleName: "FACULTY" })

  const { data: student1, error: stuErr } = await supabase
    .from("users")
    .insert({ name: "Nino Francisco Alamo", email: "nin.alamo@outlook.com", passwordHash })
    .select("*")
    .single()
  if (stuErr) throw stuErr
  await supabase.from("userrole").insert({ userId: student1.id, roleName: "STUDENT" })

  // Default availability rules for faculty: Mon-Fri 08:00-18:00, Sat-Sun blocked
  const allFaculty = [faculty1]
  for (const faculty of allFaculty) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const isWeekend = dayOfWeek >= 5
      const { error: ruleErr } = await supabase
        .from("faculty_availability_rules")
        .insert({
          facultyId: faculty.id,
          dayOfWeek,
          isBlocked: isWeekend,
          startTime: isWeekend ? null : "08:00",
          endTime: isWeekend ? null : "18:00",
          startDate: "2026-01-01",
        })
      if (ruleErr) {
        console.error(`Error creating rule for day ${dayOfWeek}:`, ruleErr.message)
      }
    }
  }

  console.log({
    admin: { name: admin.name, role: admin.role },
    dean: { name: dean.name, role: dean.role, department: department.name },
    faculty: [{ name: faculty1.name }],
    students: [{ name: student1.name, email: student1.email }],
    totalUsers: 4,
    departments: [{ name: department.name, code: department.code }],
    availabilityRules: `${allFaculty.length} faculty × 7 days = ${allFaculty.length * 7} rules`,
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
