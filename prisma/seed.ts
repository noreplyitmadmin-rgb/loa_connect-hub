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
  await prisma.appointment.deleteMany()
  await prisma.facultySchedule.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  const admin = await prisma.user.create({
    data: { name: "Dr. Admin", email: "admin@econsult.com", passwordHash, role: "ADMIN" },
  })

  const faculty1 = await prisma.user.create({
    data: { name: "Dr. Sarah Chen", email: "faculty1@econsult.com", passwordHash, role: "FACULTY" },
  })

  const faculty2 = await prisma.user.create({
    data: { name: "Prof. Marcus Johnson", email: "faculty2@econsult.com", passwordHash, role: "FACULTY" },
  })

  const faculty3 = await prisma.user.create({
    data: { name: "Dr. Elena Rodriguez", email: "faculty3@econsult.com", passwordHash, role: "FACULTY" },
  })

  const student1 = await prisma.user.create({
    data: { name: "Alice Student", email: "student@econsult.com", passwordHash, role: "STUDENT" },
  })

  const student2 = await prisma.user.create({
    data: { name: "Bob Martinez", email: "bob@econsult.com", passwordHash, role: "STUDENT" },
  })

  const student3 = await prisma.user.create({
    data: { name: "Carol Nguyen", email: "carol@econsult.com", passwordHash, role: "STUDENT" },
  })

  const today = new Date()
  const day = (offset: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    return d.toISOString().split("T")[0]
  }

  const schedules = [
    // Dr. Sarah Chen — 3 slots
    { facultyId: faculty1.id, date: day(1), startTime: "09:00", endTime: "10:00" },
    { facultyId: faculty1.id, date: day(1), startTime: "10:00", endTime: "11:00" },
    { facultyId: faculty1.id, date: day(3), startTime: "14:00", endTime: "15:00" },
    // Prof. Marcus Johnson — 2 slots
    { facultyId: faculty2.id, date: day(2), startTime: "09:00", endTime: "10:00" },
    { facultyId: faculty2.id, date: day(4), startTime: "11:00", endTime: "12:00" },
    // Dr. Elena Rodriguez — 2 slots
    { facultyId: faculty3.id, date: day(1), startTime: "13:00", endTime: "14:00" },
    { facultyId: faculty3.id, date: day(2), startTime: "15:00", endTime: "16:00" },
  ]

  for (const s of schedules) {
    await prisma.facultySchedule.create({ data: s })
  }

  console.log({
    admin: { name: admin.name, role: admin.role },
    faculty: [
      { name: faculty1.name, schedules: 3 },
      { name: faculty2.name, schedules: 2 },
      { name: faculty3.name, schedules: 2 },
    ],
    students: [
      { name: student1.name },
      { name: student2.name },
      { name: student3.name },
    ],
    totalUsers: 7,
    totalSlots: schedules.length,
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
