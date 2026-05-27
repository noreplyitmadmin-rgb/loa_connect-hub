import { hash } from "bcryptjs"
import { userRepository } from "@/lib/repositories/factory"

export async function registerUser(input: {
  name: string
  email: string
  password: string
  role: string
}) {
  const existing = await userRepository.findByEmail(input.email)
  if (existing) {
    throw new Error("Email already registered")
  }

  const passwordHash = await hash(input.password, 12)
  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
  })

  return user
}
