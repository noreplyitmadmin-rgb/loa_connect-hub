import { evaluationRepository, evaluationPeriodRepository } from "@/lib/repositories/factory"

export async function getPendingEvaluations(studentId: string) {
  const active = await evaluationPeriodRepository.findActive()
  if (!active) return []
  return evaluationRepository.findPending(studentId, active.id)
}

export async function getMyEvaluations(studentId: string) {
  return evaluationRepository.findByStudent(studentId)
}

export async function getEvaluation(id: string) {
  return evaluationRepository.findById(id)
}

export async function getOrCreateEvaluation(periodId: string, studentId: string, facultyId: string) {
  const existing = await evaluationRepository.findByComposite(periodId, studentId, facultyId)
  if (existing) return existing
  return evaluationRepository.create(periodId, studentId, facultyId)
}

export async function saveRatings(evaluationId: string, ratings: { itemId: string; rating: number }[]) {
  return evaluationRepository.setRatings(evaluationId, ratings)
}

export async function submitEvaluation(evaluationId: string) {
  return evaluationRepository.submit(evaluationId)
}

export async function getEvaluationRatings(evaluationId: string) {
  return evaluationRepository.getRatings(evaluationId)
}

export async function addEvaluationComment(evaluationId: string, comment: string) {
  return evaluationRepository.addComment(evaluationId, comment)
}
