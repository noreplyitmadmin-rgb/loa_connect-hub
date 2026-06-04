import { rubricRepository } from "@/lib/repositories/factory"

export async function getRubric(periodId: string) {
  return rubricRepository.getCategoriesWithItems(periodId)
}

export async function replaceRubric(
  periodId: string,
  categories: Parameters<typeof rubricRepository.replaceRubric>[1]
) {
  return rubricRepository.replaceRubric(periodId, categories)
}

export async function copyRubricFromPeriod(periodId: string, sourcePeriodId: string) {
  return rubricRepository.copyFromSource(periodId, sourcePeriodId)
}

export async function deleteRubricCategory(id: string) {
  return rubricRepository.deleteCategory(id)
}

export async function deleteRubricItem(id: string) {
  return rubricRepository.deleteItem(id)
}
