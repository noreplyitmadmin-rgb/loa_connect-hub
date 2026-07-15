import { evaluationPeriodRepository, rubricGroupRepository } from "@/lib/repositories/factory"
import type { CreateEvaluationPeriodInput } from "@/lib/types"

export async function getEvaluationPeriods(params?: { semesterId?: string; isActive?: boolean }) {
  return evaluationPeriodRepository.list(params)
}

export async function getEvaluationPeriod(id: string) {
  return evaluationPeriodRepository.findById(id)
}

export async function getActiveEvaluationPeriod() {
  return evaluationPeriodRepository.findActive()
}

export async function getEvaluationPeriodsBySemester(semesterId: string) {
  return evaluationPeriodRepository.findBySemester(semesterId)
}

export async function createEvaluationPeriod(input: CreateEvaluationPeriodInput) {
  return evaluationPeriodRepository.create(input)
}

export async function updateEvaluationPeriod(id: string, data: Parameters<typeof evaluationPeriodRepository.update>[1]) {
  return evaluationPeriodRepository.update(id, data)
}

export async function deleteEvaluationPeriod(id: string) {
  return evaluationPeriodRepository.delete(id)
}

export async function activateEvaluationPeriod(id: string) {
  const period = await evaluationPeriodRepository.setActive(id)
  if (period.rubricGroupId) {
    await rubricGroupRepository.createSnapshot(id, period.rubricGroupId)
  }
  return period
}
