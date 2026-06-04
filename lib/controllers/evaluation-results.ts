import { evaluationResultRepository } from "@/lib/repositories/factory"

export async function getEvaluationResults(periodId: string, filters?: { departmentId?: string; facultyId?: string }) {
  return evaluationResultRepository.list(periodId, filters)
}

export async function getFacultyEvaluationResult(periodId: string, facultyId: string) {
  return evaluationResultRepository.findByFaculty(periodId, facultyId)
}

export async function computeEvaluationResults(periodId: string, facultyId?: string) {
  return evaluationResultRepository.compute(periodId, facultyId)
}

export async function recomputeAllResults(periodId: string) {
  return evaluationResultRepository.computeAll(periodId)
}
