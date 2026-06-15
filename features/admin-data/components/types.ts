export type MainTab = "semesters" | "departments" | "subjects" | "faculty_enroll"
export type InfraTab = "departments" | "courses"
export type SubjectTab = "subjects" | "sections"
export type FacEnrollTab = "faculty" | "enrollments"

export interface Subject {
  id: string; code: string; name: string; isDisabled: boolean
}

export interface Section {
  id: string; name: string; program: string; departmentCourseId: string; isDisabled: boolean
}

export interface FacultyMapping {
  id: string
  faculty: { id: string; name: string; email: string; departmentId: string | null }
  subject: { id: string; code: string; name: string }
  section: { id: string; name: string; program: string }
}

export interface Enrollment {
  id: string
  student: { id: string; name: string; email: string }
  section: { id: string; name: string; program: string }
  faculty_subject_id: string | null
  faculty_subject: FacultyMapping | null
}

export interface DepartmentCourse {
  id: string; departmentId: string; name: string; code: string; createdAt: string
  department: { name: string; code: string }
}
