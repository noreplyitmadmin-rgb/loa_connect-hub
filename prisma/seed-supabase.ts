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
    "appointment_time_slots",
    "appointment_files",
    "userrole",
    "audit_logs",
    "department_courses",
    "users",
    "departments",
  ]
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
    if (error) {
      console.error(`Error clearing ${table}:`, error.message)
    }
  }

  // ── ADMIN ──────────────────────────────────────────────────
  const { data: admin, error: adminErr } = await supabase
    .from("users")
    .insert({ name: "Mr. Admin", email: "admin@lyceumalabang.ph", passwordHash, hasLoggedInBefore: true })
    .select("*")
    .single()
  if (adminErr) throw adminErr
  await supabase.from("userrole").insert({ userId: admin.id, roleName: "ADMIN" })

  // ── DEAN ──────────────────────────────────────────────────
  const { data: dean, error: deanErr } = await supabase
    .from("users")
    .insert({ name: "Regie Ellana", email: "regie@itmlyceumalabang.onmicrosoft.com", passwordHash })
    .select("*")
    .single()
  if (deanErr) throw deanErr
  await supabase.from("userrole").insert({ userId: dean.id, roleName: "DEAN" })

  // ── DEPARTMENT ────────────────────────────────────────────
  const { data: department, error: deptErr } = await supabase
    .from("departments")
    .insert({ name: "College of Computer Studies", code: "CCS", deanId: dean.id })
    .select("*")
    .single()
  if (deptErr) throw deptErr

  await supabase.from("users").update({ departmentId: department.id }).eq("id", dean.id)

  // ── DEPARTMENT COURSES ────────────────────────────────────
  await supabase.from("department_courses").insert([
    { departmentId: department.id, name: "Bachelor of Science in Information Technology", code: "BSIT" },
    { departmentId: department.id, name: "Bachelor of Science in Computer Science", code: "BSCS" },
  ])

  // ── FACULTY (3) ───────────────────────────────────────────
  const facultyData = [
    { name: "Nin Alamo", email: "nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com" },
    { name: "Maria Santos", email: "maria.santos@itmlyceumalabang.onmicrosoft.com" },
    { name: "Juan Dela Cruz", email: "juan.delacruz@itmlyceumalabang.onmicrosoft.com" },
  ]
  const facultyUsers: Record<string, unknown>[] = []
  for (const f of facultyData) {
    const { data: user, error: err } = await supabase
      .from("users")
      .insert({ name: f.name, email: f.email, passwordHash, departmentId: department.id })
      .select("*")
      .single()
    if (err) throw err
    facultyUsers.push(user)
    await supabase.from("userrole").insert({ userId: user.id, roleName: "FACULTY" })
  }

  // ── STUDENTS (5) ──────────────────────────────────────────
  const studentData = [
    { name: "Alice Reyes", email: "alice.reyes@itmlyceumalabang.onmicrosoft.com", course: "BSIT" },
    { name: "Bob Martinez", email: "bob.martinez@itmlyceumalabang.onmicrosoft.com", course: "BSIT" },
    { name: "Charlie Gomez", email: "charlie.gomez@itmlyceumalabang.onmicrosoft.com", course: "BSCS" },
    { name: "Diana Lopez", email: "diana.lopez@itmlyceumalabang.onmicrosoft.com", course: "BSCS" },
    { name: "Ethan Fernandez", email: "ethan.fernandez@itmlyceumalabang.onmicrosoft.com", course: "BSIT" },
  ]
  const studentUsers: Record<string, unknown>[] = []
  for (const s of studentData) {
    const { data: user, error: err } = await supabase
      .from("users")
      .insert({ name: s.name, email: s.email, passwordHash, departmentId: department.id, course: s.course })
      .select("*")
      .single()
    if (err) throw err
    studentUsers.push(user)
    await supabase.from("userrole").insert({ userId: user.id, roleName: "STUDENT" })
  }

  // ── FACULTY AVAILABILITY ─────────────────────────────────
  for (const faculty of facultyUsers) {
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
    admin: { name: admin.name, role: (admin as Record<string, unknown>).role },
    dean: { name: dean.name, role: (dean as Record<string, unknown>).role, department: department.name },
    faculty: facultyUsers.map((f) => f.name),
    students: studentUsers.map((s) => ({ name: s.name, email: s.email, course: s.course })),
    totalUsers: 1 + 1 + facultyUsers.length + studentUsers.length,
    departments: [{ name: department.name, code: department.code }],
    departmentCourses: ["BSIT", "BSCS"],
    availabilityRules: `${facultyUsers.length} faculty × 7 days = ${facultyUsers.length * 7} rules`,
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
