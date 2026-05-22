import { PrismaClient } from "@/lib/generated/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { hash } from "bcryptjs"

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await hash("password123", 12)

  // Clear existing data for clean re-seed
  await prisma.appointmentAttendee.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.facultyAvailabilityRule.deleteMany()
  await prisma.internalMeetingParticipant.deleteMany()
  await prisma.internalMeeting.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.department.deleteMany()
  await prisma.user.deleteMany()

  const admin = await prisma.user.create({
    data: { name: "Dr. Admin", email: "admin@econsult.com", passwordHash, role: "ADMIN", hasLoggedInBefore: true },
  })

  const dean = await prisma.user.create({
    data: { name: "Regie Ellana", email: "regie@itmlyceumalabang.onmicrosoft.com", passwordHash, role: "DEAN" },
  })

  const department = await prisma.department.create({
    data: { name: "College of Computer Studies", code: "CCS", deanId: dean.id },
  })

  await prisma.user.update({ where: { id: dean.id }, data: { departmentId: department.id } })

  const faculty1 = await prisma.user.create({
    data: { name: "Nin Alamo", email: "nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com", passwordHash, role: "FACULTY", departmentId: department.id },
  })

  const student1 = await prisma.user.create({
    data: { name: "Nino Francisco Alamo", email: "nin.alamo@outlook.com", passwordHash, role: "STUDENT" },
  })

  // Default availability rules for faculty: Mon-Fri 08:00-18:00, Sat-Sun blocked
  const allFaculty = [faculty1]
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  for (const faculty of allFaculty) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const isWeekend = dayOfWeek >= 5 // Saturday=5, Sunday=6
      await prisma.facultyAvailabilityRule.create({
        data: {
          facultyId: faculty.id,
          dayOfWeek,
          isBlocked: isWeekend,
          startTime: isWeekend ? null : "08:00",
          endTime: isWeekend ? null : "18:00",
          startDate: "2026-01-01",
        },
      })
    }
  }

  console.log({
    admin: { name: admin.name, role: admin.role },
    dean: { name: dean.name, role: dean.role, department: department.name },
    faculty: [
      { name: faculty1.name },
    ],
    students: [
      { name: student1.name, email: student1.email },
    ],
    totalUsers: 4,
    departments: [{ name: department.name, code: department.code }],
    availabilityRules: `${allFaculty.length} faculty × 7 days = ${allFaculty.length * 7} rules`,
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
