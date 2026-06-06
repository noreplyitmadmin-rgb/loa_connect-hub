import { evaluationRepository } from "@/lib/repositories/factory"

export async function getPendingEvaluations(evaluatorId: string, semesterId: string) {
  return evaluationRepository.findPending(evaluatorId, semesterId)
}

export async function getMyEvaluations(evaluatorId: string) {
  return evaluationRepository.findByEvaluator(evaluatorId)
}

export async function getEvaluation(id: string) {
  return evaluationRepository.findById(id)
}

export async function getOrCreateEvaluation(semesterId: string, evaluatorId: string, evaluateeId: string) {
  const existing = await evaluationRepository.findByComposite(semesterId, evaluatorId, evaluateeId)
  if (existing) return existing
  return evaluationRepository.create(semesterId, evaluatorId, evaluateeId)
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
