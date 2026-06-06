import { semesterRepository } from "@/lib/repositories/factory"
import type { CreateSemesterInput } from "@/lib/types"

export async function getSemesters(params?: { isActive?: boolean }) {
  return semesterRepository.list(params)
}

export async function getSemester(id: string) {
  return semesterRepository.findById(id)
}

export async function getActiveSemester() {
  return semesterRepository.findActive()
}

export async function createSemester(input: CreateSemesterInput) {
  return semesterRepository.create(input)
}

export async function updateSemester(id: string, data: Parameters<typeof semesterRepository.update>[1]) {
  return semesterRepository.update(id, data)
}

export async function deleteSemester(id: string) {
  return semesterRepository.delete(id)
}

export async function activateSemester(id: string) {
  return semesterRepository.setActive(id)
}
